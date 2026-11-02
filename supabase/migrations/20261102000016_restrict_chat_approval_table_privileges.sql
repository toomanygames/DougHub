-- The approval table is read-only to authenticated users; changes go through
-- the Admin+-checked security-definer RPC.
revoke all on table public.chat_access_approvals from public, anon, authenticated;
grant select on table public.chat_access_approvals to authenticated;
