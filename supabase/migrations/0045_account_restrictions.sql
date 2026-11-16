begin;
create table public.account_restrictions (
  user_id uuid primary key references public.profiles(id),reason text not null check(length(trim(reason)) between 3 and 2000),
  restricted_until timestamptz,active boolean not null default true,updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
alter table public.account_restrictions enable row level security;
revoke all on public.account_restrictions from public,anon,authenticated;
create function public.account_is_active(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select not exists(select 1 from public.account_restrictions where user_id=p_user and active and (restricted_until is null or restricted_until>now()))
$$;
create function public.my_account_restriction() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('reason',reason,'until',restricted_until) from public.account_restrictions where user_id=auth.uid() and active and (restricted_until is null or restricted_until>now())),'null'::jsonb)
$$;
create function public.admin_set_restriction(p_user uuid,p_active boolean,p_until timestamptz,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_user=auth.uid() or exists(select 1 from public.admin_members where profile_id=p_user) then raise exception 'Cannot restrict an administrator'; end if;
  if p_active is null or length(trim(p_reason)) not between 3 and 2000 or (p_until is not null and p_until<=now()) then raise exception 'Invalid restriction'; end if;
  insert into public.account_restrictions(user_id,reason,restricted_until,active,updated_by) values(p_user,trim(p_reason),p_until,p_active,auth.uid())
    on conflict(user_id) do update set reason=excluded.reason,restricted_until=excluded.restricted_until,active=excluded.active,updated_by=auth.uid(),updated_at=now();
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,after_data) values(auth.uid(),'account_restriction',p_user,trim(p_reason),jsonb_build_object('active',p_active,'until',p_until));
  insert into public.notifications(user_id,type,title,body,link_url) values(p_user,'booking_status','계정 이용 상태 안내',trim(p_reason),'/account');
end $$;
create function public.guard_active_actor() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and not public.account_is_active(auth.uid()) then raise exception 'Account restricted; contact support' using errcode='42501'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
do $$ declare target text; begin
  foreach target in array array['teacher_lessons','teacher_availability','teacher_days_off','enrollments','attendance_records','chat_messages','checkout_orders','withdrawal_requests','session_meetings','materials','session_materials'] loop
    execute format('create trigger active_actor_guard before insert or update or delete on public.%I for each row execute function public.guard_active_actor()',target);
  end loop;
end $$;
create or replace function public.marketplace_teacher_visible(p_teacher uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.account_is_active(p_teacher) and exists(select 1 from public.teacher_applications a where a.profile_id=p_teacher and a.status='approved')
    and not exists(select 1 from public.teacher_launch_flags f where f.teacher_id=p_teacher and f.is_demo)
$$;
revoke all on function public.guard_active_actor() from public,anon,authenticated;
revoke all on function public.account_is_active(uuid) from public;
grant execute on function public.account_is_active(uuid) to anon,authenticated,service_role;
revoke all on function public.my_account_restriction(),public.admin_set_restriction(uuid,boolean,timestamptz,text) from public,anon;
grant execute on function public.my_account_restriction(),public.admin_set_restriction(uuid,boolean,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
commit;
