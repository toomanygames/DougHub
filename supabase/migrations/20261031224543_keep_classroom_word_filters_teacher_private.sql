drop policy if exists "class word filters visible to participants" on public.classroom_word_filters;
create policy "only classroom teachers can read word filters" on public.classroom_word_filters
for select to authenticated using (private.is_classroom_teacher(classroom_id));
