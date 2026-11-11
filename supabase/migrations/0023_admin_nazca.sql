begin;

-- nazca4902@naver.com 및 관리자 이메일 허용을 위해 admin_members 단일 제약조건 제거
alter table public.admin_members drop constraint if exists single_initial_admin;

-- nazca4902@naver.com 계정 ID가 auth.users에 있으면 admin_members에 자동 추가
insert into public.admin_members(profile_id)
select id from auth.users where lower(email) in ('nazca4902@naver.com', 'parkdaegun@gmail.com')
on conflict do nothing;

-- admin_is_authorized 함수를 이메일 및 admin_members 매칭으로 강화
create or replace function public.admin_is_authorized() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  is_admin boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select exists(
    select 1 from public.admin_members where profile_id = auth.uid()
  ) or exists(
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) in ('nazca4902@naver.com', 'parkdaegun@gmail.com')
  ) or exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into is_admin;

  return coalesce(is_admin, false);
end;
$$;

revoke all on function public.admin_is_authorized() from public, anon;
grant execute on function public.admin_is_authorized() to authenticated;

commit;
