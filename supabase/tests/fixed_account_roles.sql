-- Run after 0019 and 0020. Every fixture and mutation is rolled back.
begin;
do $$
declare
  student_id uuid := gen_random_uuid();
  teacher_id uuid := gen_random_uuid();
  spoof_id uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (student_id,student_id::text||'@roles.example.invalid','{"name":"Student fixture","role":"student"}'),
    (teacher_id,teacher_id::text||'@roles.example.invalid','{"name":"Teacher fixture","role":"teacher"}'),
    (spoof_id,spoof_id::text||'@roles.example.invalid','{"name":"Admin spoof fixture","role":"admin"}');
  assert (select role='student' from public.profiles where id=student_id), 'Student role';
  assert (select role='teacher' from public.profiles where id=teacher_id), 'Teacher role';
  assert (select role='student' from public.profiles where id=spoof_id), 'Signup cannot grant admin';
  assert exists(select 1 from public.teacher_profiles where profile_id=teacher_id), 'Teacher profile is created with signup';
  assert exists(select 1 from public.teacher_applications where profile_id=teacher_id and status='review_pending'), 'Teacher review is initialized';
  assert not exists(select 1 from public.teacher_profiles where profile_id=student_id), 'Student has no teacher profile';
  begin
    update public.profiles set role='teacher' where id=student_id;
    raise exception 'Role change unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  update public.profiles set active_role='teacher' where id=student_id;
  assert (select active_role=role from public.profiles where id=student_id), 'Legacy active role cannot switch accounts';
  begin
    insert into public.teacher_profiles(profile_id) values(student_id);
    raise exception 'Student unexpectedly received teacher profile';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.chat_rooms(student_id,teacher_id) values(teacher_id,student_id);
    raise exception 'Reversed chat participants unexpectedly accepted';
  exception when insufficient_privilege then null; end;
  insert into public.chat_rooms(student_id,teacher_id) values(student_id,teacher_id);

  perform set_config('request.jwt.claim.sub','3429c1b9-9b35-45dd-87fb-64fccf769a9a',true);
  assert (public.admin_list('students',1,10,student_id::text)->>'total')::int=1, 'Student filter includes student';
  assert (public.admin_list('teachers',1,10,student_id::text)->>'total')::int=0, 'Teacher filter excludes student';
  assert (public.admin_list('teachers',1,10,teacher_id::text)->>'total')::int=1, 'Teacher filter includes teacher';
  assert (public.admin_list('students',1,10,teacher_id::text)->>'total')::int=0, 'Student filter excludes teacher';
end $$;
rollback;
select 'Fixed role, signup profile, review, chat and admin filter checks passed; fixtures rolled back' as result;
