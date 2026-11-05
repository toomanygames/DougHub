-- Make the database enforce the same rank limits the admin panel shows, so a rank can only read or change
-- what its permission allows, even outside the panel.
--   Feedback inbox ........... Developer and above
--   Site features ............ Developer and above (anyone can still read the flags the pages need)
--   Announcement + page and schedule controls ... Owner only to change (everyone can read what the pages need)
--   Chat retention ........... Admin and above
-- Ranks come from private.dh_staff_rank(): Helper 1, Admin 2, Developer 3, Owner 4.

-- Feedback inbox
drop policy if exists "Developer+ staff can view feedback" on public.feedback;
drop policy if exists "Developer+ staff can close feedback" on public.feedback;
drop policy if exists "Admins can reply to feedback" on public.feedback;
create policy "Developer+ staff can view feedback" on public.feedback for select to authenticated
  using (private.dh_staff_rank() >= 3);
create policy "Developer+ staff can reply to feedback" on public.feedback for update to authenticated
  using (private.dh_staff_rank() >= 3) with check (private.dh_staff_rank() >= 3);
create policy "Developer+ staff can close feedback" on public.feedback for delete to authenticated
  using (private.dh_staff_rank() >= 3);

-- Site feature switches
drop policy if exists "Only admins can insert feature flags" on public.site_feature_flags;
drop policy if exists "Only admins can update feature flags" on public.site_feature_flags;
drop policy if exists "Only admins can delete feature flags" on public.site_feature_flags;
create policy "Developer+ can insert feature flags" on public.site_feature_flags for insert to authenticated
  with check (private.dh_staff_rank() >= 3);
create policy "Developer+ can update feature flags" on public.site_feature_flags for update to authenticated
  using (private.dh_staff_rank() >= 3) with check (private.dh_staff_rank() >= 3);
create policy "Developer+ can delete feature flags" on public.site_feature_flags for delete to authenticated
  using (private.dh_staff_rank() >= 3);

-- Site announcement (public read stays) and page / schedule controls (public read stays)
drop policy if exists "Admins manage site announcement" on public.site_announcements;
create policy "Owner manages site announcement" on public.site_announcements for all to authenticated
  using (private.dh_staff_rank() >= 4) with check (private.dh_staff_rank() >= 4);
drop policy if exists "Admins manage page schedules" on public.site_page_schedules;
create policy "Owner manages page schedules" on public.site_page_schedules for all to authenticated
  using (private.dh_staff_rank() >= 4) with check (private.dh_staff_rank() >= 4);

-- Chat retention: Admin and above, whatever role flag they hold
drop policy if exists "Admins can insert chat retention settings" on public.chat_retention_settings;
drop policy if exists "Admins can read chat retention settings" on public.chat_retention_settings;
drop policy if exists "Admins can update chat retention settings" on public.chat_retention_settings;
create policy "Admin+ can read chat retention settings" on public.chat_retention_settings for select to authenticated
  using (private.dh_staff_rank() >= 2);
create policy "Admin+ can insert chat retention settings" on public.chat_retention_settings for insert to authenticated
  with check (private.dh_staff_rank() >= 2);
create policy "Admin+ can update chat retention settings" on public.chat_retention_settings for update to authenticated
  using (private.dh_staff_rank() >= 2) with check (private.dh_staff_rank() >= 2);
