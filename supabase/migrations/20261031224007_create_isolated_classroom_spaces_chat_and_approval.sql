create schema if not exists private;
grant usage on schema private to authenticated;

create table public.classroom_spaces (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.profiles(id) on delete restrict,
 grade smallint not null check (grade between 4 and 8),
 class_name text not null check (length(trim(class_name)) between 2 and 80),
 reminder text not null default '' check (length(reminder) <= 500),
 session_active boolean not null default true,
 session_ended_at timestamptz,
 session_resume_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index classroom_spaces_teacher_idx on public.classroom_spaces(teacher_id);
create index classroom_spaces_grade_idx on public.classroom_spaces(grade);

create table public.classroom_enrollments (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classroom_spaces(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 requested_by uuid not null references public.profiles(id) on delete restrict,
 verified_by uuid references public.profiles(id) on delete set null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(classroom_id,student_id)
);
create index classroom_enrollments_student_idx on public.classroom_enrollments(student_id,status);
create index classroom_enrollments_class_idx on public.classroom_enrollments(classroom_id,status);

create table public.classroom_chat_messages (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classroom_spaces(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete restrict,
 body text not null check (length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index classroom_chat_messages_class_time_idx on public.classroom_chat_messages(classroom_id,created_at desc);

create table public.classroom_word_filters (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classroom_spaces(id) on delete cascade,
 word text not null check (length(trim(word)) between 1 and 60),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(classroom_id,word)
);
create index classroom_word_filters_class_idx on public.classroom_word_filters(classroom_id);

create or replace function private.is_classroom_owner()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and (p.is_owner is true or lower(coalesce(p.staff_role,''))='owner')); $$;

create or replace function private.is_verified_classroom_teacher()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_type='teacher' and p.teacher_verified is true); $$;

create or replace function private.is_classroom_teacher(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.classroom_spaces c join public.profiles p on p.id=c.teacher_id where c.id=p_classroom_id and c.teacher_id=(select auth.uid()) and p.account_type='teacher' and p.teacher_verified is true); $$;

create or replace function private.is_classroom_member(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.classroom_enrollments e where e.classroom_id=p_classroom_id and e.student_id=(select auth.uid()) and e.status='approved'); $$;

grant execute on function private.is_classroom_owner() to authenticated;
grant execute on function private.is_verified_classroom_teacher() to authenticated;
grant execute on function private.is_classroom_teacher(uuid) to authenticated;
grant execute on function private.is_classroom_member(uuid) to authenticated;

alter table public.classroom_spaces enable row level security;
alter table public.classroom_enrollments enable row level security;
alter table public.classroom_chat_messages enable row level security;
alter table public.classroom_word_filters enable row level security;

grant select,insert,update on public.classroom_spaces to authenticated;
grant select,insert,update on public.classroom_enrollments to authenticated;
grant select,insert on public.classroom_chat_messages to authenticated;
grant select,insert,update,delete on public.classroom_word_filters to authenticated;

create policy "classroom spaces visible to participants and owner" on public.classroom_spaces
for select to authenticated using (teacher_id=(select auth.uid()) or private.is_classroom_member(id) or private.is_classroom_owner());
create policy "verified teachers create classroom spaces" on public.classroom_spaces
for insert to authenticated with check (teacher_id=(select auth.uid()) and private.is_verified_classroom_teacher());
create policy "teachers update own classroom spaces" on public.classroom_spaces
for update to authenticated using (teacher_id=(select auth.uid()) and private.is_classroom_teacher(id))
with check (teacher_id=(select auth.uid()) and private.is_classroom_teacher(id));
create policy "owners manage classroom spaces" on public.classroom_spaces
for all to authenticated using (private.is_classroom_owner()) with check (private.is_classroom_owner());

create policy "enrollment requests visible to student teacher and owner" on public.classroom_enrollments
for select to authenticated using (student_id=(select auth.uid()) or private.is_classroom_teacher(classroom_id) or private.is_classroom_owner());
create policy "teachers request enrollment" on public.classroom_enrollments
for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and verified_by is null and verified_at is null and private.is_classroom_teacher(classroom_id));
create policy "owners verify enrollment" on public.classroom_enrollments
for update to authenticated using (private.is_classroom_owner()) with check (private.is_classroom_owner());

create policy "class chat visible to approved participants" on public.classroom_chat_messages
for select to authenticated using (private.is_classroom_teacher(classroom_id) or private.is_classroom_member(classroom_id));
create policy "active class participants can chat" on public.classroom_chat_messages
for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.classroom_spaces c where c.id=classroom_id and c.session_active=true and (private.is_classroom_teacher(c.id) or private.is_classroom_member(c.id)))
);

create policy "class word filters visible to participants" on public.classroom_word_filters
for select to authenticated using (private.is_classroom_teacher(classroom_id) or private.is_classroom_member(classroom_id));
create policy "teachers manage class word filters" on public.classroom_word_filters
for all to authenticated using (private.is_classroom_teacher(classroom_id))
with check (created_by=(select auth.uid()) and private.is_classroom_teacher(classroom_id));

create or replace function private.block_classroom_banned_words()
returns trigger language plpgsql security definer set search_path=''
as $$
declare candidate record; normalized_body text; normalized_word text;
begin
 normalized_body:=regexp_replace(translate(lower(coalesce(new.body,'')),'@4301!$578','aaeoiisstb'),'[^a-z0-9]','','g');
 normalized_body:=regexp_replace(normalized_body,'(.)\1+','\1','g');
 for candidate in select word from public.classroom_word_filters where classroom_id=new.classroom_id loop
  normalized_word:=regexp_replace(translate(lower(candidate.word),'@4301!$578','aaeoiisstb'),'[^a-z0-9]','','g');
  normalized_word:=regexp_replace(normalized_word,'(.)\1+','\1','g');
  if length(normalized_word)>=2 and position(normalized_word in normalized_body)>0 then
   raise exception 'That message contains a word blocked by this classroom.';
  end if;
 end loop;
 return new;
end;
$$;
create trigger classroom_chat_word_guard before insert on public.classroom_chat_messages
for each row execute function private.block_classroom_banned_words();

create or replace function public.resume_due_classroom(p_classroom_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare resumed_count integer;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.classroom_enrollments e where e.classroom_id=p_classroom_id and e.student_id=(select auth.uid()) and e.status='approved') then return false; end if;
 update public.classroom_spaces set session_active=true,session_resume_at=null,updated_at=now()
 where id=p_classroom_id and session_active=false and session_resume_at is not null and session_resume_at<=now();
 get diagnostics resumed_count=row_count;
 return resumed_count>0;
end;
$$;
revoke all on function public.resume_due_classroom(uuid) from public,anon;
grant execute on function public.resume_due_classroom(uuid) to authenticated;
