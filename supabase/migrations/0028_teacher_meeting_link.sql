-- Permit teachers to edit only the meeting link of their own session.
create or replace function public.update_teacher_meeting_link(p_session_id uuid, p_url text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_url text := nullif(btrim(p_url), '');
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Authentication required'; end if;
  if v_url is not null and (length(v_url) > 2000 or v_url !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then
    raise invalid_parameter_value using message = 'Invalid meeting URL';
  end if;
  update public.lesson_sessions set meeting_link = v_url
  where id = p_session_id and teacher_id = auth.uid();
  if not found then raise insufficient_privilege using message = 'Session not found or not owned'; end if;
end;
$$;
revoke all on function public.update_teacher_meeting_link(uuid,text) from public;
grant execute on function public.update_teacher_meeting_link(uuid,text) to authenticated;
