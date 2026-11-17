begin;
create table public.action_budgets (
  user_id uuid not null references public.profiles(id) on delete cascade,action text not null,window_at timestamptz not null,
  count integer not null,primary key(user_id,action)
);
alter table public.action_budgets enable row level security;
revoke all on public.action_budgets from public,anon,authenticated;
create function public.consume_action_budget(p_action text) returns boolean language plpgsql security definer set search_path='' as $$
declare count_used integer;
begin
  if auth.uid() is null or p_action not in ('prepare','confirm','refund') then raise exception 'Invalid action' using errcode='42501'; end if;
  insert into public.action_budgets(user_id,action,window_at,count) values(auth.uid(),p_action,date_trunc('minute',now()),1)
  on conflict(user_id,action) do update set count=case when action_budgets.window_at=excluded.window_at then least(action_budgets.count+1,1000) else 1 end,window_at=excluded.window_at
  returning count into count_used;
  return count_used<=case when p_action='refund' then 10 else 20 end;
end $$;
revoke all on function public.consume_action_budget(text) from public,anon;
grant execute on function public.consume_action_budget(text) to authenticated;

create table public.maintenance_runs (
  id uuid primary key default gen_random_uuid(),status text not null default 'running' check(status in ('running','completed','failed')),
  failures integer not null default 0,started_at timestamptz not null default now(),finished_at timestamptz
);
alter table public.maintenance_runs enable row level security;
revoke all on public.maintenance_runs from public,anon,authenticated;
grant select,insert,update on public.maintenance_runs to service_role;
create function public.admin_runtime_health() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  return jsonb_build_object('jobs',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select * from public.maintenance_runs order by started_at desc limit 5) r),
    'googleReady',to_regprocedure('public.complete_oauth_registration(text)') is not null,
    'schemaVersion',case when to_regprocedure('public.my_payment_detail(uuid)') is not null then 32 else 31 end,
    'stalePayments',(select count(*) from public.checkout_orders where status in ('confirming','refund_pending','needs_review') and updated_at<now()-interval '10 minutes'));
end $$;
revoke all on function public.admin_runtime_health() from public,anon;
grant execute on function public.admin_runtime_health() to authenticated;
notify pgrst,'reload schema';
commit;
