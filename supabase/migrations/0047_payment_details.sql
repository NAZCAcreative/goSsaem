begin;
create function public.my_payment_detail(p_payment uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select jsonb_build_object('id',p.id,'amount',p.amount,'currency',p.currency,'status',p.status,'verified',p.verified_payment,
    'createdAt',p.created_at,'enrollmentId',p.enrollment_id,'title',s.title,'receiptUrl',o.receipt_url,'orderStatus',o.status)
    into result from public.payments p left join public.enrollments e on e.id=p.enrollment_id left join public.lesson_sessions s on s.id=e.session_id
    left join public.checkout_orders o on o.enrollment_id=e.id and o.payment_key=p.pg_transaction_id
    where p.id=p_payment and p.student_id=auth.uid();
  if result is null then raise exception 'Payment not found' using errcode='42501'; end if;
  return result;
end $$;
revoke all on function public.my_payment_detail(uuid) from public,anon;
grant execute on function public.my_payment_detail(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
