-- Fixtures, notes and tasks are discarded at the end.
begin;
select set_config('test.owner',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true),set_config('test.student',gen_random_uuid()::text,true),set_config('test.session',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.owner')::uuid,current_setting('test.owner')||'@example.test','{"role":"teacher","name":"Tools owner"}'),
 (current_setting('test.other')::uuid,current_setting('test.other')||'@example.test','{"role":"teacher","name":"Tools other"}'),
 (current_setting('test.student')::uuid,current_setting('test.student')||'@example.test','{"role":"student","name":"Tools student"}');
insert into public.teacher_profiles(profile_id) values (current_setting('test.owner')::uuid),(current_setting('test.other')::uuid) on conflict do nothing;
insert into public.teacher_applications(profile_id,status) values (current_setting('test.owner')::uuid,'review_pending'),(current_setting('test.other')::uuid,'review_pending') on conflict(profile_id) do update set status='review_pending';
update public.teacher_applications set status='approved' where profile_id in(current_setting('test.owner')::uuid,current_setting('test.other')::uuid);
insert into public.lesson_sessions(id,teacher_id,title,type,scheduled_at,duration_minutes,capacity,status)
 values(current_setting('test.session')::uuid,current_setting('test.owner')::uuid,'Tools fixture','group',now()+interval '2 days',50,2,'scheduled');
insert into public.enrollments(session_id,student_id,status) values(current_setting('test.session')::uuid,current_setting('test.student')::uuid,'confirmed');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true),set_config('request.jwt.claim.role','authenticated',true);
insert into public.teacher_tasks(teacher_id,title) values(auth.uid(),'Prepare lesson');
insert into public.teacher_student_notes(teacher_id,student_id,goals) values(auth.uid(),current_setting('test.student')::uuid,'Private goal');
do $$ declare n integer; old_version timestamptz; begin
 if jsonb_array_length(public.my_teacher_students())<>1 then raise exception 'Roster missing student'; end if;
 if public.my_teacher_students()->0->>'name'<>'Tools student' then raise exception 'Roster name incorrect'; end if;
 if (public.my_teacher_month_summary()->>'completed')::integer<>0 then raise exception 'Scheduled class counted as completed'; end if;
 select updated_at into old_version from public.teacher_tasks where teacher_id=auth.uid();
 update public.teacher_tasks set is_done=true where teacher_id=auth.uid() and updated_at=old_version;
 if not (select is_done from public.teacher_tasks where teacher_id=auth.uid()) then raise exception 'Task update failed'; end if;
 update public.teacher_tasks set is_done=false where teacher_id=auth.uid() and updated_at=old_version;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Stale task write accepted'; end if;
 select updated_at into old_version from public.teacher_student_notes where teacher_id=auth.uid();
 update public.teacher_student_notes set learning_notes='Saved feedback' where teacher_id=auth.uid() and updated_at=old_version;
 if (select learning_notes from public.teacher_student_notes where teacher_id=auth.uid())<>'Saved feedback' then raise exception 'Note save failed'; end if;
 update public.teacher_student_notes set learning_notes='Stale update' where teacher_id=auth.uid() and updated_at=old_version;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Stale note write accepted'; end if;
 begin
  insert into public.teacher_student_notes(teacher_id,student_id) values(auth.uid(),current_setting('test.other')::uuid);
  raise exception 'Unrelated student note accepted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.other'),true);
do $$ declare n integer; begin
 if exists(select 1 from public.teacher_student_notes) or exists(select 1 from public.teacher_tasks) then raise exception 'Other teacher read private data'; end if;
 if jsonb_array_length(public.my_teacher_students())<>0 then raise exception 'Other teacher read roster'; end if;
 update public.teacher_student_notes set goals='Unauthorized'; get diagnostics n=row_count;
 if n<>0 then raise exception 'Other teacher edited note'; end if;
 delete from public.teacher_tasks; get diagnostics n=row_count;
 if n<>0 then raise exception 'Other teacher deleted task'; end if;
 begin
  insert into public.teacher_tasks(teacher_id,title) values(current_setting('test.owner')::uuid,'Unauthorized');
  raise exception 'Other teacher inserted task';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.student'),true);
do $$ begin
 if exists(select 1 from public.teacher_student_notes) or exists(select 1 from public.teacher_tasks) then raise exception 'Student read private data'; end if;
 begin perform public.my_teacher_students(); raise exception 'Student accessed roster'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.teacher_applications set status='review_pending' where profile_id=current_setting('test.owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
do $$ begin
 if exists(select 1 from public.teacher_tasks) then raise exception 'Unapproved account read workspace'; end if;
 begin perform public.my_teacher_month_summary(); raise exception 'Unapproved account accessed summary'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform * from public.teacher_student_notes; raise exception 'Anonymous read notes'; exception when insufficient_privilege then null; end;
 begin perform public.my_teacher_students(); raise exception 'Anonymous read roster'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
