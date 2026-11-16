begin;
create or replace function public.sync_session_enrolled_count() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  target:=case when tg_op='DELETE' then old.session_id else new.session_id end;
  update public.lesson_sessions set enrolled_count=(select count(*) from public.enrollments where session_id=target and status in ('confirmed','completed')) where id=target;
  if tg_op='UPDATE' and old.session_id is distinct from new.session_id then
    update public.lesson_sessions set enrolled_count=(select count(*) from public.enrollments where session_id=old.session_id and status in ('confirmed','completed')) where id=old.session_id;
  end if;
  return null;
end $$;
create table public.booking_changes (
  id uuid primary key default gen_random_uuid(),enrollment_id uuid not null references public.enrollments(id),
  from_session uuid not null references public.lesson_sessions(id),to_session uuid not null references public.lesson_sessions(id),
  actor_id uuid not null references public.profiles(id),reason text not null,created_at timestamptz not null default now()
);
alter table public.booking_changes enable row level security;
revoke all on public.booking_changes from public,anon,authenticated;
create function public.admin_resolve_booking(p_request uuid,p_start timestamptz,p_response text) returns void language plpgsql security definer set search_path='' as $$
declare req public.booking_requests; e public.enrollments; old_session public.lesson_sessions; target public.lesson_sessions; product public.teacher_lessons;
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  if length(trim(p_response)) not between 3 and 2000 then raise exception 'Response required'; end if;
  select * into req from public.booking_requests where id=p_request;
  select * into old_session from public.lesson_sessions where id=(select session_id from public.enrollments where id=req.enrollment_id);
  perform 1 from public.profiles where id=old_session.teacher_id for update;
  select * into req from public.booking_requests where id=p_request for update;
  select * into e from public.enrollments where id=req.enrollment_id for update;
  if req.id is null or req.status not in ('requested','processing') or e.status<>'confirmed' or old_session.scheduled_at<=now() then raise exception 'Booking cannot be changed'; end if;
  if req.kind='cancel' then
    if exists(select 1 from public.payments where enrollment_id=e.id and verified_payment and status='succeeded' and amount>0) then raise exception 'Use verified payment refund for paid bookings'; end if;
    update public.enrollments set status='cancelled',expires_at=null where id=e.id;
    update public.payments set status='cancelled' where enrollment_id=e.id and verified_payment and amount=0;
  elsif req.kind='reschedule' then
    if p_start is null or p_start<=now() or p_start>now()+interval '180 days' or p_start=old_session.scheduled_at then raise exception 'Choose a new future time'; end if;
    select * into product from public.teacher_lessons where id=old_session.teacher_lesson_id for share;
    if product.id is null or product.price<>e.reserved_price or product.currency<>e.reserved_currency or not product.is_published then raise exception 'Product or price changed; review the booking separately'; end if;
    if exists(select 1 from public.teacher_days_off where teacher_id=old_session.teacher_id and day=(p_start at time zone 'Asia/Seoul')::date) then raise exception 'Teacher holiday'; end if;
    select * into target from public.lesson_sessions where teacher_lesson_id=product.id and teacher_id=old_session.teacher_id and scheduled_at=p_start and status='scheduled' order by id limit 1 for update;
    if not found then
      if product.scheduling_mode<>'request' or not exists(select 1 from public.lesson_request_starts(product.id,(p_start at time zone 'Asia/Seoul')::date) t where t.start_at=p_start) then raise exception 'Teacher unavailable'; end if;
      insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
        values(product.id,old_session.teacher_id,old_session.title,old_session.type,p_start,old_session.duration_minutes,product.capacity) returning * into target;
    end if;
    if exists(select 1 from public.enrollments where session_id=target.id and student_id=e.student_id) then raise exception 'Student already has a reservation at this time'; end if;
    if (select count(*) from public.enrollments where session_id=target.id and (status in ('confirmed','completed') or (status='pending_payment' and expires_at>now())))>=target.capacity then raise exception 'Target session full'; end if;
    insert into public.booking_changes(enrollment_id,from_session,to_session,actor_id,reason) values(e.id,old_session.id,target.id,auth.uid(),trim(p_response));
    update public.enrollments set session_id=target.id where id=e.id;
    delete from public.attendance_records where enrollment_id=e.id;
  else raise exception 'This request needs a support response'; end if;
  update public.booking_requests set status='resolved',response=trim(p_response),updated_at=now() where id=req.id;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),'resolve_booking',e.id,trim(p_response),to_jsonb(e),jsonb_build_object('kind',req.kind,'newSession',target.id));
  insert into public.notifications(user_id,type,title,body,link_url) values(e.student_id,'booking_status','예약 요청이 처리되었습니다',trim(p_response),'/student/bookings/'||e.id::text);
  insert into public.notifications(user_id,type,title,body,link_url) values(old_session.teacher_id,'booking_status','예약 변경 내역을 확인해주세요',trim(p_response),'/teacher/lessons');
end $$;
revoke all on function public.admin_resolve_booking(uuid,timestamptz,text) from public,anon;
grant execute on function public.admin_resolve_booking(uuid,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
commit;
