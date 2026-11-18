begin;
create table public.teacher_share_links(
 teacher_id uuid primary key references public.teacher_profiles(profile_id) on delete cascade,
 token uuid unique not null default gen_random_uuid()
);
create table public.teacher_profile_activity(
 teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 day date not null default ((now() at time zone 'Asia/Seoul')::date),
 first_visit timestamptz not null default now(), shared boolean not null, clicked boolean not null default false,
 primary key(teacher_id,student_id,day)
);
alter table public.teacher_share_links enable row level security;
alter table public.teacher_profile_activity enable row level security;
revoke all on public.teacher_share_links, public.teacher_profile_activity from public,anon,authenticated;
create function public.my_teacher_share_token() returns uuid language plpgsql security definer set search_path='' as $$
declare token_id uuid;
begin
 if not exists(select 1 from public.teacher_profiles where profile_id=auth.uid()) then raise insufficient_privilege; end if;
 insert into public.teacher_share_links(teacher_id) values(auth.uid()) on conflict do nothing;
 select token into strict token_id from public.teacher_share_links where teacher_id=auth.uid();return token_id;
end $$;
create function public.record_profile_activity(p_teacher uuid,p_token uuid default null,p_lesson uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='student') or not public.portfolio_teacher_approved(p_teacher) then return; end if;
 if p_lesson is not null and not exists(select 1 from public.teacher_lessons where id=p_lesson and teacher_id=p_teacher and is_published) then return; end if;
 insert into public.teacher_profile_activity(teacher_id,student_id,shared,clicked) values(p_teacher,auth.uid(),exists(select 1 from public.teacher_share_links where teacher_id=p_teacher and token=p_token),p_lesson is not null)
 on conflict(teacher_id,student_id,day) do update set clicked=teacher_profile_activity.clicked or excluded.clicked;
end $$;
create function public.my_profile_activity() returns jsonb language sql stable security definer set search_path='' as $$
with visits as (select student_id,min(first_visit) as first_visit,bool_or(shared) shared,bool_or(clicked) clicked from public.teacher_profile_activity where teacher_id=auth.uid() and day>=(now() at time zone 'Asia/Seoul')::date-29 group by student_id),
counts as (select count(*) visitors,count(*) filter(where shared) shared,count(*) filter(where clicked) clicked,count(*) filter(where exists(select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.student_id=v.student_id and s.teacher_id=auth.uid() and e.created_at>=v.first_visit and e.status in ('confirmed','completed'))) booked from visits v)
select to_jsonb(counts) from counts
$$;
revoke all on function public.my_teacher_share_token(),public.record_profile_activity(uuid,uuid,uuid),public.my_profile_activity() from public,anon;
grant execute on function public.my_teacher_share_token(),public.record_profile_activity(uuid,uuid,uuid),public.my_profile_activity() to authenticated;
notify pgrst,'reload schema';
commit;