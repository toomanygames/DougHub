-- Channel (chat group) limit: members can create at most 2 groups; Admin, Developer and Owner can create any number.
-- Enforced in the database, so it cannot be bypassed from the browser. Existing groups are untouched:
-- someone who already owns 2 or more simply cannot create another until they delete one.
create or replace function private.dh_limit_chat_groups()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owned integer;
begin
  if new.created_by is null then return new; end if;
  -- Admin+ (rank 2 and above) have no limit. Rank is looked up for the creator, not the caller.
  if private.dh_staff_rank(new.created_by) >= 2 then return new; end if;
  select count(*) into v_owned from public.chat_groups g where g.created_by = new.created_by;
  if v_owned >= 2 then
    raise exception 'You can only create 2 channels. Delete one of your channels to make a new one.';
  end if;
  return new;
end $$;
revoke all on function private.dh_limit_chat_groups() from public, anon, authenticated;

drop trigger if exists dh_limit_chat_groups on public.chat_groups;
create trigger dh_limit_chat_groups before insert on public.chat_groups
  for each row execute function private.dh_limit_chat_groups();

-- Lets the chat page show "1 of 2 channels used" without exposing anyone else's data.
create or replace function public.dh_my_channel_allowance()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'used', (select count(*) from public.chat_groups g where g.created_by = (select auth.uid())),
    'limit', case when private.dh_staff_rank() >= 2 then null else 2 end,
    'unlimited', private.dh_staff_rank() >= 2)
  where (select auth.uid()) is not null
$$;
revoke all on function public.dh_my_channel_allowance() from public, anon;
grant execute on function public.dh_my_channel_allowance() to authenticated;
