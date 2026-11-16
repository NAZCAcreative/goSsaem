begin;
create table public.account_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  time_zone text not null default 'Asia/Seoul',updated_at timestamptz not null default now()
);
create table public.policy_acceptances (
  user_id uuid not null references public.profiles(id),version text not null,
  accepted_at timestamptz not null default now(),primary key(user_id,version)
);
create table public.account_closure_requests (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
  reason text not null check(length(trim(reason)) between 10 and 2000),
  status text not null default 'requested' check(status in ('requested','processing','resolved','rejected')),
  response text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index account_closure_open_idx on public.account_closure_requests(user_id) where status in ('requested','processing');
alter table public.account_preferences enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.account_closure_requests enable row level security;
revoke all on public.account_preferences,public.policy_acceptances,public.account_closure_requests from public,anon,authenticated;
grant select on public.account_preferences,public.policy_acceptances,public.account_closure_requests to authenticated;
create policy account_preferences_own on public.account_preferences for select using(user_id=auth.uid());
create policy policy_acceptances_own on public.policy_acceptances for select using(user_id=auth.uid());
create policy account_closure_own on public.account_closure_requests for select using(user_id=auth.uid() or public.admin_is_authorized());
create function public.save_account_preferences(p_time_zone text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then raise exception 'Invalid timezone'; end if;
  insert into public.account_preferences(user_id,time_zone) values(auth.uid(),p_time_zone)
  on conflict(user_id) do update set time_zone=excluded.time_zone,updated_at=now();
end $$;
create function public.accept_service_policies(p_version text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  if p_version<>'2026-11-16' then raise exception 'Policy version mismatch'; end if;
  insert into public.policy_acceptances(user_id,version) values(auth.uid(),p_version) on conflict do nothing;
end $$;
create function public.request_account_closure(p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  select id into result from public.account_closure_requests where user_id=auth.uid() and status in ('requested','processing');
  if result is not null then return result; end if;
  insert into public.account_closure_requests(user_id,reason) values(auth.uid(),trim(p_reason)) returning id into result;
  return result;
end $$;

-- Operator review is separate from financial execution. A resolved ticket is
-- never used as proof that money was returned or sent.
create function public.admin_operations(p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  return jsonb_build_object('bookings',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
    select b.*,p.name from public.booking_requests b join public.profiles p on p.id=b.requester_id order by b.created_at desc,b.id limit 20 offset (greatest(1,p_page)-1)*20) r),
    'closures',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select c.*,p.name from public.account_closure_requests c join public.profiles p on p.id=c.user_id order by c.created_at desc,c.id limit 20 offset (greatest(1,p_page)-1)*20) r),
    'withdrawals',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select w.*,p.name from public.withdrawal_requests w join public.profiles p on p.id=w.teacher_id order by w.requested_at desc,w.id limit 20 offset (greatest(1,p_page)-1)*20) r));
end $$;
create function public.admin_review_request(p_id uuid,p_type text,p_status text,p_response text) returns void language plpgsql security definer set search_path='' as $$
declare before_row jsonb;
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_status not in ('processing','resolved','rejected') or length(trim(p_response)) not between 3 and 2000 then raise exception 'Response required'; end if;
  if p_type='booking' then
    select to_jsonb(b) into before_row from public.booking_requests b where id=p_id for update;
    if before_row is null or before_row->>'status' in ('resolved','rejected') then raise exception 'Request closed'; end if;
    update public.booking_requests set status=p_status,response=trim(p_response),updated_at=now() where id=p_id;
  elsif p_type='closure' then
    select to_jsonb(c) into before_row from public.account_closure_requests c where id=p_id for update;
    if before_row is null or before_row->>'status' in ('resolved','rejected') then raise exception 'Request closed'; end if;
    -- Actual erasure must follow a reviewed retention process; do not pretend to erase.
    if p_status='resolved' then raise exception 'Complete retention and identity erasure procedure before closure'; end if;
    update public.account_closure_requests set status=p_status,response=trim(p_response),updated_at=now() where id=p_id;
  else raise exception 'Invalid request type'; end if;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),'review_'||p_type,p_id,trim(p_response),before_row,jsonb_build_object('status',p_status));
end $$;
alter table public.withdrawal_requests add column payout_reference text;
create unique index withdrawal_payout_reference_idx on public.withdrawal_requests(payout_reference) where status='completed' and payout_reference is not null;
create function public.admin_record_payout(p_id uuid,p_status text,p_reference text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare w public.withdrawal_requests;
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_status not in ('processing','completed','rejected') or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Invalid payout action'; end if;
  if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA verification required' using errcode='42501'; end if;
  if p_status='completed' and length(trim(coalesce(p_reference,''))) not between 5 and 200 then raise exception 'Bank transaction reference required'; end if;
  perform 1 from public.profiles where id=(select teacher_id from public.withdrawal_requests where id=p_id) for update;
  select * into w from public.withdrawal_requests where id=p_id for update;
  if not found or w.status not in ('requested','processing') or (p_status='completed' and w.status<>'processing') then raise exception 'Invalid payout transition'; end if;
  if p_status='completed' and exists(select 1 from public.checkout_orders qo join public.enrollments bk on bk.id=qo.enrollment_id join public.lesson_sessions ls on ls.id=bk.session_id where ls.teacher_id=w.teacher_id and qo.status='needs_review') then raise exception 'Payment reconciliation required before payout'; end if;
  update public.withdrawal_requests set status=p_status::public.withdrawal_status,payout_reference=case when p_status='completed' then trim(p_reference) else null end,processed_at=case when p_status in ('completed','rejected') then now() else null end where id=p_id;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),'record_payout',p_id,trim(p_reason),to_jsonb(w),jsonb_build_object('status',p_status,'reference',p_reference));
  insert into public.notifications(user_id,type,title,body,link_url) values(w.teacher_id,'settlement','출금 처리 상태가 변경되었습니다',p_reason,'/teacher/profile/withdraw');
end $$;
revoke all on function public.save_account_preferences(text),public.accept_service_policies(text),public.request_account_closure(text),public.admin_operations(integer),public.admin_review_request(uuid,text,text,text),public.admin_record_payout(uuid,text,text,text) from public,anon;
grant execute on function public.save_account_preferences(text),public.accept_service_policies(text),public.request_account_closure(text),public.admin_operations(integer),public.admin_review_request(uuid,text,text,text),public.admin_record_payout(uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
