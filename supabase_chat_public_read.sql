-- DougHub Community Chat
-- Allow visitors (signed out or signed in) to READ existing public chat messages.
-- This does not allow guests to send messages.

create policy "Anyone can read community chat"
on public.chat_messages
for select
to anon, authenticated
using (true);
