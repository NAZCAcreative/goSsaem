begin;

do $$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='profiles_fixed_role' and not tgisinternal) then
    raise exception 'Apply migration 0019_fixed_account_roles before Google signup roles';
  end if;
end $$;

-- Existing users are finalized already. Only new Google accounts receive this flag.
alter table public.profiles add column oauth_role_pending boolean not null default false;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare signup_role public.user_role; pending boolean;
begin
  pending := coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google';
  signup_role := case when not pending and new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.user_role else 'student'::public.user_role end;
  insert into public.profiles(id, name, avatar_url, native_language, korean_level, role, active_role, oauth_role_pending)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'New User'),
    new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'native_language',
    coalesce((new.raw_user_meta_data ->> 'korean_level')::public.korean_level, 'beginner'),
    signup_role, signup_role, pending);
  if signup_role='teacher' then insert into public.teacher_profiles(profile_id) values(new.id); end if;
  return new;
end;
$$;

create or replace function public.guard_account_role() returns trigger
language plpgsql set search_path = '' as $$
declare completing boolean;
begin
  completing := old.oauth_role_pending and not new.oauth_role_pending
    and current_setting('vora.completing_oauth', true)='on'
    and current_user = pg_get_userbyid((select proowner from pg_proc where oid='public.complete_oauth_registration(text)'::regprocedure));
  if (new.role is distinct from old.role or new.oauth_role_pending is distinct from old.oauth_role_pending) and not coalesce(completing,false) then
    raise exception 'Account role cannot be changed' using errcode='42501';
  end if;
  new.active_role := new.role;
  return new;
end;
$$;

create function public.complete_oauth_registration(p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare profile public.profiles;
begin
  if auth.uid() is null or p_role not in ('student','teacher') or p_role is null then
    raise exception 'Authenticated account and valid signup role required' using errcode='42501';
  end if;
  select * into profile from public.profiles where id=auth.uid() for update;
  if not found then raise exception 'Profile not found' using errcode='42501'; end if;
  if not profile.oauth_role_pending then return jsonb_build_object('role',profile.role); end if;
  if not exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data ->> 'provider'='google') then
    raise exception 'New Google account required' using errcode='42501';
  end if;
  if exists(select 1 from public.enrollments where student_id=auth.uid())
    or exists(select 1 from public.payments where student_id=auth.uid())
    or exists(select 1 from public.reviews where student_id=auth.uid())
    or exists(select 1 from public.chat_rooms where student_id=auth.uid())
    or exists(select 1 from public.wishlists where student_id=auth.uid()) then
    raise exception 'Account with student activity cannot change role' using errcode='42501';
  end if;
  perform set_config('vora.completing_oauth','on',true);
  update public.profiles set role=p_role::public.user_role, oauth_role_pending=false where id=auth.uid();
  perform set_config('vora.completing_oauth','off',true);
  if p_role='teacher' then insert into public.teacher_profiles(profile_id) values(auth.uid()) on conflict do nothing; end if;
  return jsonb_build_object('role',p_role);
end;
$$;
revoke all on function public.complete_oauth_registration(text) from public,anon;
grant execute on function public.complete_oauth_registration(text) to authenticated;

-- A pending Google account cannot start student activity before choosing its role.
-- The row lock also serializes writes against the one-time role finalization.
create function public.guard_finalized_student() returns trigger
language plpgsql security definer set search_path = '' as $$
declare account public.profiles;
begin
  select * into account from public.profiles where id=new.student_id for share;
  if not found or account.oauth_role_pending or account.role<>'student' then
    raise exception 'Finalized student account required' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_finalized_student() from public,anon,authenticated;
create trigger enrollment_finalized_student before insert or update of student_id on public.enrollments
for each row execute function public.guard_finalized_student();
create trigger payment_finalized_student before insert or update of student_id on public.payments
for each row execute function public.guard_finalized_student();
create trigger review_finalized_student before insert or update of student_id on public.reviews
for each row execute function public.guard_finalized_student();
create trigger chat_finalized_student before insert or update of student_id on public.chat_rooms
for each row execute function public.guard_finalized_student();
create trigger wishlist_finalized_student before insert or update of student_id on public.wishlists
for each row execute function public.guard_finalized_student();

-- Public capability probe prevents creating a Google account with a default
-- student role when the application deploys before this database migration.
create function public.google_signup_role_ready() returns boolean
language sql stable set search_path = '' as $$ select true $$;
revoke all on function public.google_signup_role_ready() from public;
grant execute on function public.google_signup_role_ready() to anon, authenticated;
notify pgrst,'reload schema';
commit;
