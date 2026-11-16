begin;
select set_config('test.mt',gen_random_uuid()::text,true),set_config('test.ms',gen_random_uuid()::text,true),set_config('test.mo',gen_random_uuid()::text,true),set_config('test.ml',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.mt')::uuid,current_setting('test.mt')||'@example.test','{"role":"teacher","name":"Matching fixture"}'),
 (current_setting('test.ms')::uuid,current_setting('test.ms')||'@example.test','{"role":"student","name":"Matching learner"}'),
 (current_setting('test.mo')::uuid,current_setting('test.mo')||'@example.test','{"role":"student","name":"Other learner"}');
insert into public.teacher_profiles(profile_id) values(current_setting('test.mt')::uuid) on conflict do nothing;
insert into public.teacher_applications(profile_id,status) values(current_setting('test.mt')::uuid,'review_pending') on conflict(profile_id) do update set status='review_pending';
update public.teacher_applications set status='approved' where profile_id=current_setting('test.mt')::uuid;
insert into public.teacher_lessons(id,teacher_id,title,type,category,level,price,capacity,is_published,scheduling_mode)
 values(current_setting('test.ml')::uuid,current_setting('test.mt')::uuid,'Matching fixture 여행','group','여행','초급',10000,4,true,'fixed');
update public.teacher_lessons set supported_languages=array['한국어','영어'] where id=current_setting('test.ml')::uuid;
insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity,status)
 values(current_setting('test.ml')::uuid,current_setting('test.mt')::uuid,'Matching fixture','group',now()+interval '2 days',50,4,'scheduled');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.mt'),true),set_config('request.jwt.claim.role','authenticated',true);
insert into public.matching_profiles(profile_id,languages,interests,goals,styles,traits,teaching_levels,mbti,matching_enabled)
 values(auth.uid(),'[{"language":"ko","level":"native"},{"language":"en","level":"C1"}]',array['여행'],array['여행 회화'],array['대화 중심'],array['차분한'],array['초급'],'ENFP',true);
select set_config('request.jwt.claim.sub',current_setting('test.ms'),true);
insert into public.matching_profiles(profile_id,languages,communication_language,interests,goals,styles,traits,mbti,matching_enabled)
 values(auth.uid(),'[{"language":"ko","level":"A2"}]','en',array['여행'],array['여행 회화'],array['대화 중심'],array['차분한'],'ISTJ',true);
do $$ declare result jsonb; before_result jsonb; old_version timestamptz; changed integer; begin
 if (select korean_level from public.profiles where id=auth.uid())<>'elementary' then raise exception 'Korean language level not synchronized'; end if;
 result:=public.my_lesson_recommendations();
 if not exists(select 1 from jsonb_array_elements(result) x where x->'lesson'->>'id'=current_setting('test.ml')) then raise exception 'Matching lesson missing'; end if;
 if result::text not like '%관심사: 여행%' or result::text not like '%소통 언어%' then raise exception 'Missing recommendation explanations'; end if;
 if result::text like '%ENFP%' or result::text like '%ISTJ%' or result::text like '%"mbti"%' then raise exception 'Private MBTI leaked'; end if;
 if exists(select 1 from public.matching_profiles where profile_id=current_setting('test.mt')::uuid) then raise exception 'Learner can read raw teacher preferences'; end if;
 before_result:=result;
 update public.matching_profiles set mbti='ENTP' where profile_id=auth.uid();
 if public.my_lesson_recommendations() is distinct from before_result then raise exception 'MBTI affected ranking'; end if;
 select updated_at into old_version from public.matching_profiles where profile_id=auth.uid();
 update public.matching_profiles set interests=array['여행','음식'] where profile_id=auth.uid() and updated_at=old_version;
 update public.matching_profiles set interests='{}' where profile_id=auth.uid() and updated_at=old_version;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Stale write accepted'; end if;
 begin update public.matching_profiles set languages='[{"language":"ko","level":"A2"},{"language":"ko","level":"B1"}]' where profile_id=auth.uid();raise exception 'Duplicate language accepted';exception when check_violation then null;end;
 begin update public.matching_profiles set mbti='INVALID' where profile_id=auth.uid();raise exception 'Invalid MBTI accepted';exception when check_violation then null;end;
 update public.profiles set korean_level='intermediate' where id=auth.uid();
 if (select languages->0->>'level' from public.matching_profiles where profile_id=auth.uid())<>'B1' then raise exception 'Legacy level not synchronized';end if;
 update public.matching_profiles set matching_enabled=false where profile_id=auth.uid();
 if public.my_lesson_recommendations()<>'[]'::jsonb then raise exception 'Learner opt-out ignored';end if;
 update public.matching_profiles set matching_enabled=true where profile_id=auth.uid();
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.mo'),true);
do $$ declare changed integer;begin
 if exists(select 1 from public.matching_profiles where profile_id in(current_setting('test.ms')::uuid,current_setting('test.mt')::uuid)) then raise exception 'Private profile visible to another account';end if;
 update public.matching_profiles set mbti='INTJ' where profile_id=current_setting('test.ms')::uuid;get diagnostics changed=row_count;if changed<>0 then raise exception 'Cross account edit';end if;
 if public.my_lesson_recommendations()<>'[]'::jsonb then raise exception 'Unconfigured account received personalized result';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.mt'),true);
update public.matching_profiles set matching_enabled=false where profile_id=auth.uid();
select set_config('request.jwt.claim.sub',current_setting('test.ms'),true);
do $$ begin if exists(select 1 from jsonb_array_elements(public.my_lesson_recommendations()) x where x->'lesson'->>'id'=current_setting('test.ml')) then raise exception 'Teacher opt-out ignored';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.matching_profiles;raise exception 'Anonymous profile read';exception when insufficient_privilege then null;end;
 begin perform public.my_lesson_recommendations();raise exception 'Anonymous recommendations';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
