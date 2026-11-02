-- Check UPDATE's FOUND state before resetting the transaction-local approval flag.
create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.dh_is_chat_approver() then
    raise exception 'Only Admin+ staff can change chat verification.';
  end if;

  perform set_config('app.dh_chat_approval', 'true', true);
  update public.profiles
  set chat_verified = coalesce(p_verified, false),
      chat_verified_at = case when coalesce(p_verified, false) then now() else null end,
      chat_verified_by = case when coalesce(p_verified, false) then (select auth.uid()) else null end
  where id = p_user_id;

  if not found then raise exception 'User profile not found.'; end if;
  perform set_config('app.dh_chat_approval', '', true);
  return true;
end;
$$;
revoke all on function public.dh_set_chat_verified(uuid, boolean) from public, anon;
grant execute on function public.dh_set_chat_verified(uuid, boolean) to authenticated;
