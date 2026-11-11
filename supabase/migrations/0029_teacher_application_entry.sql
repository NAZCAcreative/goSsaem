begin;
alter table public.teacher_applications drop constraint teacher_applications_status_check;
alter table public.teacher_applications add constraint teacher_applications_status_check check(status in ('not_applied','review_pending','needs_changes','approved','review_rejected'));
alter table public.teacher_applications alter column status set default 'not_applied';

create or replace function public.initialize_teacher_application() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.teacher_applications(profile_id,status) values(new.profile_id,case when new.is_verified then 'approved' else 'not_applied' end);
  return new;
end;
$$;

create or replace function public.submit_teacher_application(p_expected timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.teacher_applications; result public.teacher_applications;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then
    raise exception 'Teacher account required' using errcode='42501';
  end if;
  select * into previous from public.teacher_applications where profile_id=auth.uid() for update;
  if not found then raise exception 'Teacher not found' using errcode='P0002'; end if;
  if previous.updated_at is distinct from p_expected then raise exception '신청 정보가 변경되었습니다. 새로고침 후 다시 신청해주세요.' using errcode='40001'; end if;
  if previous.status not in ('not_applied','needs_changes','review_rejected') then raise exception '이미 신청했거나 승인된 상태입니다.'; end if;
  if not exists(select 1 from public.teacher_profiles t join public.profiles p on p.id=t.profile_id
    where t.profile_id=auth.uid() and length(trim(p.name))>0 and length(trim(coalesce(t.headline,'')))>0
      and length(trim(coalesce(t.bio,'')))>0 and cardinality(t.specialties)>0) then
    raise exception '이름, 한 줄 소개, 자기소개, 전문 분야를 모두 작성한 뒤 신청해주세요.' using errcode='22023';
  end if;
  update public.teacher_applications set status='review_pending',updated_at=clock_timestamp() where profile_id=auth.uid() returning * into result;
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),case when previous.status='not_applied' then 'teacher_submit' else 'teacher_resubmit' end,auth.uid(),'Teacher submitted application',to_jsonb(previous),to_jsonb(result));
  return public.my_teacher_application();
end;
$$;

-- A draft must be submitted by its owner before an administrator can review it.
create function public.guard_teacher_application_submission() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status='not_applied' and new.status not in ('not_applied','review_pending') then
    raise exception '신청 전 계정은 심사할 수 없습니다.' using errcode='22023';
  end if;
  return new;
end;
$$;
create trigger teacher_application_submission_guard before update of status on public.teacher_applications
for each row execute function public.guard_teacher_application_submission();
commit;
