begin;

-- New mobile reminders should not silently subscribe teachers to extra email.
alter table public.notifications add column email_enabled boolean not null default true;

create table public.mobile_push_devices (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_token text not null unique check(expo_token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'),
  project_id uuid not null,
  platform text not null check(platform in ('android','ios')),
  app_version text not null check(length(app_version) between 1 and 40),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index mobile_push_devices_user_idx on public.mobile_push_devices(user_id) where active;
create table public.mobile_push_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  chat_message boolean not null default true,
  booking_status boolean not null default true,
  lesson_reminder boolean not null default true,
  payment boolean not null default true,
  settlement boolean not null default true,
  quiet_start integer check(quiet_start between 0 and 1439),
  quiet_end integer check(quiet_end between 0 and 1439),
  time_zone text not null default 'Asia/Seoul',
  check((quiet_start is null and quiet_end is null) or (quiet_start is not null and quiet_end is not null and quiet_start<>quiet_end))
);
create table public.mobile_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.mobile_push_devices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','sending','accepted','provider_accepted','failed','skipped','uncertain')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  ticket_id text,
  receipt_after timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique(notification_id,device_id)
);
create index mobile_push_pending_idx on public.mobile_push_deliveries(next_attempt_at) where status in ('pending','failed');
alter table public.mobile_push_devices enable row level security;
alter table public.mobile_push_settings enable row level security;
alter table public.mobile_push_deliveries enable row level security;
revoke all on public.mobile_push_devices,public.mobile_push_settings,public.mobile_push_deliveries from public,anon,authenticated;
grant select,update on public.mobile_push_devices,public.mobile_push_deliveries to service_role;
grant select,insert,update on public.mobile_push_settings to authenticated;
create policy own_mobile_push_settings on public.mobile_push_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create function public.validate_mobile_push_settings() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.time_zone) then raise exception 'Invalid timezone'; end if;
  return new;
end $$;
create trigger mobile_settings_validate before insert or update on public.mobile_push_settings for each row execute function public.validate_mobile_push_settings();

create function public.register_mobile_push_device(p_device uuid,p_token text,p_project uuid,p_platform text,p_version text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.account_is_active(auth.uid()) then raise exception 'Active account required' using errcode='42501'; end if;
  if p_device is null or p_project is null or p_token is null or length(p_token)>250 or p_platform not in ('android','ios') then raise exception 'Invalid device'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token,0));
  -- Possession of a device token allows it to be rebound on an account switch.
  -- Old pending deliveries are removed, never transferred to the new account.
  delete from public.mobile_push_devices where expo_token=p_token and id<>p_device;
  delete from public.mobile_push_devices where id=p_device and user_id<>auth.uid();
  if (select count(*) from public.mobile_push_devices where user_id=auth.uid() and active and id<>p_device)>=10 then raise exception 'Device limit reached'; end if;
  insert into public.mobile_push_devices(id,user_id,expo_token,project_id,platform,app_version)
    values(p_device,auth.uid(),p_token,p_project,p_platform,p_version)
    on conflict(id) do update set expo_token=excluded.expo_token,project_id=excluded.project_id,platform=excluded.platform,app_version=excluded.app_version,active=true,updated_at=now();
  insert into public.mobile_push_settings(user_id) values(auth.uid()) on conflict do nothing;
end $$;

create function public.unregister_mobile_push_device(p_device uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  update public.mobile_push_devices set active=false,updated_at=now() where id=p_device and user_id=auth.uid();
  update public.mobile_push_deliveries set status='skipped',lease_until=null where device_id=p_device and user_id=auth.uid() and status in ('pending','failed','sending');
end $$;

create function public.enqueue_mobile_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.mobile_push_deliveries(notification_id,device_id,user_id)
    select new.id,d.id,new.user_id from public.mobile_push_devices d left join public.mobile_push_settings s on s.user_id=d.user_id
    where d.user_id=new.user_id and d.active and d.updated_at>now()-interval '30 days'
      and coalesce(s.enabled,true) and coalesce((to_jsonb(s)->>new.type::text)::boolean,true)
    on conflict do nothing;
  return new;
end $$;
create trigger notifications_mobile_push after insert on public.notifications for each row execute function public.enqueue_mobile_push();

create function public.claim_mobile_push(p_limit integer default 20,p_notification uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  -- Expo has no request idempotency key. An expired, uncertain send is not
  -- automatically repeated: leave it for inspection instead of duplicating it.
  update public.mobile_push_deliveries set status='uncertain',error_code='LeaseExpired',lease_until=null where status='sending' and lease_until<=now();
  update public.mobile_push_deliveries q set status='skipped',error_code='InactiveOrExpired' from public.mobile_push_devices d,public.notifications n
    where q.device_id=d.id and q.notification_id=n.id and q.status in ('pending','failed') and
      (not d.active or d.user_id<>q.user_id or d.updated_at<now()-interval '30 days' or not public.account_is_active(q.user_id)
       or q.created_at<now()-interval '24 hours' or (n.type='lesson_reminder' and q.created_at<now()-interval '15 minutes')
       or exists(select 1 from public.mobile_push_settings s where s.user_id=q.user_id and (not s.enabled or not coalesce((to_jsonb(s)->>n.type::text)::boolean,true)))
       or exists(select 1 from public.notification_preferences p where p.user_id=q.user_id and ((n.type='chat_message' and not p.chat_message) or (n.type='lesson_reminder' and not p.lesson_start))));
  with picked as (
    select q.id from public.mobile_push_deliveries q join public.notifications n on n.id=q.notification_id
      left join public.mobile_push_settings s on s.user_id=q.user_id
    where q.status in ('pending','failed') and q.attempts<5 and q.next_attempt_at<=now()
      and (p_notification is null or q.notification_id=p_notification)
      and (s.quiet_start is null or not (
        case when s.quiet_start<s.quiet_end then
          extract(hour from now() at time zone s.time_zone)*60+extract(minute from now() at time zone s.time_zone)>=s.quiet_start
          and extract(hour from now() at time zone s.time_zone)*60+extract(minute from now() at time zone s.time_zone)<s.quiet_end
        else extract(hour from now() at time zone s.time_zone)*60+extract(minute from now() at time zone s.time_zone)>=s.quiet_start
          or extract(hour from now() at time zone s.time_zone)*60+extract(minute from now() at time zone s.time_zone)<s.quiet_end end))
    order by q.next_attempt_at,q.id for update of q skip locked limit greatest(1,least(coalesce(p_limit,20),50))
  ), changed as (update public.mobile_push_deliveries q set status='sending',attempts=q.attempts+1,lease_until=now()+interval '2 minutes' from picked where q.id=picked.id returning q.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'notificationId',q.notification_id,'deviceId',q.device_id,'userId',q.user_id,'attempts',q.attempts,
    'token',d.expo_token,'projectId',d.project_id,'kind',n.type,'linkUrl',n.link_url)),'[]'::jsonb) into result
    from changed q join public.mobile_push_devices d on d.id=q.device_id join public.notifications n on n.id=q.notification_id;
  return result;
end $$;

create function public.request_mobile_push_test(p_device uuid,p_kind text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.mobile_push_devices where id=p_device and user_id=auth.uid() and active) then raise exception 'Registered own device required' using errcode='42501'; end if;
  if p_kind not in ('chat_message','booking_status') then raise exception 'Invalid test kind'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  if (select count(*) from public.notifications where user_id=auth.uid() and title like '[푸시 테스트]%' and created_at>now()-interval '1 hour')>=10 then raise exception 'Test rate limit'; end if;
  insert into public.notifications(user_id,type,title,body,link_url,email_enabled)
    values(auth.uid(),p_kind::public.notification_type,'[푸시 테스트] '||case p_kind when 'chat_message' then '채팅 알림' else '수업 신청 알림' end,
      '실제 메시지나 예약을 만들지 않는 알림 수신 테스트입니다.',case p_kind when 'chat_message' then '/teacher/chat' else '/teacher/lessons' end,false) returning id into result;
  delete from public.mobile_push_deliveries where notification_id=result and device_id<>p_device;
  return result;
end $$;

create or replace function public.enqueue_notification_email() returns trigger language plpgsql security definer set search_path='' as $$
declare address text;
begin
  if not new.email_enabled or new.title like '[푸시 테스트]%' or new.type not in ('lesson_reminder','booking_status','payment','settlement') then return new; end if;
  select email into address from auth.users where id=new.user_id;
  if address is not null then insert into public.delivery_outbox(notification_id,recipient,subject,body,link_url,notification_kind) values(new.id,address,new.title,coalesce(new.body,''),new.link_url,new.type) on conflict do nothing; end if;
  return new;
end $$;

create function public.my_mobile_push_diagnostics(p_device uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select q.status,q.error_code as "errorCode",q.created_at as "createdAt" from public.mobile_push_deliveries q
    where q.user_id=auth.uid() and q.device_id=p_device order by q.created_at desc,q.id desc limit 10
  )r);
end $$;

create function public.notify_teacher_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.lesson_sessions;
begin
  if tg_op='UPDATE' and new.status=old.status then return new; end if;
  if new.status not in ('pending_payment','confirmed') then return new; end if;
  select * into s from public.lesson_sessions where id=new.session_id;
  insert into public.notifications(user_id,type,title,body,link_url,email_enabled) values(s.teacher_id,'booking_status',
    case new.status when 'confirmed' then '수업 예약이 확정되었습니다' else '새 수업 신청이 도착했습니다' end,
    case new.status when 'confirmed' then s.title else s.title||' · 결제 대기 중이며 아직 확정되지 않았습니다.' end,
    '/teacher/lessons/attendance?session='||s.id::text,false);
  return new;
end $$;
create trigger teacher_booking_notify after insert or update of status on public.enrollments for each row execute function public.notify_teacher_booking();

create table public.mobile_teacher_reminders (
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  kind text not null check(kind in ('start','meeting','attendance')),
  scheduled_at timestamptz not null,
  primary key(session_id,kind,scheduled_at)
);
alter table public.mobile_teacher_reminders enable row level security;
revoke all on public.mobile_teacher_reminders from public,anon,authenticated;
create function public.enqueue_teacher_mobile_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare r record; queued integer:=0;
begin
  for r in with candidates as (
    select s.id,s.scheduled_at,'start'::text kind from public.lesson_sessions s where s.status='scheduled' and s.scheduled_at between now() and now()+interval '15 minutes'
    union all
    select s.id,s.scheduled_at,'meeting' from public.lesson_sessions s where s.status='scheduled' and s.scheduled_at between now() and now()+interval '24 hours' and not exists(select 1 from public.session_meetings m where m.session_id=s.id)
    union all
    select s.id,s.scheduled_at,'attendance' from public.lesson_sessions s where s.status<>'cancelled' and s.scheduled_at>now()-interval '7 days' and s.scheduled_at+make_interval(mins=>s.duration_minutes)+interval '30 minutes'<now() and exists(select 1 from public.enrollments e where e.session_id=s.id and e.status='confirmed')
  ), picked as (
    select c.* from candidates c where not exists(select 1 from public.mobile_teacher_reminders m where m.session_id=c.id and m.kind=c.kind and m.scheduled_at=c.scheduled_at)
      and exists(select 1 from public.lesson_sessions s join public.mobile_push_devices d on d.user_id=s.teacher_id where s.id=c.id and d.active and d.updated_at>now()-interval '30 days')
    order by c.scheduled_at,c.id,c.kind limit 100
  ) insert into public.mobile_teacher_reminders(session_id,kind,scheduled_at) select id,kind,scheduled_at from picked on conflict do nothing returning *
  loop
    insert into public.notifications(user_id,type,title,body,link_url,email_enabled)
      select s.teacher_id,case when r.kind='start' then 'lesson_reminder'::public.notification_type else 'booking_status'::public.notification_type end,
        case r.kind when 'start' then '곧 수업이 시작됩니다' when 'meeting' then '수업 링크를 등록해주세요' else '수업 출석을 확정해주세요' end,
        s.title,case when r.kind='attendance' then '/teacher/lessons/attendance?session='||s.id::text else '/sessions/'||s.id::text end,false
      from public.lesson_sessions s where s.id=r.session_id and public.account_is_active(s.teacher_id);
    queued:=queued+1;
  end loop;
  return queued;
end $$;

create function public.my_mobile_bookings(p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select e.id,e.status,e.session_id as "sessionId",s.title,s.scheduled_at as "scheduledAt",s.duration_minutes as "durationMinutes",p.name as "studentName"
    from public.enrollments e join public.lesson_sessions s on s.id=e.session_id join public.profiles p on p.id=e.student_id
    where s.teacher_id=auth.uid() order by e.created_at desc,e.id desc limit 20 offset (greatest(1,least(coalesce(p_page,1),100000))-1)*20
  )r);
end $$;

revoke all on function public.validate_mobile_push_settings(),public.enqueue_mobile_push(),public.notify_teacher_booking() from public,anon,authenticated;
revoke all on function public.my_mobile_push_diagnostics(uuid) from public,anon;
grant execute on function public.my_mobile_push_diagnostics(uuid) to authenticated;
revoke all on function public.register_mobile_push_device(uuid,text,uuid,text,text),public.unregister_mobile_push_device(uuid),public.request_mobile_push_test(uuid,text),public.my_mobile_bookings(integer) from public,anon;
grant execute on function public.register_mobile_push_device(uuid,text,uuid,text,text),public.unregister_mobile_push_device(uuid),public.request_mobile_push_test(uuid,text),public.my_mobile_bookings(integer) to authenticated;
revoke all on function public.claim_mobile_push(integer,uuid) from public,anon,authenticated;
grant execute on function public.claim_mobile_push(integer,uuid) to service_role;
revoke all on function public.enqueue_teacher_mobile_reminders() from public,anon,authenticated;
grant execute on function public.enqueue_teacher_mobile_reminders() to service_role;
notify pgrst,'reload schema';
commit;
