begin;
create table public.delivery_outbox (
  id uuid primary key default gen_random_uuid(),notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient text not null,subject text not null,body text not null,link_url text,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped')),
  notification_kind public.notification_type not null,first_attempt_at timestamptz,
  attempts integer not null default 0,next_attempt_at timestamptz not null default now(),lease_until timestamptz,
  sent_at timestamptz,created_at timestamptz not null default now()
);
alter table public.delivery_outbox enable row level security;
revoke all on public.delivery_outbox from public,anon,authenticated;
grant select,update on public.delivery_outbox to service_role;
create function public.enqueue_notification_email() returns trigger language plpgsql security definer set search_path='' as $$
declare address text;
begin
  if new.type not in ('lesson_reminder','booking_status','payment','settlement') then return new; end if;
  select email into address from auth.users where id=new.user_id;
  if address is not null then insert into public.delivery_outbox(notification_id,recipient,subject,body,link_url,notification_kind) values(new.id,address,new.title,coalesce(new.body,''),new.link_url,new.type) on conflict do nothing; end if;
  return new;
end $$;
create trigger notification_email_outbox after insert on public.notifications for each row execute function public.enqueue_notification_email();
revoke all on function public.enqueue_notification_email() from public,anon,authenticated;
create function public.claim_notification_emails(p_limit integer default 20) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  -- Do not resend uncertain deliveries outside the provider's 24-hour
  -- idempotency window; an operator must inspect them instead.
  update public.delivery_outbox set status='failed',attempts=8,lease_until=null where status not in ('sent','skipped') and first_attempt_at<now()-interval '23 hours';
  update public.delivery_outbox set status='skipped',lease_until=null where status in ('pending','failed') and notification_kind='lesson_reminder' and created_at<now()-interval '15 minutes';
  with picked as (select id from public.delivery_outbox where ((status in ('pending','failed') and next_attempt_at<=now()) or (status='sending' and lease_until<=now())) and attempts<8 order by next_attempt_at,id for update skip locked limit greatest(1,least(p_limit,50))),
    changed as (update public.delivery_outbox d set status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '5 minutes' from picked where d.id=picked.id returning d.*)
    select coalesce(jsonb_agg(to_jsonb(changed)),'[]') into result from changed;
  return result;
end $$;
revoke all on function public.claim_notification_emails(integer) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(integer) to service_role;

create function public.notify_checkout_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status=old.status then return new; end if;
  if new.status in ('refunded','refund_pending','needs_review') then
    insert into public.notifications(user_id,type,title,body,link_url) values(new.student_id,'payment',
      case new.status when 'paid' then '결제와 예약이 확정되었습니다' when 'refunded' then '결제가 취소되었습니다' else '결제 처리 상태를 확인해주세요' end,
      new.amount::text||' '||new.currency,'/student/bookings/'||new.enrollment_id::text);
  end if;
  return new;
end $$;
create trigger checkout_status_notification after update on public.checkout_orders for each row execute function public.notify_checkout_status();
revoke all on function public.notify_checkout_status() from public,anon,authenticated;

create function public.admin_checkout_orders(p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  return jsonb_build_object('orders',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
    select o.id,o.enrollment_id,o.student_id,o.amount,o.currency,o.status,o.refund_reason,o.created_at,o.updated_at,p.name
    from public.checkout_orders o join public.profiles p on p.id=o.student_id order by o.created_at desc,o.id limit 20 offset (greatest(1,p_page)-1)*20) r),
    'mailPending',(select count(*) from public.delivery_outbox where status not in ('sent','skipped')),
    'mailFailed',(select count(*) from public.delivery_outbox where attempts>=8 and status not in ('sent','skipped')),
    'paymentReview',(select count(*) from public.checkout_orders where status in ('needs_review','refund_pending') or (status='confirming' and updated_at<now()-interval '10 minutes')),
    'demoTeachers',(select count(*) from public.teacher_launch_flags where is_demo));
end $$;
revoke all on function public.admin_checkout_orders(integer) from public,anon;
grant execute on function public.admin_checkout_orders(integer) to authenticated;

-- Freeze new payouts when a remote refund needs manual settlement reversal.
alter function public.request_withdrawal(integer,uuid) rename to request_withdrawal_base;
create function public.request_withdrawal(p_amount integer,p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.profiles where id=auth.uid() for update;
  if exists(select 1 from public.checkout_orders o join public.enrollments e on e.id=o.enrollment_id join public.lesson_sessions s on s.id=e.session_id where s.teacher_id=auth.uid() and o.status='needs_review') then raise exception 'Payment reconciliation required before withdrawal'; end if;
  return public.request_withdrawal_base(p_amount,p_request_id);
end $$;
revoke all on function public.request_withdrawal_base(integer,uuid) from public,anon,authenticated;
revoke all on function public.request_withdrawal(integer,uuid) from public,anon;
grant execute on function public.request_withdrawal(integer,uuid) to authenticated;
grant execute on function public.maintain_reservations() to service_role;
notify pgrst,'reload schema';
commit;
