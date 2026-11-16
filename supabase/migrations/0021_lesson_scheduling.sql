begin;
alter table public.teacher_lessons
  add column scheduling_mode text not null default 'fixed' check (scheduling_mode in ('fixed','request')),
  add column duration_minutes integer not null default 50 check (duration_minutes between 10 and 240),
  add column availability jsonb not null default '[]'::jsonb;

create function public.validate_lesson_availability() returns trigger language plpgsql set search_path='' as $$
declare w jsonb;
begin
  if jsonb_typeof(new.availability)<>'array' or jsonb_array_length(new.availability)>21 then raise exception 'Invalid availability'; end if;
  if new.scheduling_mode='request' and jsonb_array_length(new.availability)=0 then raise exception 'Availability required'; end if;
  for w in select value from jsonb_array_elements(new.availability) loop
    if coalesce(w->>'weekday','') !~ '^[0-6]$' or coalesce(w->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(w->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid availability window'; end if;
    if (w->>'end')::time - (w->>'start')::time < make_interval(mins=>new.duration_minutes) then raise exception 'Availability too short'; end if;
  end loop;
  return new;
end $$;
create trigger lesson_availability_guard before insert or update on public.teacher_lessons for each row execute function public.validate_lesson_availability();

-- One source of truth for the displayed and reservable starts, in Korean time.
create function public.lesson_request_starts(p_lesson uuid,p_day date) returns table(start_at timestamptz)
language sql stable security definer set search_path='' as $$
  select distinct g from public.teacher_lessons l cross join lateral jsonb_array_elements(l.availability) w
  cross join lateral generate_series((p_day+(w->>'start')::time) at time zone 'Asia/Seoul',
    (p_day+(w->>'end')::time) at time zone 'Asia/Seoul'-make_interval(mins=>l.duration_minutes),interval '30 minutes') g
  where l.id=p_lesson and l.is_published and l.scheduling_mode='request' and (w->>'weekday')::integer=extract(dow from p_day)
$$;
revoke all on function public.lesson_request_starts(uuid,date),public.validate_lesson_availability() from public,anon,authenticated;

create or replace function public.create_teacher_lesson(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare lesson_id uuid; session_id uuid; price integer; capacity integer; start_at timestamptz; mode text := coalesce(p_data->>'schedulingMode','fixed'); duration integer := (p_data->>'durationMinutes')::integer; windows jsonb := coalesce(p_data->'availability','[]'::jsonb);
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  price:=(p_data->>'price')::integer; capacity:=(p_data->>'capacity')::integer; start_at:=(p_data->>'scheduledAt')::timestamptz;
  if price is null or price<0 or price>10000000 or capacity is null or capacity<1 or capacity>100 or (mode='fixed' and (start_at is null or start_at<=now() or start_at>now()+interval '180 days')) or length(trim(coalesce(p_data->>'title','')))<2 then raise exception 'Invalid lesson'; end if;
  if p_data->>'type'='free_trial' and price<>0 then raise exception 'Free trial must be free'; end if;
  if mode not in ('fixed','request') or duration is null or duration<10 or duration>240 or coalesce(p_data->>'category','') not in ('TOPIK','회화','비즈니스','발음 교정','취미/문화') then raise exception 'Invalid lesson settings'; end if;
  if mode='request' and (jsonb_typeof(windows)<>'array' or jsonb_array_length(windows)=0) then raise exception 'Availability required'; end if;
  if mode='fixed' then windows := '[]'::jsonb; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  insert into public.teacher_profiles(profile_id) values(auth.uid()) on conflict do nothing;
  insert into public.teacher_lessons(teacher_id,title,type,category,level,price,capacity,description,is_published,scheduling_mode,duration_minutes,availability)
    values(auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,p_data->>'category',p_data->>'level',price,capacity,p_data->>'description',true,mode,duration,windows) returning id into lesson_id;
  if mode='fixed' then
  insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
    values(lesson_id,auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,start_at,coalesce((p_data->>'durationMinutes')::int,50),capacity) returning id into session_id;
  end if;
  return jsonb_build_object('lessonId',lesson_id,'sessionId',session_id);
end $$;


create or replace function public.reserve_lesson(p_lesson uuid,p_start timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.teacher_lessons; s public.lesson_sessions; e public.enrollments; occupied integer;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select * into l from public.teacher_lessons where id=p_lesson;
  if not found or not l.is_published or l.teacher_id=auth.uid() or l.price<0 then raise exception 'Lesson unavailable'; end if;
  perform 1 from public.profiles where id=l.teacher_id for update;
  select * into l from public.teacher_lessons where id=p_lesson for share;
  if not found or not l.is_published then raise exception 'Lesson unavailable'; end if;
  if p_start is null or p_start<=now() or p_start>now()+interval '180 days' then raise exception 'Choose a future lesson within 180 days'; end if;
  select * into s from public.lesson_sessions where teacher_lesson_id=l.id and teacher_id=l.teacher_id and scheduled_at=p_start and status='scheduled' order by id limit 1 for update;
  if not found then
    if l.scheduling_mode<>'request' or not exists(
      select 1 from public.lesson_request_starts(l.id,(p_start at time zone 'Asia/Seoul')::date) t where t.start_at=p_start
    ) then raise exception 'Teacher is unavailable at this time'; end if;
    insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
      values(l.id,l.teacher_id,l.title,l.type,p_start,l.duration_minutes,l.capacity) returning * into s;
  end if;
  select * into e from public.enrollments where session_id=s.id and student_id=auth.uid() for update;
  if found and (e.status in ('confirmed','completed') or (e.status='pending_payment' and e.expires_at>now())) then return jsonb_build_object('enrollmentId',e.id); end if;
  if l.type='free_trial' and exists(select 1 from public.enrollments x join public.lesson_sessions z on z.id=x.session_id where x.student_id=auth.uid() and z.teacher_id=l.teacher_id and z.type='free_trial'
    and (x.status in ('confirmed','completed','no_show') or (x.status='pending_payment' and x.expires_at>now()))) then raise exception 'Free trial already used'; end if;
  select count(*) into occupied from public.enrollments where session_id=s.id and (status in ('confirmed','completed') or (status='pending_payment' and expires_at>now()));
  if occupied>=s.capacity then raise exception 'Lesson is full'; end if;
  insert into public.enrollments(session_id,student_id,status,reserved_price,reserved_currency,expires_at)
    values(s.id,auth.uid(),'pending_payment',l.price,l.currency,least(now()+interval '15 minutes',s.scheduled_at))
    on conflict(session_id,student_id) do update set status='pending_payment',reserved_price=excluded.reserved_price,reserved_currency=excluded.reserved_currency,expires_at=excluded.expires_at
    returning * into e;
  return jsonb_build_object('enrollmentId',e.id);
end $$;


create or replace function public.lesson_booking_slots(p_lesson uuid,p_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare l public.teacher_lessons;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select * into l from public.teacher_lessons where id=p_lesson and is_published;
  if not found or p_day is null or p_day<(now() at time zone 'Asia/Seoul')::date or p_day>(now() at time zone 'Asia/Seoul')::date+180 then return '[]'::jsonb; end if;
  return (with candidates as (
    select s.id,s.scheduled_at,s.duration_minutes,s.capacity from public.lesson_sessions s where s.teacher_lesson_id=l.id and s.status='scheduled' and (s.scheduled_at at time zone 'Asia/Seoul')::date=p_day
    union all
    select null::uuid,g.start_at,l.duration_minutes,l.capacity from public.lesson_request_starts(l.id,p_day) g
    where l.scheduling_mode='request'
      and not exists(select 1 from public.lesson_sessions s where s.teacher_id=l.teacher_id and s.status in ('scheduled','ongoing') and tstzrange(s.scheduled_at,s.scheduled_at+make_interval(mins=>s.duration_minutes),'[)') && tstzrange(g.start_at,g.start_at+make_interval(mins=>l.duration_minutes),'[)'))
  ) select coalesce(jsonb_agg(jsonb_build_object('start',c.scheduled_at,'duration',c.duration_minutes) order by c.scheduled_at),'[]'::jsonb)
    from candidates c where c.scheduled_at>now() and (select count(*) from public.enrollments e where e.session_id=c.id and (e.status in ('confirmed','completed') or (e.status='pending_payment' and e.expires_at>now())))<c.capacity);
end $$;

notify pgrst,'reload schema';
commit;
