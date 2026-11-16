begin;

-- Private meeting credentials must never be exposed through public session reads.
create table public.session_meetings (
  session_id uuid primary key references public.lesson_sessions(id) on delete cascade,
  url text not null check(length(url)<=2000 and url ~ '^https://(meet[.]google[.]com/|([a-z0-9-]+[.])*zoom[.]us/|teams[.]microsoft[.]com/)'),
  updated_at timestamptz not null default now()
);
alter table public.session_meetings enable row level security;
revoke all on public.session_meetings from public,anon,authenticated;
insert into public.session_meetings(session_id,url)
select id,meeting_link from public.lesson_sessions where meeting_link ~ '^https://(meet[.]google[.]com/|([a-z0-9-]+[.])*zoom[.]us/|teams[.]microsoft[.]com/)' on conflict do nothing;
update public.lesson_sessions set meeting_link=null where meeting_link is not null;

create function public.set_session_meeting(p_session uuid,p_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.lesson_sessions where id=p_session and teacher_id=auth.uid() and status in ('scheduled','ongoing')) then raise exception 'Session access denied' using errcode='42501'; end if;
  insert into public.session_meetings(session_id,url) values(p_session,trim(p_url))
  on conflict(session_id) do update set url=excluded.url,updated_at=now();
end $$;

create function public.session_access(p_session uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.lesson_sessions; is_teacher boolean; meeting text; enter_at timestamptz; end_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select * into s from public.lesson_sessions where id=p_session;
  is_teacher:=s.teacher_id=auth.uid();
  if s.id is null or not (is_teacher or exists(select 1 from public.enrollments where session_id=s.id and student_id=auth.uid() and status in ('confirmed','completed','no_show'))) then raise exception 'Session access denied' using errcode='42501'; end if;
  enter_at:=s.scheduled_at-interval '10 minutes'; end_at:=s.scheduled_at+make_interval(mins=>s.duration_minutes)+interval '30 minutes';
  if is_teacher or (s.status in ('scheduled','ongoing') and now() between enter_at and end_at) then
    select url into meeting from public.session_meetings where session_id=s.id;
  end if;
  return jsonb_build_object('id',s.id,'title',s.title,'scheduledAt',s.scheduled_at,'durationMinutes',s.duration_minutes,'status',s.status,
    'isTeacher',is_teacher,'opensAt',enter_at,'closesAt',end_at,'serverNow',now(),'meetingUrl',meeting,
    'canJoin',s.status in ('scheduled','ongoing') and now() between enter_at and end_at and meeting is not null);
end $$;

-- Cancellation of paid bookings is reviewed until a merchant policy is approved.
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references public.enrollments(id),
  requester_id uuid not null references public.profiles(id), kind text not null check(kind in ('cancel','reschedule','dispute')),
  reason text not null check(length(trim(reason)) between 10 and 2000),
  status text not null default 'requested' check(status in ('requested','processing','resolved','rejected')),
  response text check(length(response)<=2000), created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index booking_requests_open_idx on public.booking_requests(enrollment_id,kind) where status in ('requested','processing');
alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from public,anon,authenticated;
grant select on public.booking_requests to authenticated;
create policy booking_requests_read on public.booking_requests for select using(requester_id=auth.uid() or public.admin_is_authorized());

create function public.request_booking_action(p_enrollment uuid,p_kind text,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare e public.enrollments; s public.lesson_sessions; result uuid;
begin
  select * into s from public.lesson_sessions where id=(select session_id from public.enrollments where id=p_enrollment);
  if auth.uid() is null or not exists(select 1 from public.enrollments where id=p_enrollment and (student_id=auth.uid() or s.teacher_id=auth.uid())) then raise exception 'Booking access denied' using errcode='42501'; end if;
  perform 1 from public.profiles where id=s.teacher_id for update;
  select * into e from public.enrollments where id=p_enrollment for update;
  if p_kind not in ('cancel','reschedule','dispute') or length(trim(p_reason)) not between 10 and 2000 then raise exception 'Invalid request'; end if;
  if p_kind='cancel' and e.status='cancelled' then
    select id into result from public.booking_requests where enrollment_id=e.id and requester_id=auth.uid() and kind='cancel' order by created_at desc limit 1;
    if result is not null then return result; end if;
  end if;
  if p_kind<>'dispute' and (e.status not in ('pending_payment','confirmed') or s.scheduled_at<=now()) then raise exception 'Contact support for this booking'; end if;
  select id into result from public.booking_requests where enrollment_id=e.id and kind=p_kind and status in ('requested','processing');
  if result is not null then return result; end if;
  if (select count(*) from public.booking_requests where requester_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many requests'; end if;
  insert into public.booking_requests(enrollment_id,requester_id,kind,reason) values(e.id,auth.uid(),p_kind,trim(p_reason)) returning id into result;
  if p_kind='cancel' and e.student_id=auth.uid() and e.status='pending_payment' then
    update public.enrollments set status='cancelled',expires_at=null where id=e.id;
    update public.booking_requests set status='resolved',response='결제 전 예약이 취소되었습니다.',updated_at=now() where id=result;
  end if;
  return result;
end $$;

-- Existing reminders and expiry behavior are preserved. Only recorded attendance
-- can complete a lesson; absence is never inferred by the scheduler.
alter function public.maintain_reservations() rename to maintain_reservations_base;
create function public.maintain_reservations() returns void language plpgsql security definer set search_path='' as $$
declare r record;
begin
  perform public.maintain_reservations_base();
  for r in select e.id,s.teacher_id from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
    join public.attendance_records a on a.enrollment_id=e.id where e.status='confirmed'
    and s.status in ('scheduled','ongoing','completed') and s.scheduled_at+make_interval(mins=>s.duration_minutes)<=now()
    order by s.teacher_id,e.id
  loop
    perform 1 from public.profiles where id=r.teacher_id for update;
    update public.enrollments e set status=case when a.status='absent' then 'no_show'::public.enrollment_status else 'completed'::public.enrollment_status end
    from public.attendance_records a where e.id=r.id and a.enrollment_id=e.id and e.status='confirmed';
  end loop;
end $$;
revoke all on function public.maintain_reservations(),public.maintain_reservations_base() from public,anon,authenticated;

create index if not exists enrollment_recent_public_idx on public.enrollments(created_at,session_id) where status in ('confirmed','completed','no_show');
create function public.public_booking_counts(p_days integer default 30,p_teacher uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select s.teacher_id as "teacherId",count(*) as count from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
    where e.status in ('confirmed','completed','no_show') and e.created_at>=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),90)))
    and (p_teacher is null or s.teacher_id=p_teacher) group by s.teacher_id
  ) r
$$;

create function public.search_teachers(p_query text default '',p_specialty text default null,p_price text default 'all',p_periods text[] default '{}',p_sort text default 'recommended',p_page integer default 1,p_size integer default 8) returns jsonb
language sql stable security definer set search_path='' as $$
  with cards as (
    select t.profile_id as id,p.name,p.avatar_url as "avatarUrl",p.avatar_is_generated as "avatarIsGenerated",t.headline,
      t.rating_avg as "ratingAvg",t.rating_count as "ratingCount",t.is_verified as "isVerified",t.specialties,
      l.min_price as "minPrice",coalesce(b.bookings,0) as "recentBookings"
    from public.teacher_profiles t join public.profiles p on p.id=t.profile_id
    join lateral (select min(price) as min_price,string_agg(title,' ') as titles from public.teacher_lessons where teacher_id=t.profile_id and is_published) l on l.min_price is not null
    left join lateral (select count(*) as bookings from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_id=t.profile_id and e.status in ('confirmed','completed','no_show') and e.created_at>=now()-interval '30 days') b on true
    where (p_specialty is null or p_specialty=any(t.specialties))
    and not exists(select 1 from unnest(regexp_split_to_array(lower(trim(left(coalesce(p_query,''),200))),'\s+')) term
      where term<>'' and position(term in lower(concat_ws(' ',p.name,t.headline,array_to_string(t.specialties,' '),l.titles)))=0)
    and (p_price='all' or (p_price='low' and l.min_price<=20000) or (p_price='mid' and l.min_price>20000 and l.min_price<=40000) or (p_price='high' and l.min_price>40000))
    and (coalesce(cardinality(p_periods),0)=0 or exists(select 1 from (
      select start_time,end_time from public.teacher_availability where teacher_id=t.profile_id
      union all select (w->>'start')::time,(w->>'end')::time from public.teacher_lessons product cross join lateral jsonb_array_elements(product.availability) w where product.teacher_id=t.profile_id and product.is_published and product.scheduling_mode='request'
      union all select (session.scheduled_at at time zone 'Asia/Seoul')::time,((session.scheduled_at+make_interval(mins=>session.duration_minutes)) at time zone 'Asia/Seoul')::time from public.lesson_sessions session join public.teacher_lessons product on product.id=session.teacher_lesson_id where session.teacher_id=t.profile_id and product.is_published and product.scheduling_mode='fixed' and session.status='scheduled' and session.scheduled_at>now()
    ) a where (
      ('morning'=any(p_periods) and a.start_time<'12:00' and a.end_time>'06:00') or
      ('afternoon'=any(p_periods) and a.start_time<'18:00' and a.end_time>'12:00') or
      ('evening'=any(p_periods) and a.start_time<'24:00' and a.end_time>'18:00'))))
  ), page as (
    select * from cards order by case when p_sort='price' then "minPrice" end asc nulls last,
      case when p_sort='popular' then "recentBookings" end desc nulls last,"ratingAvg" desc,"ratingCount" desc,id
    limit greatest(1,least(coalesce(p_size,8),50)) offset (greatest(1,least(coalesce(p_page,1),100000))-1)*greatest(1,least(coalesce(p_size,8),50))
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from cards))
$$;

revoke all on function public.set_session_meeting(uuid,text),public.session_access(uuid),public.request_booking_action(uuid,text,text) from public,anon;
grant execute on function public.set_session_meeting(uuid,text),public.session_access(uuid),public.request_booking_action(uuid,text,text) to authenticated;
revoke all on function public.public_booking_counts(integer,uuid),public.search_teachers(text,text,text,text[],text,integer,integer) from public;
grant execute on function public.public_booking_counts(integer,uuid),public.search_teachers(text,text,text,text[],text,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
