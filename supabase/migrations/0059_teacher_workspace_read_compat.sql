begin;
create or replace function public.my_teacher_preparation() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare linked uuid[];
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  if to_regclass('public.session_meetings') is not null then
    execute 'select array(select m.session_id from public.session_meetings m join public.lesson_sessions s on s.id=m.session_id where s.teacher_id=$1 and s.scheduled_at between now() and now()+interval ''7 days'')' into linked using auth.uid();
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select s.id,s.title,s.scheduled_at as "scheduledAt",
      case when s.scheduled_at+make_interval(mins=>s.duration_minutes)<=now() then 'attendance' else 'meeting' end as kind
    from public.lesson_sessions s where s.teacher_id=auth.uid() and s.status<>'cancelled' and (
      (s.status in ('scheduled','ongoing') and s.scheduled_at between now() and now()+interval '7 days' and (case when to_regclass('public.session_meetings') is null then nullif(trim(s.meeting_link),'') is null else not (s.id=any(linked)) end))
      or (s.scheduled_at>=now()-interval '30 days' and s.scheduled_at+make_interval(mins=>s.duration_minutes)<=now() and exists(select 1 from public.enrollments e where e.session_id=s.id and e.status='confirmed'))
    ) order by s.scheduled_at,s.id limit 30
  ) r);
end $$;

create or replace function public.my_teacher_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (with counts as (select e.student_id,count(*) n from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_id=auth.uid() and e.status='completed' group by e.student_id)
    select jsonb_build_object('completed',coalesce(sum(n),0),'students',count(*),'returning',count(*) filter(where n>1)) from counts);
end $$;

create or replace function public.my_account_restriction() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if to_regclass('public.account_restrictions') is not null then
    execute 'select jsonb_build_object(''reason'',reason,''until'',restricted_until) from public.account_restrictions where user_id=$1 and active and (restricted_until is null or restricted_until>now())' into result using auth.uid();
  end if;
  return coalesce(result,'null'::jsonb);
end $$;
revoke all on function public.my_account_restriction(), public.my_teacher_metrics(), public.my_teacher_preparation() from public, anon;
grant execute on function public.my_account_restriction(), public.my_teacher_metrics(), public.my_teacher_preparation() to authenticated;
notify pgrst,'reload schema';
commit;