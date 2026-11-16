begin;
select set_config('test.teacher',gen_random_uuid()::text,true),set_config('test.student',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.teacher')::uuid,current_setting('test.teacher')||'@example.test','{"role":"teacher","name":"Application fixture"}'),
 (current_setting('test.student')::uuid,current_setting('test.student')||'@example.test','{"role":"student","name":"Student fixture"}');
-- Simulate the reported account with a missing teacher profile and application.
delete from public.teacher_profiles where profile_id=current_setting('test.teacher')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.teacher'),true);
do $$ declare draft jsonb; submitted jsonb; begin
 draft:=public.ensure_my_teacher_application();
 if draft->>'status'<>'not_applied' then raise exception 'Missing account not recovered as draft'; end if;
 if public.ensure_my_teacher_application()<>draft then raise exception 'Recovery changed existing draft'; end if;
 begin
   perform public.submit_teacher_application((draft->>'updated_at')::timestamptz);
   raise exception 'Empty introduction accepted';
 exception when sqlstate '22023' then null; end;
 update public.teacher_profiles set headline='Music and Korean',bio='Learn Korean through music and conversation.',specialties=array['문화/K-Pop'] where profile_id=auth.uid();
 submitted:=public.submit_teacher_application((draft->>'updated_at')::timestamptz);
 if submitted->>'status'<>'review_pending' then raise exception 'Completed introduction not submitted'; end if;
 if public.ensure_my_teacher_application()<>submitted then raise exception 'Recovery reset review state'; end if;
 begin
   perform public.submit_teacher_application((draft->>'updated_at')::timestamptz);
   raise exception 'Stale submission accepted';
 exception when sqlstate '40001' then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.student'),true);
do $$ begin
 begin
   perform public.ensure_my_teacher_application();
   raise exception 'Student gained teacher access';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Also recover an existing teacher profile whose application alone is missing.
delete from public.teacher_applications where profile_id=current_setting('test.teacher')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.teacher'),true);
do $$ begin
 if public.ensure_my_teacher_application()->>'status'<>'not_applied' then raise exception 'Missing application not recovered'; end if;
 if not exists(select 1 from public.teacher_profiles where profile_id=auth.uid() and headline='Music and Korean') then raise exception 'Recovery erased introduction'; end if;
end $$;
rollback;
