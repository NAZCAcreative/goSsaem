begin;
alter table public.checkout_orders add column payment_environment text not null default 'live' check(payment_environment in ('live','test'));
alter table public.payments add column payment_environment text not null default 'live' check(payment_environment in ('live','test'));

-- Keep the existing live RPC and its consent requirement. A separate sandbox
-- RPC scopes the exception to a transaction and permanently labels its order.
do $$ declare definition text; begin
  select pg_get_functiondef('public.prepare_checkout(uuid,uuid)'::regprocedure) into definition;
  definition:=replace(definition,
    'if not exists(select 1 from public.policy_acceptances',
    'if current_setting(''vora.checkout_mode'',true) is distinct from ''test'' and not exists(select 1 from public.policy_acceptances');
  definition:=replace(definition, 'if found then',
    'if found then
      if o.payment_environment<>(case when current_setting(''vora.checkout_mode'',true)=''test'' then ''test'' else ''live'' end) then raise exception ''Checkout environment mismatch''; end if;');
  definition:=replace(definition,
    'expires_at,reservation_version)', 'expires_at,reservation_version,payment_environment)');
  definition:=replace(definition,
    'p_coupon,e.expires_at,e.reservation_version)',
    'p_coupon,e.expires_at,e.reservation_version,case when current_setting(''vora.checkout_mode'',true)=''test'' then ''test'' else ''live'' end)');
  definition:=replace(definition, '''orderName'',s.title)', '''orderName'',s.title,''mode'',o.payment_environment)');
  execute definition;
end $$;
create function public.prepare_test_checkout(p_enrollment uuid,p_coupon uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; previous text:=current_setting('vora.checkout_mode',true);
begin
  perform set_config('vora.checkout_mode','test',true);
  result:=public.prepare_checkout(p_enrollment,p_coupon);
  perform set_config('vora.checkout_mode',coalesce(previous,''),true);
  return result;
end $$;
revoke all on function public.prepare_test_checkout(uuid,uuid) from public,anon;
grant execute on function public.prepare_test_checkout(uuid,uuid) to authenticated;

-- The provider key is bound to the order before this insert. The caller cannot
-- turn a sandbox receipt into real money by changing a client-side flag.
create function public.label_payment_environment() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.payment_environment<>old.payment_environment then raise exception 'Payment environment is immutable' using errcode='42501'; end if;
  else
    select coalesce((select o.payment_environment from public.checkout_orders o where o.payment_key=new.pg_transaction_id),new.payment_environment) into new.payment_environment;
  end if;
  return new;
end $$;
create trigger payment_environment_guard before insert or update on public.payments for each row execute function public.label_payment_environment();
revoke all on function public.label_payment_environment() from public,anon,authenticated;

-- A verified webhook may arrive before the confirmation endpoint binds a key.
-- Label the receipt directly from the locked order in that path as well.
do $$ declare definition text; begin
  select pg_get_functiondef('public.record_provider_payment(uuid,jsonb)'::regprocedure) into definition;
  definition:=replace(definition,'pg_transaction_id,verified_payment)', 'pg_transaction_id,verified_payment,payment_environment)');
  definition:=replace(definition,'o.user_coupon_id,p_payment->>''paymentKey'',true)', 'o.user_coupon_id,p_payment->>''paymentKey'',true,o.payment_environment)');
  execute definition;
end $$;

-- Tests can exercise bookings, attendance and refunds, but never create a
-- spendable teacher balance. Protect both the aggregate and allocation paths.
do $$ declare definition text; begin
  select pg_get_functiondef('public.run_weekly_settlement(date,date)'::regprocedure) into definition;
  definition:=replace(definition,'where p.verified_payment and p.status=',
    'where p.payment_environment=''live'' and p.verified_payment and p.status=');
  execute definition;
end $$;
do $$ declare definition text; begin
  select pg_get_functiondef('public.admin_dashboard()'::regprocedure) into definition;
  definition:=replace(definition,'from public.payments where verified_payment group by currency', 'from public.payments where verified_payment and payment_environment=''live'' group by currency');
  execute definition;
  select pg_get_functiondef('public.admin_list(text,integer,integer,text,text,date,date,uuid)'::regprocedure) into definition;
  definition:=replace(definition,'pay.verified_payment,pay.created_at', 'pay.verified_payment,pay.payment_environment,pay.created_at');
  execute definition;
end $$;
create function public.guard_real_settlement_payment() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.payments where id=new.payment_id and payment_environment='test') then raise exception 'Test payments cannot be settled' using errcode='42501'; end if;
  return new;
end $$;
create trigger settlement_live_payments before insert or update on public.settlement_payment_items for each row execute function public.guard_real_settlement_payment();
revoke all on function public.guard_real_settlement_payment() from public,anon,authenticated;

do $$ declare definition text; begin
  select pg_get_functiondef('public.my_payment_detail(uuid)'::regprocedure) into definition;
  definition:=replace(definition, '''verified'',p.verified_payment,', '''verified'',p.verified_payment,''mode'',p.payment_environment,');
  execute definition;
end $$;
notify pgrst,'reload schema';
commit;
