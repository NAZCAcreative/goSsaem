-- Expose only a teacher's self-reported languages, never private matching preferences.
create or replace function public.public_teacher_languages(p_teacher uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select m.languages from public.matching_profiles m
    join public.profiles p on p.id = m.profile_id and p.role = 'teacher'
    where m.profile_id = p_teacher
      and (p.id = auth.uid() or exists (
        select 1 from public.teacher_applications a
        where a.profile_id = p.id and a.status = 'approved'
      ))
  ), '[]'::jsonb);
$$;
revoke all on function public.public_teacher_languages(uuid) from public;
grant execute on function public.public_teacher_languages(uuid) to anon, authenticated;
