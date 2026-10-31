-- Deletions are now final: remove the archive trigger from every public table.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, tg.tgname AS trigger_name
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT tg.tgisinternal AND n.nspname = 'public' AND tg.tgname = 'archive_deleted_row'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', t.trigger_name, t.schema_name, t.table_name);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS private.archive_deleted_row();
DROP TABLE IF EXISTS public.deleted_items CASCADE;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS feedback_type text NOT NULL DEFAULT 'feedback',
  ADD COLUMN IF NOT EXISTS game_request_title text,
  ADD COLUMN IF NOT EXISTS game_request_genre text,
  ADD COLUMN IF NOT EXISTS game_request_details text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_feedback_type_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback ADD CONSTRAINT feedback_feedback_type_check
      CHECK (feedback_type IN ('feedback', 'game_request'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS feedback_type_created_at_idx
  ON public.feedback (feedback_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_activity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id bigint NOT NULL UNIQUE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('review', 'high')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  reason text NOT NULL,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  page text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS admin_activity_flags_created_at_idx
  ON public.admin_activity_flags (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_flags_actor_id_idx
  ON public.admin_activity_flags (actor_id, created_at DESC);

ALTER TABLE public.admin_activity_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_activity_flags FROM anon, authenticated;
GRANT SELECT ON public.admin_activity_flags TO authenticated;
GRANT UPDATE (resolved_at, resolved_by) ON public.admin_activity_flags TO authenticated;

DROP POLICY IF EXISTS "Owners can review admin activity flags" ON public.admin_activity_flags;
CREATE POLICY "Owners can review admin activity flags"
  ON public.admin_activity_flags FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND (p.staff_role = 'owner' OR p.is_owner = true)
  ));

DROP POLICY IF EXISTS "Owners can resolve admin activity flags" ON public.admin_activity_flags;
CREATE POLICY "Owners can resolve admin activity flags"
  ON public.admin_activity_flags FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND (p.staff_role = 'owner' OR p.is_owner = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND (p.staff_role = 'owner' OR p.is_owner = true)
  ));

DROP POLICY IF EXISTS "Admins and owners can delete audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Only owner can delete audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only owner can delete audit logs"
  ON public.admin_audit_logs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND (p.staff_role = 'owner' OR p.is_owner = true)
  ));

CREATE OR REPLACE FUNCTION private.flag_suspicious_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_role text;
  recent_actions integer := 0;
  destructive_actions integer := 0;
  repeated_actions integer := 0;
  flag_score integer := 0;
  flag_severity text := 'review';
  flag_reason text := '';
BEGIN
  IF NEW.event_type <> 'admin_action' OR NEW.actor_id IS NULL THEN RETURN NEW; END IF;

  SELECT lower(coalesce(p.staff_role, 'none')) INTO actor_role
  FROM public.profiles p WHERE p.id = NEW.actor_id;

  IF actor_role NOT IN ('admin', 'developer', 'owner') THEN RETURN NEW; END IF;

  IF NEW.action ~* '(changed staff role|promoted .* to |demoted .* to |changed owner|changed security settings|cleared audit logs|changed permissions)' THEN
    flag_score := 72;
    flag_reason := 'High-impact staff or security setting changed; verify that the change was authorized.';
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE action ~* '(delete|permanent|remove|purge|clear|ban|suspend|demot|promot)')::integer,
    count(*) FILTER (WHERE action = NEW.action AND created_at >= now() - interval '60 seconds')::integer
  INTO recent_actions, destructive_actions, repeated_actions
  FROM public.admin_audit_logs
  WHERE actor_id = NEW.actor_id AND event_type = 'admin_action'
    AND created_at >= now() - interval '2 minutes';

  IF destructive_actions >= 8 THEN
    flag_score := greatest(flag_score, 92);
    flag_severity := 'high';
    flag_reason := 'Unusually high number of destructive moderation actions in a short period (' || destructive_actions || ' in 2 minutes).';
  ELSIF repeated_actions >= 12 THEN
    flag_score := greatest(flag_score, 86);
    flag_severity := 'high';
    flag_reason := 'The same admin action was repeated unusually often (' || repeated_actions || ' times in 60 seconds).';
  ELSIF recent_actions >= 40 THEN
    flag_score := greatest(flag_score, 82);
    flag_severity := 'high';
    flag_reason := 'Unusually high admin-action rate (' || recent_actions || ' actions in 2 minutes).';
  END IF;

  IF flag_score > 0 THEN
    INSERT INTO public.admin_activity_flags
      (audit_log_id, actor_id, severity, score, reason, action, category, page)
    VALUES
      (NEW.id, NEW.actor_id, flag_severity, flag_score, flag_reason,
       left(NEW.action, 500), left(coalesce(NEW.category, 'general'), 80), left(coalesce(NEW.page, ''), 300))
    ON CONFLICT (audit_log_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flag_suspicious_admin_activity ON public.admin_audit_logs;
CREATE TRIGGER flag_suspicious_admin_activity
  AFTER INSERT ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.flag_suspicious_admin_activity();
