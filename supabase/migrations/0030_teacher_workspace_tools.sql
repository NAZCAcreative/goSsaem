begin;

create function public.teacher_workspace_authorized() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p join public.teacher_applications a on a.profile_id=p.id
    where p.id=auth.uid() and p.role='teacher' and a.status='approved');
$$;
revoke all on function public.teacher_workspace_authorized() from public;
grant execute on function public.teacher_workspace_authorized() to authenticated;

create function public.teacher_has_student(p_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.teacher_workspace_authorized() and exists(
    select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
    where s.teacher_id=auth.uid() and e.student_id=p_student and e.status in ('confirmed','completed','no_show'));
$$;
revoke all on function public.teacher_has_student(uuid) from public;
grant execute on function public.teacher_has_student(uuid) to authenticated;

create table public.teacher_tasks (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),
 due_date date,
 is_done boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default clock_timestamp()
);
create index teacher_tasks_owner_idx on public.teacher_tasks(teacher_id,is_done,due_date);
create trigger teacher_tasks_updated before update on public.teacher_tasks for each row execute function public.set_updated_at();
alter table public.teacher_tasks enable row level security;
revoke all on public.teacher_tasks from public,anon;
grant select,insert,update,delete on public.teacher_tasks to authenticated;
create policy teacher_tasks_own on public.teacher_tasks for all to authenticated
 using(teacher_id=(select auth.uid()) and (select public.teacher_workspace_authorized()))
 with check(teacher_id=(select auth.uid()) and (select public.teacher_workspace_authorized()));

create table public.teacher_student_notes (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 goals text not null default '' check(length(goals)<=2000),
 learning_notes text not null default '' check(length(learning_notes)<=5000),
 next_steps text not null default '' check(length(next_steps)<=2000),
 updated_at timestamptz not null default clock_timestamp(),
 unique(teacher_id,student_id)
);
create trigger teacher_notes_updated before update on public.teacher_student_notes for each row execute function public.set_updated_at();
alter table public.teacher_student_notes enable row level security;
revoke all on public.teacher_student_notes from public,anon;
grant select,insert,update,delete on public.teacher_student_notes to authenticated;
create policy teacher_notes_read on public.teacher_student_notes for select to authenticated
 using(teacher_id=(select auth.uid()) and (select public.teacher_workspace_authorized()));
create policy teacher_notes_insert on public.teacher_student_notes for insert to authenticated
 with check(teacher_id=(select auth.uid()) and public.teacher_has_student(student_id));
create policy teacher_notes_update on public.teacher_student_notes for update to authenticated
 using(teacher_id=(select auth.uid()) and (select public.teacher_workspace_authorized()))
 with check(teacher_id=(select auth.uid()) and public.teacher_has_student(student_id));
create policy teacher_notes_delete on public.teacher_student_notes for delete to authenticated
 using(teacher_id=(select auth.uid()) and (select public.teacher_workspace_authorized()));

create function public.my_teacher_students() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.teacher_workspace_authorized() then raise insufficient_privilege using message='Teacher approval required'; end if;
 return (select coalesce(jsonb_agg(t order by t.last_session desc),'[]'::jsonb) from (
 select p.id,p.name,p.avatar_url,p.korean_level,count(*) as lessons,
 max(s.scheduled_at) as last_session
 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id join public.profiles p on p.id=e.student_id
 where s.teacher_id=auth.uid() and e.status in ('confirmed','completed','no_show')
 group by p.id,p.name,p.avatar_url,p.korean_level) t);
end;
$$;

create function public.my_teacher_month_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare month_start timestamptz := date_trunc('month',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 month_end timestamptz := (date_trunc('month',now() at time zone 'Asia/Seoul')+interval '1 month') at time zone 'Asia/Seoul';
begin
 if not public.teacher_workspace_authorized() then raise insufficient_privilege using message='Teacher approval required'; end if;
 return jsonb_build_object(
 'completed',(select count(*) from public.lesson_sessions where teacher_id=auth.uid() and status='completed' and scheduled_at>=month_start and scheduled_at<month_end),
 'students',(select count(distinct e.student_id) from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_id=auth.uid() and s.status='completed' and e.status in ('confirmed','completed') and s.scheduled_at>=month_start and s.scheduled_at<month_end),
 'rating',(select round(avg(rating)::numeric,1) from public.reviews where teacher_id=auth.uid() and created_at>=month_start and created_at<month_end),
 'reviews',(select count(*) from public.reviews where teacher_id=auth.uid() and created_at>=month_start and created_at<month_end));
end;
$$;
revoke all on function public.my_teacher_students(),public.my_teacher_month_summary() from public;
grant execute on function public.my_teacher_students(),public.my_teacher_month_summary() to authenticated;
comment on table public.teacher_student_notes is 'Private teaching notes; never exposed to students or public teacher profiles.';
notify pgrst,'reload schema';
commit;
