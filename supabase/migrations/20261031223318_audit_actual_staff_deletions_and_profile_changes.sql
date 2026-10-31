-- Capture completed staff deletions at the database layer, not just button clicks.
CREATE OR REPLACE FUNCTION private.audit_staff_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor uuid;
  actor_role text;
  category_name text;
  record_id text;
BEGIN
  actor := auth.uid();
  IF actor IS NULL THEN RETURN OLD; END IF;
  SELECT lower(coalesce(p.staff_role, 'none')) INTO actor_role
  FROM public.profiles p WHERE p.id = actor;
  IF actor_role NOT IN ('admin', 'developer', 'owner') THEN RETURN OLD; END IF;

  category_name := CASE
    WHEN TG_TABLE_NAME IN ('chat_messages','chat_groups','chat_group_members') THEN 'chat'
    WHEN TG_TABLE_NAME LIKE 'dougforum_%' OR TG_TABLE_NAME = 'community_games' THEN 'community'
    WHEN TG_TABLE_NAME LIKE 'dougtube_%' THEN 'videos'
    WHEN TG_TABLE_NAME LIKE 'douqhub_music_%' THEN 'music'
    WHEN TG_TABLE_NAME = 'feedback' THEN 'feedback'
    WHEN TG_TABLE_NAME = 'profiles' THEN 'users'
    WHEN TG_TABLE_NAME IN ('user_warnings','staff_ban_requests') THEN 'moderation'
    ELSE 'content'
  END;
  record_id := coalesce(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'user_id', to_jsonb(OLD)->>'message_id', 'unknown');

  INSERT INTO public.admin_audit_logs(actor_id,event_type,category,action,page,details)
  VALUES (actor,'admin_action',category_name,'Deleted record from public.' || TG_TABLE_NAME,null,
    jsonb_build_object('table',TG_TABLE_NAME,'recordId',left(record_id,120),'source','database_delete_trigger'));
  RETURN OLD;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'account_recovery_requests','chat_group_members','chat_groups','chat_messages',
    'code_projects','community_games','custom_badges','direct_messages',
    'dougforum_comments','dougforum_communities','dougforum_posts','dougforum_votes',
    'dougtube_comments','dougtube_likes','dougtube_media','dougtube_media_comments',
    'dougtube_media_likes','dougtube_videos','douqhub_music_albums','douqhub_music_tracks',
    'feedback','profiles','seasonal_game_scores','seasonal_game_settings',
    'site_announcements','site_feature_flags','site_page_schedules',
    'staff_ban_requests','studio_projects','user_warnings'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_staff_delete ON public.%I', table_name);
      EXECUTE format('CREATE TRIGGER audit_staff_delete AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_staff_deletions()', table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.audit_staff_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor uuid;
  actor_role text;
  changed_fields text[] := ARRAY[]::text[];
  event_action text;
BEGIN
  actor := auth.uid();
  IF actor IS NULL OR actor = NEW.id THEN RETURN NEW; END IF;
  SELECT lower(coalesce(p.staff_role, 'none')) INTO actor_role
  FROM public.profiles p WHERE p.id = actor;
  IF actor_role NOT IN ('admin', 'developer', 'owner') THEN RETURN NEW; END IF;

  IF OLD.staff_role IS DISTINCT FROM NEW.staff_role
     OR OLD.is_admin IS DISTINCT FROM NEW.is_admin
     OR OLD.is_helper IS DISTINCT FROM NEW.is_helper
     OR OLD.is_developer IS DISTINCT FROM NEW.is_developer
     OR OLD.is_owner IS DISTINCT FROM NEW.is_owner THEN
    changed_fields := array_append(changed_fields, 'staff_role_or_privileges');
  END IF;
  IF OLD.is_banned IS DISTINCT FROM NEW.is_banned
     OR OLD.ban_type IS DISTINCT FROM NEW.ban_type
     OR OLD.suspended_until IS DISTINCT FROM NEW.suspended_until THEN
    changed_fields := array_append(changed_fields, 'ban_or_suspension');
  END IF;
  IF cardinality(changed_fields) = 0 THEN RETURN NEW; END IF;

  event_action := CASE
    WHEN 'staff_role_or_privileges' = ANY(changed_fields) THEN 'Changed staff role or privileges for a profile'
    ELSE 'Changed ban or suspension status for a profile'
  END;
  INSERT INTO public.admin_audit_logs(actor_id,event_type,category,action,page,details)
  VALUES (actor,'admin_action','users',event_action,null,
    jsonb_build_object('targetUserId',NEW.id,'changedFields',changed_fields,'source','database_profile_trigger'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_staff_profile_changes ON public.profiles;
CREATE TRIGGER audit_staff_profile_changes
  AFTER UPDATE OF staff_role,is_admin,is_helper,is_developer,is_owner,is_banned,ban_type,suspended_until
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.audit_staff_profile_changes();
