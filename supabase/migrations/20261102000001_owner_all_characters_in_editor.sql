create or replace function private.dh_save_character_finish(
  p_character_id text,
  p_cosmetic_ids text[],
  p_finish text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ids text[] := coalesce(p_cosmetic_ids, '{}'::text[]);
  v_is_owner boolean := false;
begin
  if v_user is null then
    raise exception 'Please sign in to save your character.';
  end if;
  if p_finish not in ('normal', 'gold', 'rainbow') then
    raise exception 'Choose a valid character finish.';
  end if;

  select coalesce(p.is_owner, false) or p.staff_role = 'owner'
    into v_is_owner
  from public.profiles p
  where p.id = v_user;

  if not coalesce(v_is_owner, false)
     and not exists (
       select 1 from public.dh_character_inventory
       where user_id = v_user
         and character_id = p_character_id
         and finish = p_finish
     ) then
    raise exception 'You need to own this character in that finish first.';
  end if;

  if not exists (select 1 from public.dh_characters where id = p_character_id) then
    raise exception 'That character does not exist.';
  end if;

  if exists (
    select 1 from unnest(v_ids) as x(id)
    where not exists (
      select 1 from public.dh_cosmetic_inventory i
      where i.user_id = v_user and i.cosmetic_id = x.id
    )
  ) then
    raise exception 'You can only equip accessories in your collection.';
  end if;

  if exists (
    select 1 from unnest(v_ids) as x(id)
    join public.dh_cosmetics c on c.id = x.id
    group by c.category having count(*) > 1
  ) then
    raise exception 'Choose only one accessory per category.';
  end if;

  insert into public.dh_character_loadouts(user_id, character_id, cosmetic_ids, finish, updated_at)
  values (v_user, p_character_id, v_ids, p_finish, now())
  on conflict (user_id) do update
  set character_id = excluded.character_id,
      cosmetic_ids = excluded.cosmetic_ids,
      finish = excluded.finish,
      updated_at = now();

  return jsonb_build_object(
    'saved', true,
    'character_id', p_character_id,
    'finish', p_finish,
    'cosmetic_ids', v_ids
  );
end;
$$;