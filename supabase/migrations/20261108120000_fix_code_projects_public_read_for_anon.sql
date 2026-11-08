-- Signed-out visitors could not read public Community Projects: the shared SELECT policy
-- called private.doughub_is_admin(), which the anon role may not execute (permission denied).
-- Split it: anon only needs the public check; signed-in users keep the full rule.
drop policy if exists "Public code projects are viewable" on public.code_projects;

create policy "Public code projects are viewable"
  on public.code_projects for select to anon
  using (visibility = 'public');

create policy "Signed-in users view code projects"
  on public.code_projects for select to authenticated
  using (
    visibility = 'public'
    or owner_id = (select auth.uid())
    or (select private.doughub_is_admin())
  );
