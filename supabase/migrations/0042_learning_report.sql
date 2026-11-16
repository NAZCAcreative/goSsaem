begin;
create function public.my_learning_report(p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return jsonb_build_object('completed',(select count(*) from public.enrollments where student_id=auth.uid() and status='completed'),
    'minutes',(select coalesce(sum(s.duration_minutes),0) from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.student_id=auth.uid() and e.status='completed'),
    'upcoming',(select count(*) from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.student_id=auth.uid() and e.status='confirmed' and s.scheduled_at>now()),
    'lessons',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select e.id,s.title,s.scheduled_at as "scheduledAt",s.duration_minutes as duration,p.name as "teacherName",a.status as attendance
      from public.enrollments e join public.lesson_sessions s on s.id=e.session_id join public.profiles p on p.id=s.teacher_id left join public.attendance_records a on a.enrollment_id=e.id
      where e.student_id=auth.uid() and e.status='completed' order by s.scheduled_at desc,e.id desc limit 20 offset (greatest(1,p_page)-1)*20) r));
end $$;
revoke all on function public.my_learning_report(integer) from public,anon;
grant execute on function public.my_learning_report(integer) to authenticated;
notify pgrst,'reload schema';
commit;
