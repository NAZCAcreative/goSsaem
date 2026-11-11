begin;
select set_config('test.teacher',gen_random_uuid()::text,true),set_config('test.student',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.teacher')::uuid,current_setting('test.teacher')||'@example.test','{"role":"teacher","name":"Language fixture"}'),
 (current_setting('test.student')::uuid,current_setting('test.student')||'@example.test','{"role":"student","name":"Language learner"}');
insert into public.teacher_profiles(profile_id) values(current_setting('test.teacher')::uuid) on conflict do nothing;
insert into public.teacher_applications(profile_id,status) values(current_setting('test.teacher')::uuid,'review_pending') on conflict(profile_id) do update set status='review_pending';
insert into public.matching_profiles(profile_id,languages,mbti,matching_enabled) values
 (current_setting('test.teacher')::uuid,'[{"language":"ko","level":"native"},{"language":"en","level":"C1"}]','ENFP',false),
 (current_setting('test.student')::uuid,'[{"language":"ko","level":"A2"}]','ISTJ',false);
set local role anon;
do $$ begin
 if public.public_teacher_languages(current_setting('test.teacher')::uuid)<>'[]'::jsonb then raise exception 'Pending teacher exposed'; end if;
 if public.public_teacher_languages(current_setting('test.student')::uuid)<>'[]'::jsonb then raise exception 'Student languages exposed'; end if;
end $$;
reset role;
update public.teacher_applications set status='approved' where profile_id=current_setting('test.teacher')::uuid;
set local role anon;
do $$ declare result jsonb; begin
 result:=public.public_teacher_languages(current_setting('test.teacher')::uuid);
 if result<>'[{"language":"ko","level":"native"},{"language":"en","level":"C1"}]'::jsonb then raise exception 'Language levels missing or private fields exposed'; end if;
 if public.public_teacher_languages(gen_random_uuid())<>'[]'::jsonb then raise exception 'Missing teacher not empty'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.student'),true);
do $$ begin
 if jsonb_array_length(public.public_teacher_languages(current_setting('test.teacher')::uuid))<>2 then raise exception 'Student cannot see languages'; end if;
 if exists(select 1 from public.matching_profiles where profile_id=current_setting('test.teacher')::uuid) then raise exception 'Private teacher preferences exposed'; end if;
end $$;
rollback;
