begin;
create function public.admin_lesson_detail(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare l public.teacher_lessons; day0 date := (now() at time zone 'Asia/Seoul')::date; available boolean;
begin
 if not public.admin_is_authorized() then raise insufficient_privilege; end if;
 select * into strict l from public.teacher_lessons where id=p_id;
 select exists(select 1 from generate_series(0,13) d where jsonb_array_length(public.lesson_booking_slots(l.id,day0+d))>0) into available;
 return jsonb_build_object('lesson',to_jsonb(l),'available',available,'visible',jsonb_array_length(public.public_lesson_catalog('{}'::jsonb,l.id)->'items')>0,
 'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'time',s.scheduled_at,'capacity',s.capacity,'students',
 coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'status',e.status) order by e.created_at) from public.enrollments e join public.profiles p on p.id=e.student_id where e.session_id=s.id and (e.status='confirmed' or (e.status='pending_payment' and e.expires_at>now()))),'[]'::jsonb)) order by s.scheduled_at) from public.lesson_sessions s where s.teacher_lesson_id=l.id and s.scheduled_at>now() and s.status='scheduled'),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(jsonb_build_object('action',a.action,'reason',a.reason,'actor',p.name,'time',a.created_at,'before',a.before_data,'after',a.after_data) order by a.created_at desc,a.id) from public.admin_audit_logs a join public.profiles p on p.id=a.actor_id where a.target_id=l.id),'[]'::jsonb));
end $$;

create function public.admin_lesson_change(p_id uuid,p_expected timestamptz,p_action text,p_data jsonb,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare l public.teacher_lessons; changed public.teacher_lessons; last_step text;
begin
 if not public.admin_is_authorized() then raise insufficient_privilege; end if;
 select * into strict l from public.teacher_lessons where id=p_id for update;
 if l.updated_at is distinct from p_expected then raise exception 'Stale lesson' using errcode='40001'; end if;
 if coalesce(length(trim(p_reason)),0) not between 3 and 500 then raise exception 'Invalid reason'; end if;
 select action into last_step from public.admin_audit_logs where target_id=p_id and action in ('lesson_request','lesson_submitted','lesson_reviewed') order by created_at desc limit 1;
 if p_action='lesson_edit' then
 if coalesce(length(trim(p_data->>'title')),0) not between 2 and 200 or coalesce(length(trim(p_data->>'category')),0) not between 1 and 100 or (p_data->>'price')::integer not between 0 and 10000000 or (p_data->>'capacity')::integer not between 1 and 100 or (l.type='free_trial' and (p_data->>'price')::integer<>0) then raise exception 'Invalid lesson'; end if;
 if l.price<>(p_data->>'price')::integer and exists(select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_lesson_id=l.id and e.status='pending_payment' and e.expires_at>now()) then raise exception 'Pending payment' using errcode='P0002'; end if;
 update public.teacher_lessons set title=trim(p_data->>'title'),description=p_data->>'description',category=trim(p_data->>'category'),level=p_data->>'level',price=(p_data->>'price')::int,capacity=(p_data->>'capacity')::int where id=p_id returning * into changed;
 elsif p_action='lesson_request' and last_step is distinct from 'lesson_request' then
 insert into public.notifications(user_id,type,title,body,link_url) values(l.teacher_id,'booking_status','수업 수정 요청 · '||l.title,p_reason,'/teacher/lessons/'||l.id);
 elsif p_action='lesson_reviewed' and last_step='lesson_submitted' then null;
 else raise exception 'Invalid workflow transition'; end if;
 insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data) values(auth.uid(),p_action,p_id,trim(p_reason),case when p_action='lesson_edit' then to_jsonb(l) end,case when p_action='lesson_edit' then to_jsonb(changed) end);
end $$;

create function public.lesson_revision_submitted() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()=new.teacher_id and (to_jsonb(new)-'updated_at') is distinct from (to_jsonb(old)-'updated_at') and (select action from public.admin_audit_logs where target_id=new.id and action in ('lesson_request','lesson_submitted','lesson_reviewed') order by created_at desc limit 1)='lesson_request' then
 insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data) values(auth.uid(),'lesson_submitted',new.id,'선생님 수정 제출',to_jsonb(old),to_jsonb(new));
 end if;
 return new;
end $$;
create trigger lesson_revision_submission after update on public.teacher_lessons for each row execute function public.lesson_revision_submitted();
revoke all on function public.admin_lesson_detail(uuid),public.admin_lesson_change(uuid,timestamptz,text,jsonb,text),public.lesson_revision_submitted() from public,anon,authenticated;
grant execute on function public.admin_lesson_detail(uuid),public.admin_lesson_change(uuid,timestamptz,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
