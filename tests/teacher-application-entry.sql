begin;
select set_config('test.teacher_entry',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('test.teacher_entry')::uuid,current_setting('test.teacher_entry')||'@example.test','{"role":"teacher","name":"Application fixture"}');
insert into public.profiles(id,name,role,active_role) values(current_setting('test.teacher_entry')::uuid,'Application fixture','teacher','teacher') on conflict(id) do nothing;
insert into public.teacher_profiles(profile_id) values(current_setting('test.teacher_entry')::uuid) on conflict do nothing;
select set_config('request.jwt.claim.sub',current_setting('test.teacher_entry'),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare application jsonb; begin
  application := public.my_teacher_application();
  if application->>'status' <> 'not_applied' then raise exception 'Signup submitted automatically'; end if;
  begin
    perform public.submit_teacher_application((application->>'updated_at')::timestamptz);
    raise exception 'Incomplete application accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.teacher_profiles set headline='Teaching introduction',bio='Teaching experience',specialties=array['Conversation'] where profile_id=current_setting('test.teacher_entry')::uuid;
set local role authenticated;
do $$ declare application jsonb; submitted jsonb; begin
  application := public.my_teacher_application();
  submitted := public.submit_teacher_application((application->>'updated_at')::timestamptz);
  if submitted->>'status' <> 'review_pending' then raise exception 'Application not submitted'; end if;
  begin
    perform public.submit_teacher_application((application->>'updated_at')::timestamptz);
    raise exception 'Stale application accepted';
  exception when serialization_failure then null; end;
end $$;
reset role;
update public.teacher_applications set status='approved' where profile_id=current_setting('test.teacher_entry')::uuid;
set local role authenticated;
do $$ begin
  if public.my_teacher_application()->>'status' <> 'approved' then raise exception 'Approval not visible'; end if;
end $$;
rollback;
