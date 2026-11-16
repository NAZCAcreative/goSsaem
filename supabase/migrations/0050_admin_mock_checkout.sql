begin;
create function public.admin_mock_checkout(p_enrollment uuid,p_coupon uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.enrollments; o public.checkout_orders; draft jsonb; result jsonb;
begin
  if auth.uid() is null or not public.admin_is_authorized() or not public.account_is_active(auth.uid()) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into e from public.enrollments where id=p_enrollment and student_id=auth.uid();
  if not found then raise exception 'Own reservation required' using errcode='42501'; end if;
  perform 1 from public.profiles where id=(select teacher_id from public.lesson_sessions where id=e.session_id) for update;
  select * into o from public.checkout_orders where enrollment_id=e.id and reservation_version=e.reservation_version and status='paid' and payment_environment='test' and payment_key='mock_'||id::text;
  if found then return jsonb_build_object('status','paid','enrollmentId',e.id,'mode','mock'); end if;
  draft:=public.prepare_test_checkout(e.id,p_coupon);
  select * into o from public.checkout_orders where id=(draft->>'orderId')::uuid for update;
  if o.payment_key is not null and o.payment_key<>'mock_'||o.id::text then raise exception 'Provider checkout already started'; end if;
  perform public.begin_payment_confirmation(o.id,'mock_'||o.id::text);
  result:=public.record_provider_payment(o.id,jsonb_build_object('orderId',o.id,'paymentKey','mock_'||o.id::text,'totalAmount',o.amount,'balanceAmount',o.amount,'currency',o.currency,'status','DONE'));
  if result->>'status'<>'paid' then raise exception 'Mock reservation cannot be confirmed'; end if;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,after_data)
    values(auth.uid(),'mock_checkout',e.id,'Admin-only simulated payment; no provider transaction',jsonb_build_object('orderId',o.id,'amount',o.amount,'environment','test'));
  return result||jsonb_build_object('mode','mock');
end $$;
revoke all on function public.admin_mock_checkout(uuid,uuid) from public,anon;
grant execute on function public.admin_mock_checkout(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
