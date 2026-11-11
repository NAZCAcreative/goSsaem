begin;
-- Repair missing onboarding records without changing existing review decisions.
insert into public.teacher_profiles(profile_id)
select id from public.profiles where role='teacher'
on conflict(profile_id) do nothing;
insert into public.teacher_applications(profile_id,status)
select t.profile_id,case when t.is_verified then 'approved' else 'not_applied' end
from public.teacher_profiles t join public.profiles p on p.id=t.profile_id and p.role='teacher'
on conflict(profile_id) do nothing;

create or replace function public.ensure_my_teacher_application() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then
    raise exception '선생님 계정으로 로그인해주세요.' using errcode='42501';
  end if;
  -- Serialize recovery for the same account; never accept a caller-supplied owner id.
  perform 1 from public.profiles where id=auth.uid() for update;
  insert into public.teacher_profiles(profile_id) values(auth.uid()) on conflict(profile_id) do nothing;
  insert into public.teacher_applications(profile_id,status)
    select profile_id,case when is_verified then 'approved' else 'not_applied' end
    from public.teacher_profiles where profile_id=auth.uid()
    on conflict(profile_id) do nothing;
  return public.my_teacher_application();
end;
$$;
revoke all on function public.ensure_my_teacher_application() from public,anon;
grant execute on function public.ensure_my_teacher_application() to authenticated;
notify pgrst,'reload schema';
commit;
