begin;
alter table public.enrollments add column reservation_version uuid not null default gen_random_uuid();
create function public.rotate_reservation_version() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='pending_payment' and (old.status<>'pending_payment' or old.expires_at<=now()) then new.reservation_version:=gen_random_uuid(); end if;
  return new;
end $$;
create trigger enrollment_version before update on public.enrollments for each row execute function public.rotate_reservation_version();
revoke all on function public.rotate_reservation_version() from public,anon,authenticated;
create table public.checkout_orders (
  id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references public.enrollments(id),
  student_id uuid not null references public.profiles(id),amount integer not null check(amount>0),currency text not null check(currency='KRW'),
  user_coupon_id uuid references public.user_coupons(id),reservation_version uuid not null,
  status text not null default 'prepared' check(status in ('prepared','confirming','paid','refund_pending','refunded','needs_review','expired')),
  payment_key text unique check(length(payment_key)<=200),receipt_url text,refund_reason text,
  expires_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index checkout_active_enrollment_idx on public.checkout_orders(enrollment_id,reservation_version) where status not in ('expired','refunded');
create unique index checkout_coupon_hold_idx on public.checkout_orders(user_coupon_id) where status in ('prepared','confirming') and user_coupon_id is not null;
alter table public.checkout_orders enable row level security;
revoke all on public.checkout_orders from public,anon,authenticated;
grant select on public.checkout_orders to service_role;

create function public.prepare_checkout(p_enrollment uuid,p_coupon uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.enrollments; s public.lesson_sessions; o public.checkout_orders; c record; due integer;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select * into s from public.lesson_sessions where id=(select session_id from public.enrollments where id=p_enrollment and student_id=auth.uid());
  if not found then raise exception 'Reservation not found' using errcode='42501'; end if;
  perform 1 from public.profiles where id=s.teacher_id for update;
  select * into e from public.enrollments where id=p_enrollment and student_id=auth.uid() for update;
  if e.status<>'pending_payment' or e.expires_at<=now() or s.scheduled_at<=now() or s.status<>'scheduled' then raise exception 'Reservation expired'; end if;
  if not exists(select 1 from public.policy_acceptances where user_id=auth.uid() and version='2026-11-16') then raise exception 'Policy consent required' using errcode='42501'; end if;
  update public.checkout_orders set status='expired',updated_at=now() where enrollment_id=e.id and status='prepared' and expires_at<=now();
  select * into o from public.checkout_orders where enrollment_id=e.id and reservation_version=e.reservation_version and status not in ('expired','refunded') for update;
  if found then
    if o.status<>'prepared' or o.user_coupon_id is distinct from p_coupon then raise exception 'Checkout already exists; keep the original coupon or contact support'; end if;
    return jsonb_build_object('orderId',o.id,'amount',o.amount,'currency',o.currency,'enrollmentId',e.id,'orderName',s.title);
  end if;
  due:=e.reserved_price;
  if due is null or due<=0 or e.reserved_currency<>'KRW' then raise exception 'Paid checkout requires positive KRW amount'; end if;
  if p_coupon is not null then
    select uc.status as coupon_status,promo.* into c from public.user_coupons uc join public.coupons promo on promo.id=uc.coupon_id
      where uc.id=p_coupon and uc.user_id=auth.uid() for update of uc,promo;
    update public.checkout_orders set status='expired',updated_at=now() where user_coupon_id=p_coupon and status='prepared' and expires_at<=now();
    if c.id is null or c.coupon_status<>'available' or not c.is_active or (c.expires_at is not null and c.expires_at<=now()) or due<c.min_order_amount
      or c.discount_value<0 or (c.discount_type='percent' and c.discount_value>100) then raise exception 'Coupon unavailable'; end if;
    due:=greatest(0,due-case when c.discount_type='fixed' then c.discount_value else floor(due::numeric*c.discount_value/100)::integer end);
  end if;
  if due<=0 then raise exception 'Use free checkout for zero amount'; end if;
  insert into public.checkout_orders(enrollment_id,student_id,amount,currency,user_coupon_id,expires_at,reservation_version)
    values(e.id,auth.uid(),due,e.reserved_currency,p_coupon,e.expires_at,e.reservation_version) returning * into o;
  return jsonb_build_object('orderId',o.id,'amount',o.amount,'currency',o.currency,'enrollmentId',e.id,'orderName',s.title);
end $$;

create function public.my_checkout_order(p_order uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.checkout_orders;
begin
  select * into o from public.checkout_orders where id=p_order and student_id=auth.uid();
  if auth.uid() is null or not found then raise exception 'Order access denied' using errcode='42501'; end if;
  return to_jsonb(o)-'payment_key';
end $$;

create function public.begin_payment_confirmation(p_order uuid,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; e public.enrollments; s public.lesson_sessions;
begin
  select * into s from public.lesson_sessions where id=(select bk.session_id from public.enrollments bk join public.checkout_orders qo on qo.enrollment_id=bk.id where qo.id=p_order);
  perform 1 from public.profiles where id=s.teacher_id for update;
  select * into o from public.checkout_orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  select * into e from public.enrollments where id=o.enrollment_id for update;
  if length(p_key) not between 1 and 200 or (o.payment_key is not null and o.payment_key<>p_key) then raise exception 'Payment key mismatch'; end if;
  if o.status='paid' then return to_jsonb(o); end if;
  if o.status not in ('prepared','confirming') or (o.status='prepared' and (o.expires_at<=now() or e.expires_at<=now()))
    or e.status<>'pending_payment' or e.reservation_version<>o.reservation_version or s.scheduled_at<=now() or s.status<>'scheduled' then raise exception 'Reservation expired'; end if;
  update public.checkout_orders set status='confirming',payment_key=p_key,updated_at=now() where id=o.id returning * into o;
  update public.enrollments set expires_at=least(s.scheduled_at,greatest(expires_at,now()+interval '30 minutes')) where id=e.id;
  return to_jsonb(o);
end $$;

create function public.record_provider_payment(p_order uuid,p_payment jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; e public.enrollments; s public.lesson_sessions; p public.payments; provider_status text; can_confirm boolean;
begin
  perform pg_advisory_xact_lock(1313001);
  select * into s from public.lesson_sessions where id=(select bk.session_id from public.enrollments bk join public.checkout_orders qo on qo.enrollment_id=bk.id where qo.id=p_order);
  perform 1 from public.profiles where id=s.teacher_id for update;
  select * into o from public.checkout_orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  select * into e from public.enrollments where id=o.enrollment_id for update;
  if p_payment->>'orderId'<>o.id::text or p_payment->>'currency'<>o.currency or (p_payment->>'totalAmount')::integer<>o.amount
    or p_payment->>'paymentKey' is null or length(p_payment->>'paymentKey')>200 or (o.payment_key is not null and o.payment_key<>p_payment->>'paymentKey') then raise exception 'Provider payment mismatch'; end if;
  provider_status:=p_payment->>'status';
  select * into p from public.payments where pg_transaction_id=p_payment->>'paymentKey' and verified_payment for update;
  if provider_status='DONE' then
    -- Late/out-of-order DONE events never resurrect a refunded order.
    if o.status='refunded' then return jsonb_build_object('status','refunded'); end if;
    if o.status in ('paid','refund_pending','needs_review') and p.id is not null then return jsonb_build_object('status',o.status); end if;
    can_confirm:=e.status='pending_payment' and e.expires_at>now() and s.status='scheduled' and s.scheduled_at>now()
      and o.reservation_version=e.reservation_version and (o.status='confirming' or (o.status='prepared' and o.expires_at>now()))
      and (select count(*) from public.enrollments where session_id=s.id and status in ('confirmed','completed'))<s.capacity;
    if p.id is null then
      insert into public.payments(enrollment_id,student_id,amount,currency,method,status,user_coupon_id,pg_transaction_id,verified_payment)
      values(e.id,o.student_id,o.amount,o.currency,'card',case when can_confirm then 'succeeded'::public.payment_status else 'pending'::public.payment_status end,o.user_coupon_id,p_payment->>'paymentKey',true);
    end if;
    if can_confirm then update public.enrollments set status='confirmed',expires_at=null where id=e.id; end if;
    if o.user_coupon_id is not null then update public.user_coupons set status='used',used_at=now() where id=o.user_coupon_id; end if;
    update public.checkout_orders set status=case when can_confirm then 'paid' else 'refund_pending' end,payment_key=p_payment->>'paymentKey',
      refund_reason=case when can_confirm then null else '예약 만료 후 승인된 결제 자동 취소' end,receipt_url=p_payment#>>'{receipt,url}',updated_at=now() where id=o.id;
    return jsonb_build_object('status',case when can_confirm then 'paid' else 'refund_pending' end,'enrollmentId',e.id);
  elsif provider_status='CANCELED' and (p_payment->>'balanceAmount')::integer=0 then
    if o.status='refunded' then return jsonb_build_object('status','refunded'); end if;
    -- Lock the teacher before checking allocations, as settlement/payout RPCs do.
    if p.id is not null and exists(select 1 from public.settlement_payment_items where payment_id=p.id) then
      update public.checkout_orders set status='needs_review',updated_at=now() where id=o.id;
      return jsonb_build_object('status','needs_review');
    end if;
    update public.payments set status='refunded' where pg_transaction_id=p_payment->>'paymentKey' and verified_payment;
    update public.enrollments set status='cancelled',expires_at=null where id=e.id and reservation_version=o.reservation_version;
    -- Coupon is not reissued automatically; the merchant policy decides restoration.
    update public.checkout_orders set status='refunded',payment_key=p_payment->>'paymentKey',updated_at=now() where id=o.id;
    return jsonb_build_object('status','refunded');
  elsif provider_status='PARTIAL_CANCELED' then
    update public.checkout_orders set status='needs_review',updated_at=now() where id=o.id;
    return jsonb_build_object('status','needs_review');
  end if;
  return jsonb_build_object('status',o.status);
end $$;

create function public.admin_prepare_refund(p_order uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders;
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(1313001);
  if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA verification required' using errcode='42501'; end if;
  if length(trim(p_reason)) not between 3 and 200 then raise exception 'Reason required'; end if;
  perform 1 from public.profiles where id=(select ls.teacher_id from public.checkout_orders qo join public.enrollments bk on bk.id=qo.enrollment_id join public.lesson_sessions ls on ls.id=bk.session_id where qo.id=p_order) for update;
  select * into o from public.checkout_orders where id=p_order for update;
  if not found or o.status not in ('paid','refund_pending') then raise exception 'Order is not refundable'; end if;
  if exists(select 1 from public.payments p join public.settlement_payment_items i on i.payment_id=p.id where p.pg_transaction_id=o.payment_key) then raise exception 'Settlement reversal required before refund'; end if;
  update public.checkout_orders set status='refund_pending',refund_reason=trim(p_reason),updated_at=now() where id=o.id;
  -- Block settlement while a remote refund is in flight; verified receipt is kept.
  update public.enrollments set status='cancelled',expires_at=null where id=o.enrollment_id;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),'prepare_refund',p_order,trim(p_reason),to_jsonb(o),jsonb_build_object('status','refund_pending'));
end $$;

create function public.guard_coupon_checkout_hold() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' and new.status='used' and old.status<>'used' and exists(select 1 from public.checkout_orders where user_coupon_id=new.id and (status='confirming' or (status='prepared' and expires_at>now()))) then raise exception 'Coupon reserved by a checkout'; end if;
  return new;
end $$;
create trigger coupon_checkout_hold before update on public.user_coupons for each row execute function public.guard_coupon_checkout_hold();
revoke all on function public.guard_coupon_checkout_hold() from public,anon,authenticated;
revoke all on function public.prepare_checkout(uuid,uuid),public.my_checkout_order(uuid),public.admin_prepare_refund(uuid,text) from public,anon;
grant execute on function public.prepare_checkout(uuid,uuid),public.my_checkout_order(uuid),public.admin_prepare_refund(uuid,text) to authenticated;
revoke all on function public.begin_payment_confirmation(uuid,text),public.record_provider_payment(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.begin_payment_confirmation(uuid,text),public.record_provider_payment(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
