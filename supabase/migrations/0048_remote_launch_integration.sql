begin;
-- The remote teacher workspace keeps its RPC name, but meeting credentials now
-- use the same private storage and authorization as the launch lesson room.
create or replace function public.update_teacher_meeting_link(p_session_id uuid,p_url text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.lesson_sessions where id=p_session_id and teacher_id=auth.uid()) then raise exception 'Session access denied' using errcode='42501'; end if;
  if nullif(trim(p_url),'') is null then delete from public.session_meetings where session_id=p_session_id;
  else
    if length(trim(p_url))>2000 or trim(p_url) !~ '^https://(meet[.]google[.]com/|([a-z0-9-]+[.])*zoom[.]us/|teams[.]microsoft[.]com/)' then raise exception 'Unsupported meeting URL' using errcode='22023'; end if;
    perform public.set_session_meeting(p_session_id,p_url);
  end if;
end $$;
create function public.guard_private_meeting_link() returns trigger language plpgsql set search_path='' as $$
begin
  if new.meeting_link is not null then raise exception 'Use the private session meeting RPC' using errcode='42501'; end if;
  return new;
end $$;
create trigger private_meeting_link_guard before insert or update of meeting_link on public.lesson_sessions for each row execute function public.guard_private_meeting_link();
revoke all on function public.guard_private_meeting_link() from public,anon,authenticated;

-- SECURITY DEFINER discovery/recommendation functions must obey the same launch
-- visibility rules as ordinary RLS queries (approved, non-demo, active sellers).
do $$ declare definition text; begin
  select pg_get_functiondef('public.public_lesson_catalog(jsonb,uuid)'::regprocedure) into definition;
  definition:=replace(definition,'where l.is_published and p.role=''teacher''','where l.is_published and p.role=''teacher'' and public.marketplace_teacher_visible(l.teacher_id)');
  execute definition;
  select pg_get_functiondef('public.my_lesson_recommendations()'::regprocedure) into definition;
  definition:=replace(definition,'where l.is_published and l.teacher_id<>auth.uid()','where l.is_published and public.marketplace_teacher_visible(l.teacher_id) and l.teacher_id<>auth.uid()');
  execute definition;
end $$;
create or replace function public.public_teacher_languages(p_teacher uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((select m.languages from public.matching_profiles m join public.profiles p on p.id=m.profile_id and p.role='teacher'
    where m.profile_id=p_teacher and (p.id=auth.uid() or public.marketplace_teacher_visible(p.id))),'[]'::jsonb)
$$;

-- Remote UI already calls this RPC, but no migration defined it. Never delete
-- a booked product or its history; unpublish it instead.
create function public.delete_teacher_lesson(p_lesson_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare teacher uuid;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select teacher_id into teacher from public.teacher_lessons where id=p_lesson_id;
  if teacher is distinct from auth.uid() then raise exception 'Lesson access denied' using errcode='42501'; end if;
  perform 1 from public.profiles where id=teacher for update;
  perform 1 from public.teacher_lessons where id=p_lesson_id for update;
  if exists(select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_lesson_id=p_lesson_id) then raise exception 'Booked lesson cannot be deleted; unpublish it'; end if;
  delete from public.lesson_sessions where teacher_lesson_id=p_lesson_id and teacher_id=teacher;
  delete from public.teacher_lessons where id=p_lesson_id and teacher_id=teacher;
end $$;
revoke all on function public.delete_teacher_lesson(uuid) from public,anon;
grant execute on function public.delete_teacher_lesson(uuid) to authenticated;
do $$ declare target text; begin
  foreach target in array array['teacher_tasks','teacher_student_notes','teacher_portfolio_entries','matching_profiles'] loop
    execute format('create trigger active_actor_guard before insert or update or delete on public.%I for each row execute function public.guard_active_actor()',target);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
