-- Run after migration 0021. All account fixtures are rolled back.
begin;
do $$
declare teacher_id uuid:=gen_random_uuid(); student_id uuid:=gen_random_uuid(); google_student uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
    (teacher_id,teacher_id::text||'@roles.example.invalid','{"provider":"google"}','{"name":"New Google teacher"}'),
    (google_student,google_student::text||'@roles.example.invalid','{"provider":"google"}','{"name":"New Google student"}'),
    (student_id,student_id::text||'@roles.example.invalid','{"provider":"email"}','{"name":"Existing student","role":"student"}');
  assert (select oauth_role_pending from public.profiles where id=teacher_id), 'Only new Google signup awaits role completion';
  assert (select not oauth_role_pending from public.profiles where id=student_id), 'Email signup is already finalized';
  perform set_config('vora.test.google_teacher',teacher_id::text,true);
  perform set_config('vora.test.student',student_id::text,true);
  perform set_config('vora.test.google_student',google_student::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('vora.test.google_teacher'),true);
do $$ begin
  begin
    update public.profiles set role='teacher',oauth_role_pending=false where id=auth.uid();
    raise exception 'Direct role finalization unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  assert public.complete_oauth_registration('teacher')->>'role'='teacher', 'New Google teacher role';
  assert (select not oauth_role_pending and role='teacher' from public.profiles where id=auth.uid()), 'Teacher role is finalized';
  assert exists(select 1 from public.teacher_profiles where profile_id=auth.uid()), 'Teacher details initialized';
  assert public.complete_oauth_registration('student')->>'role'='teacher', 'Finalized teacher cannot switch';
  begin
    perform public.complete_oauth_registration('admin');
    raise exception 'Admin signup unexpectedly accepted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('vora.test.student'),true);
do $$ begin
  assert public.complete_oauth_registration('teacher')->>'role'='student', 'Existing student stays student';
  assert not exists(select 1 from public.teacher_profiles where profile_id=auth.uid()), 'Existing student never receives teacher profile';
end $$;

select set_config('request.jwt.claim.sub',current_setting('vora.test.google_student'),true);
do $$ begin
  assert public.complete_oauth_registration('student')->>'role'='student', 'New Google student role';
  assert public.complete_oauth_registration('teacher')->>'role'='student', 'Finalized Google student cannot switch';
end $$;
rollback;
select 'Google signup finalization, direct mutation denial, immutable existing roles and invalid roles verified; all fixtures rolled back' as result;
