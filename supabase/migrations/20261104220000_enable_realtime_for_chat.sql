-- Chat, group membership and direct messages already subscribe to Supabase Realtime in the site code,
-- but none of these tables were in the supabase_realtime publication. Messages and pings therefore only
-- arrived through the slower polling fallback (5 to 15 seconds). Row Level Security still applies to every
-- Realtime event, so members only receive rows they are allowed to read.
do $$
declare t text;
begin
  foreach t in array array['chat_messages', 'chat_group_members', 'direct_messages'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- The chat page filters group-membership DELETE events by user_id; that needs the full old row.
alter table public.chat_group_members replica identity full;
