-- Honk Empire leaderboard: one public row per player, written only through a validated RPC.
create table if not exists public.honk_empire_scores (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null,
 avatar_url text,
 lifetime_honks double precision not null default 0,
 rebirths integer not null default 0,
 worlds_unlocked smallint not null default 1,
 pets_found integer not null default 0,
 updated_at timestamptz not null default now()
);
create index if not exists honk_empire_lifetime_idx on public.honk_empire_scores(lifetime_honks desc);
create index if not exists honk_empire_rebirths_idx on public.honk_empire_scores(rebirths desc,lifetime_honks desc);
alter table public.honk_empire_scores enable row level security;
drop policy if exists "Honk Empire leaderboard is public" on public.honk_empire_scores;
create policy "Honk Empire leaderboard is public" on public.honk_empire_scores for select to anon,authenticated using(true);
grant select on public.honk_empire_scores to anon,authenticated;
revoke insert,update,delete on public.honk_empire_scores from anon,authenticated;

create or replace function private.honk_empire_submit(p_lifetime double precision,p_rebirths integer,p_worlds integer,p_pets integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_last timestamptz;v_username text;v_avatar text;v_banned boolean;
begin
 if v_user is null then raise exception 'Please sign in to join the leaderboard.';end if;
 if p_lifetime is null or p_lifetime='NaN'::float8 or p_lifetime<0 or p_lifetime>1e300 then raise exception 'Invalid score.';end if;
 if p_rebirths is null or p_rebirths<0 or p_rebirths>100000 then raise exception 'Invalid rebirth count.';end if;
 if p_worlds is null or p_worlds<1 or p_worlds>5 then raise exception 'Invalid world count.';end if;
 if p_pets is null or p_pets<0 or p_pets>1000000 then raise exception 'Invalid pet count.';end if;
 select username,avatar_url,coalesce(is_banned,false) into v_username,v_avatar,v_banned from public.profiles where id=v_user;
 if v_banned then raise exception 'This account cannot submit scores.';end if;
 select updated_at into v_last from public.honk_empire_scores where user_id=v_user;
 if v_last is not null and v_last>now()-interval '10 seconds' then
  return jsonb_build_object('recorded',false,'message','Slow down, goose. Try again in a few seconds.');
 end if;
 insert into public.honk_empire_scores(user_id,username,avatar_url,lifetime_honks,rebirths,worlds_unlocked,pets_found,updated_at)
 values(v_user,coalesce(nullif(btrim(v_username),''),'Player'),v_avatar,p_lifetime,p_rebirths,p_worlds,p_pets,now())
 on conflict(user_id) do update set username=excluded.username,avatar_url=excluded.avatar_url,
  lifetime_honks=greatest(public.honk_empire_scores.lifetime_honks,excluded.lifetime_honks),
  rebirths=greatest(public.honk_empire_scores.rebirths,excluded.rebirths),
  worlds_unlocked=greatest(public.honk_empire_scores.worlds_unlocked,excluded.worlds_unlocked),
  pets_found=greatest(public.honk_empire_scores.pets_found,excluded.pets_found),
  updated_at=now();
 return jsonb_build_object('recorded',true);
end $$;
revoke all on function private.honk_empire_submit(double precision,integer,integer,integer) from public;
grant execute on function private.honk_empire_submit(double precision,integer,integer,integer) to authenticated;

create or replace function public.honk_empire_submit(p_lifetime double precision,p_rebirths integer,p_worlds integer,p_pets integer)
returns jsonb language sql security invoker set search_path='' as $$ select private.honk_empire_submit(p_lifetime,p_rebirths,p_worlds,p_pets) $$;
revoke all on function public.honk_empire_submit(double precision,integer,integer,integer) from public,anon;
grant execute on function public.honk_empire_submit(double precision,integer,integer,integer) to authenticated;
