-- Lets the navigation bar ask the server whether the signed-in member can use chat, instead of trusting the copy of
-- the account saved in the browser (which can be out of date and used to hide Chat from approved people).
create or replace function public.dh_my_chat_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.dh_can_use_chat(), false)
$$;
revoke all on function public.dh_my_chat_access() from public, anon;
grant execute on function public.dh_my_chat_access() to authenticated;
