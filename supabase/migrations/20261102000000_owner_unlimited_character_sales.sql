create or replace function private.dh_owner_sell_character_copies(
  p_character_id text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_is_owner boolean := false;
  v_character public.dh_characters%rowtype;
  v_reward integer;
  v_total bigint;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Please sign in first.';
  end if;

  select coalesce(p.is_owner, false) or p.staff_role = 'owner'
    into v_is_owner
  from public.profiles p
  where p.id = v_user;

  if not coalesce(v_is_owner, false) then
    raise exception 'Only the DougHub Owner can use unlimited character sales.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Choose at least one copy to sell.';
  end if;

  select * into v_character
  from public.dh_characters
  where id = p_character_id;

  if not found then
    raise exception 'That character does not exist.';
  end if;

  v_reward := case v_character.rarity
    when 'common' then 12
    when 'uncommon' then 18
    when 'rare' then 27
    when 'epic' then 39
    when 'legendary' then 54
    else 0
  end;

  if v_reward = 0 then
    raise exception 'This character cannot be sold.';
  end if;

  v_total := v_reward::bigint * p_quantity::bigint;

  insert into public.dh_wallets(user_id, credits)
  values (v_user, 0)
  on conflict (user_id) do nothing;

  select credits into v_balance
  from public.dh_wallets
  where user_id = v_user
  for update;

  if v_balance::bigint + v_total > 2147483647 then
    raise exception 'That sale would exceed the maximum wallet balance. Sell a smaller quantity.';
  end if;

  update public.dh_wallets
  set credits = credits + v_total::integer, updated_at = now()
  where user_id = v_user
  returning credits into v_balance;

  insert into public.dh_credit_transactions(user_id, amount, reason)
  values (
    v_user,
    v_total::integer,
    'Owner unlimited character sale (' || p_quantity || ' copies): ' || v_character.name
  );

  return jsonb_build_object(
    'sold', true,
    'owner_unlimited', true,
    'character_id', v_character.id,
    'character_name', v_character.name,
    'rarity', v_character.rarity,
    'quantity', p_quantity,
    'credits_each', v_reward,
    'credits_earned', v_total,
    'credits_remaining', v_balance,
    'collection_preserved', true
  );
end;
$$;

revoke all on function private.dh_owner_sell_character_copies(text, integer) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.dh_owner_sell_character_copies(text, integer) to authenticated;

create or replace function public.dh_owner_sell_character_copies(
  p_character_id text,
  p_quantity integer
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.dh_owner_sell_character_copies(p_character_id, p_quantity);
$$;

revoke all on function public.dh_owner_sell_character_copies(text, integer) from public, anon;
grant execute on function public.dh_owner_sell_character_copies(text, integer) to authenticated;
