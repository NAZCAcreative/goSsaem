-- Fixtures and reservations are rolled back.
begin;
do $$
declare t uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); fixed uuid; requested uuid; result jsonb; slots jsonb; booking uuid;
  day date := (now() at time zone 'Asia/Seoul')::date+7;
  start_at timestamptz;
begin
  start_at := (day+time '10:00') at time zone 'Asia/Seoul';
  insert into auth.users(id,email,raw_user_meta_data) values
    (t,t::text||'@lessons.example.invalid','{"name":"Teacher fixture","role":"teacher"}'),
    (u,u::text||'@lessons.example.invalid','{"name":"Student fixture","role":"student"}'),
    (v,v::text||'@lessons.example.invalid','{"name":"Second student","role":"student"}');
  perform set_config('request.jwt.claim.sub',t::text,true);
  result:=public.create_teacher_lesson(jsonb_build_object('title','Fixed lesson','type','group','price',0,'capacity',2,'category','회화','scheduledAt',start_at,'durationMinutes',60,'schedulingMode','fixed'));
  fixed:=(result->>'lessonId')::uuid;
  assert result->>'sessionId' is not null, 'Fixed lesson creates session';
  result:=public.create_teacher_lesson(jsonb_build_object('title','Request lesson','type','group','price',0,'capacity',2,'category','TOPIK','durationMinutes',60,'schedulingMode','request','availability',jsonb_build_array(jsonb_build_object('weekday',extract(dow from day),'start','09:00','end','13:00'))));
  requested:=(result->>'lessonId')::uuid;
  assert result->>'sessionId' is null, 'Request lesson has no session before booking';
  perform set_config('request.jwt.claim.sub',u::text,true);
  slots:=public.lesson_booking_slots(fixed,day);
  assert jsonb_array_length(slots)=1, 'Fixed lesson offers only its own session';
  slots:=public.lesson_booking_slots(requested,day);
  assert jsonb_array_length(slots)=4, 'Request slots exclude conflicting teacher session';
  assert not exists(select 1 from jsonb_array_elements(slots) x where (x->>'start')::timestamptz=start_at), 'Conflict hidden';
  begin
    perform public.reserve_lesson(fixed,start_at+interval '2 hours');
    raise exception 'Fixed lesson unexpectedly accepted arbitrary start';
  exception when raise_exception then
    if sqlerrm<>'Teacher is unavailable at this time' then raise; end if;
  end;
  begin
    perform public.reserve_lesson(requested,start_at+interval '5 minutes');
    raise exception 'Request lesson unexpectedly accepted off-grid start';
  exception when raise_exception then
    if sqlerrm<>'Teacher is unavailable at this time' then raise; end if;
  end;
  result:=public.reserve_lesson(requested,start_at+interval '2 hours');
  booking:=(result->>'enrollmentId')::uuid;
  assert exists(select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.id=booking and s.teacher_lesson_id=requested and s.teacher_id=t and s.duration_minutes=60), 'Student booking creates linked teacher session';
  assert (public.reserve_lesson(requested,start_at+interval '2 hours')->>'enrollmentId')::uuid=booking, 'Repeat booking is idempotent';
  perform public.checkout_free_booking(booking,null);
  assert (select status='confirmed' from public.enrollments where id=booking), 'Free booking confirmed';
  perform set_config('request.jwt.claim.sub',v::text,true);
  perform public.reserve_lesson(requested,start_at+interval '2 hours');
  assert not exists(select 1 from jsonb_array_elements(public.lesson_booking_slots(requested,day)) x where (x->>'start')::timestamptz=start_at+interval '2 hours'), 'Full session unavailable';
end $$;
rollback;
