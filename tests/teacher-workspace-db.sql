begin;
select set_config('test.workspace_owner',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('test.workspace_owner')::uuid,current_setting('test.workspace_owner')||'@example.test','{"role":"teacher","name":"Workspace fixture"}');
insert into public.profiles(id,name,role,active_role) values(current_setting('test.workspace_owner')::uuid,'Workspace fixture','teacher','teacher') on conflict(id) do nothing;
insert into public.teacher_profiles(profile_id) values(current_setting('test.workspace_owner')::uuid) on conflict do nothing;
insert into public.teacher_applications(profile_id,status) values(current_setting('test.workspace_owner')::uuid,'review_pending') on conflict(profile_id) do update set status='review_pending';
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.workspace_owner'),true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$ begin
  begin
    perform public.create_teacher_lesson('{"type":"group","title":"Fixture lesson","category":"회화","price":10000,"capacity":2,"schedulingMode":"request","durationMinutes":50,"availability":[{"weekday":1,"start":"10:00","end":"12:00"}]}');
    raise exception 'Pending teacher created lesson';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.teacher_lessons(teacher_id,title,type,category,price,capacity) values(auth.uid(),'Fixture bypass','group','회화',10000,2);
    raise exception 'Pending teacher bypassed RPC via table';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.teacher_applications set status='approved' where profile_id=current_setting('test.workspace_owner')::uuid;
set local role authenticated;
do $$ declare result jsonb; product public.teacher_lessons; fixture_session uuid; begin
  result := public.create_teacher_lesson('{"type":"group","title":"Fixture lesson","category":"회화","language":"English","supportedLanguages":["한국어","English"],"imageUrl":"https://example.test/image.jpg","videoUrl":"https://example.test/video","price":10000,"capacity":2,"schedulingMode":"request","durationMinutes":50,"availability":[{"weekday":1,"start":"10:00","end":"12:00"}]}');
  select * into product from public.teacher_lessons where id=(result->>'lessonId')::uuid;
  if product.language<>'English' or product.supported_languages<>array['한국어','English'] or product.image_url<>'https://example.test/image.jpg' or product.video_url<>'https://example.test/video' then raise exception 'Lesson fields were lost'; end if;
  if product.teacher_id<>auth.uid() then raise exception 'Incorrect lesson owner'; end if;
  reset role;
  insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
    values(product.id,auth.uid(),'Fixture session','group',date_trunc('day',now()+interval '2 days')+interval '10 hours',50,2) returning id into fixture_session;
  set local role authenticated;
  perform public.update_teacher_meeting_link(fixture_session,'https://meet.google.com/fixture-room');
  if (select meeting_link from public.lesson_sessions where id=fixture_session) is distinct from 'https://meet.google.com/fixture-room' then raise exception 'Meeting link did not persist'; end if;
  begin
    perform public.update_teacher_meeting_link(gen_random_uuid(),'https://example.test');
    raise exception 'Unowned session update accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.update_teacher_meeting_link(fixture_session,'javascript:alert(1)');
    raise exception 'Unsafe URL accepted';
  exception when invalid_parameter_value then null; end;
  perform public.update_teacher_meeting_link(fixture_session,'');
  if (select meeting_link from public.lesson_sessions where id=fixture_session) is not null then raise exception 'Meeting link was not cleared'; end if;
end $$;
rollback;
