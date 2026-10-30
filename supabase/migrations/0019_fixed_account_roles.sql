begin;

-- Refuse to silently relabel or split existing accounts and their booking history.
do $$ begin
  if exists(select 1 from public.teacher_profiles t join public.profiles p on p.id=t.profile_id where p.role<>'teacher')
    or exists(select 1 from public.enrollments e join public.profiles p on p.id=e.student_id where p.role<>'student')
    or exists(select 1 from public.lesson_sessions s join public.profiles p on p.id=s.teacher_id where p.role<>'teacher') then
    raise exception 'Resolve mixed account roles before applying fixed account roles';
  end if;
end $$;

-- Public signup accepts only student and teacher; admin is never user metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  signup_role public.user_role;
begin
  signup_role := case when new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.user_role else 'student'::public.user_role end;
  insert into public.profiles(id, name, native_language, korean_level, role, active_role)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'name', 'New User'),
    new.raw_user_meta_data ->> 'native_language',
    coalesce((new.raw_user_meta_data ->> 'korean_level')::public.korean_level, 'beginner'),
    signup_role, signup_role);
  if signup_role='teacher' then
    insert into public.teacher_profiles(profile_id) values(new.id);
  end if;
  return new;
end;
$$;

update public.profiles set active_role = role where active_role is distinct from role;

create function public.guard_account_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Account role cannot be changed' using errcode = '42501';
  end if;
  new.active_role := new.role;
  return new;
end;
$$;
create trigger profiles_fixed_role before update on public.profiles
for each row execute function public.guard_account_role();

-- Also protect writes made through security-definer lesson/booking functions.
create function public.guard_participant_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'teacher_profiles' then
    if not exists(select 1 from public.profiles where id = new.profile_id and role = 'teacher') then
      raise exception 'Teacher account required' using errcode = '42501';
    end if;
  elsif tg_table_name = 'teacher_lessons' then
    if not exists(select 1 from public.profiles where id = new.teacher_id and role = 'teacher') then
      raise exception 'Teacher account required' using errcode = '42501';
    end if;
  else
    if not exists(select 1 from public.profiles where id = new.student_id and role = 'student') then
      raise exception 'Student account required' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger teacher_profiles_account_role before insert or update of profile_id on public.teacher_profiles
for each row execute function public.guard_participant_roles();
create trigger lessons_account_role before insert or update of teacher_id on public.teacher_lessons
for each row execute function public.guard_participant_roles();
create trigger enrollments_account_role before insert or update of student_id on public.enrollments
for each row execute function public.guard_participant_roles();

-- Session and chat inserts may bypass the product/booking RPCs through REST.
create function public.guard_related_account_role() returns trigger
language plpgsql security definer set search_path = '' as $$
declare participant_id uuid;
begin
  participant_id := (to_jsonb(new) ->> tg_argv[0])::uuid;
  if not exists(select 1 from public.profiles where id=participant_id and role::text=tg_argv[1]) then
    raise exception 'Account role does not match participant role' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger sessions_account_role before insert or update of teacher_id on public.lesson_sessions
for each row execute function public.guard_related_account_role('teacher_id','teacher');
create trigger chat_teacher_account_role before insert or update of teacher_id on public.chat_rooms
for each row execute function public.guard_related_account_role('teacher_id','teacher');
create trigger chat_student_account_role before insert or update of student_id on public.chat_rooms
for each row execute function public.guard_related_account_role('student_id','student');
create trigger availability_account_role before insert or update of teacher_id on public.teacher_availability
for each row execute function public.guard_related_account_role('teacher_id','teacher');

revoke all on function public.guard_account_role(), public.guard_participant_roles(), public.guard_related_account_role()
from public, anon, authenticated;

comment on column public.profiles.active_role is 'Deprecated compatibility field; synchronized to immutable role. Do not use for authorization.';
notify pgrst, 'reload schema';

commit;
