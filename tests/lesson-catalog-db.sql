begin;
select set_config('test.catalog_teacher',gen_random_uuid()::text,true),set_config('test.catalog_student',gen_random_uuid()::text,true),set_config('test.catalog_lesson',gen_random_uuid()::text,true),set_config('test.catalog_session',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.catalog_teacher')::uuid,current_setting('test.catalog_teacher')||'@example.test','{"role":"teacher","name":"CATFIX_NAME_ONLY"}'),
 (current_setting('test.catalog_student')::uuid,current_setting('test.catalog_student')||'@example.test','{"role":"student","name":"Private student"}');
insert into public.teacher_profiles(profile_id) values(current_setting('test.catalog_teacher')::uuid) on conflict do nothing;
insert into public.teacher_applications(profile_id,status) values(current_setting('test.catalog_teacher')::uuid,'review_pending') on conflict(profile_id) do update set status='review_pending';
update public.teacher_applications set status='approved' where profile_id=current_setting('test.catalog_teacher')::uuid;
insert into public.teacher_lessons(id,teacher_id,title,type,category,level,price,capacity,is_published,scheduling_mode)
 values(current_setting('test.catalog_lesson')::uuid,current_setting('test.catalog_teacher')::uuid,'CATFIX travel speaking','group','CATFIX','초급',15000,2,true,'fixed');
insert into public.teacher_lessons(teacher_id,title,type,category,price,capacity,is_published)
 select current_setting('test.catalog_teacher')::uuid,'CATFIX music '||i,'group','CATFIX',20000+i,3,true from generate_series(1,12) i;
insert into public.teacher_lessons(teacher_id,title,type,category,price,capacity,is_published) values
 (current_setting('test.catalog_teacher')::uuid,'CATFIX hidden','group','CATFIX',0,2,false),
 (current_setting('test.catalog_teacher')::uuid,'CATFIX private tutoring','1on1','CATFIX',50000,1,true);
insert into public.lesson_sessions(id,teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity,status,meeting_link)
 values(current_setting('test.catalog_session')::uuid,current_setting('test.catalog_lesson')::uuid,current_setting('test.catalog_teacher')::uuid,'CATFIX session','group',date_trunc('day',now())+interval '2 days 16 hours',60,2,'scheduled','https://example.test/PRIVATE_MEETING');
insert into public.enrollments(session_id,student_id,status,expires_at) values(current_setting('test.catalog_session')::uuid,current_setting('test.catalog_student')::uuid,'pending_payment',now()+interval '10 minutes');
set local role anon;
do $$ declare result jsonb; result2 jsonb; start_day text; begin
 result:=public.public_lesson_catalog('{"category":"CATFIX"}');
 if (result->>'total')::int<>13 or jsonb_array_length(result->'items')<>12 then raise exception 'Pagination/count/group default failed'; end if;
 result2:=public.public_lesson_catalog('{"category":"CATFIX","page":2}');
 if jsonb_array_length(result2->'items')<>1 then raise exception 'Second page missing'; end if;
 if exists(select 1 from jsonb_array_elements(result->'items') a join jsonb_array_elements(result2->'items') b on a->>'id'=b->>'id') then raise exception 'Repeated page item'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","type":"all"}')->>'total')::int<>14 then raise exception 'All type filter failed'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","type":"1on1"}')->>'total')::int<>1 then raise exception 'Private type filter failed'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","q":"speaking TRAVEL"}')->>'total')::int<>1 then raise exception 'Search terms/case failed'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","q":"CATFIX_NAME_ONLY"}')->>'total')::int<>0 then raise exception 'Teacher name used instead of lesson content'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","price":"low","level":"초급"}')->>'total')::int<>1 then raise exception 'Price/level failed'; end if;
 result:=public.public_lesson_catalog('{}',current_setting('test.catalog_lesson')::uuid);
 if (result->'items'->0->'sessions'->0->>'remaining')::int<>1 then raise exception 'Active pending payment not counted'; end if;
 if result::text like '%PRIVATE_MEETING%' or result::text like '%Private student%' or result::text like '%meeting_link%' then raise exception 'Private fields leaked'; end if;
 start_day:=((result->'items'->0->'sessions'->0->>'start')::timestamptz at time zone 'Asia/Seoul')::date::text;
 if (public.public_lesson_catalog(jsonb_build_object('category','CATFIX','day',start_day,'scheduled',true))->>'total')::int<>1 then raise exception 'Korean date filter failed'; end if;
 if (public.public_lesson_catalog('{"category":"CATFIX","day":"2000-01-01"}')->>'total')::int<>0 then raise exception 'Wrong day matched'; end if;
end $$;
reset role;
update public.enrollments set expires_at=now()-interval '1 second' where session_id=current_setting('test.catalog_session')::uuid;
set local role anon;
do $$ begin
 if (public.public_lesson_catalog('{}',current_setting('test.catalog_lesson')::uuid)->'items'->0->'sessions'->0->>'remaining')::int<>2 then raise exception 'Expired hold counted'; end if;
end $$;
reset role;
update public.lesson_sessions set capacity=1 where id=current_setting('test.catalog_session')::uuid;
update public.enrollments set status='confirmed' where session_id=current_setting('test.catalog_session')::uuid;
set local role anon;
do $$ begin
 if (public.public_lesson_catalog('{"category":"CATFIX","scheduled":true}')->>'total')::int<>0 then raise exception 'Full class advertised as available'; end if;
end $$;
reset role;
update public.teacher_applications set status='review_pending' where profile_id=current_setting('test.catalog_teacher')::uuid;
set local role anon;
do $$ begin
 if (public.public_lesson_catalog('{"category":"CATFIX","type":"all"}')->>'total')::int<>0 then raise exception 'Unapproved teacher exposed'; end if;
 if (public.public_lesson_catalog('{}',current_setting('test.catalog_lesson')::uuid)->>'total')::int<>0 then raise exception 'Detail bypassed approval'; end if;
end $$;
reset role;
rollback;
