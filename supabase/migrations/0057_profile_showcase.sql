begin;
alter table public.teacher_portfolio_entries drop constraint teacher_portfolio_entries_kind_check;
alter table public.teacher_portfolio_entries add constraint teacher_portfolio_entries_kind_check check
(kind in ('career','qualification','work','kpop','movie','drama','interest','structure','correction','mood','pace','activity','intro','demo','translation'));
alter table public.teacher_portfolio_entries add column style_level smallint;
alter table public.teacher_portfolio_entries add constraint portfolio_style_level check
(case when kind in ('structure','correction','mood','pace','activity') then style_level is not null and style_level between 1 and 5 else style_level is null end);
create unique index portfolio_style_axis on public.teacher_portfolio_entries(teacher_id,kind) where style_level is not null;
create function public.portfolio_teacher_approved(p_teacher uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.teacher_applications where profile_id=p_teacher and status='approved')
$$;
revoke all on function public.portfolio_teacher_approved(uuid) from public;
grant execute on function public.portfolio_teacher_approved(uuid) to anon, authenticated;
alter policy portfolio_read on public.teacher_portfolio_entries using
(teacher_id=(select auth.uid()) or (is_public and public.portfolio_teacher_approved(teacher_id)));
alter table public.teacher_portfolio_entries add column media_consent boolean not null default false,
 add constraint portfolio_video_publication check (kind not in ('intro','demo') or not is_public or media_consent);
alter table public.teacher_portfolio_entries add column media_path text,
 add constraint portfolio_media_owner check(media_path is null or
 (kind in ('intro','demo') and media_path ~ ('^'||teacher_id::text||'/[a-f0-9-]{36}\.(mp4|webm)$')));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('profile-clips','profile-clips',false,52428800,array['video/mp4','video/webm']);
create policy profile_clip_insert on storage.objects for insert to authenticated with check
 (bucket_id='profile-clips' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.teacher_profiles where profile_id=auth.uid()));
create policy profile_clip_select on storage.objects for select using
 (bucket_id='profile-clips' and ((storage.foldername(name))[1]=auth.uid()::text or exists
 (select 1 from public.teacher_portfolio_entries e where e.media_path=storage.objects.name and e.is_public and public.portfolio_teacher_approved(e.teacher_id))));
create policy profile_clip_delete on storage.objects for delete to authenticated using
 (bucket_id='profile-clips' and (storage.foldername(name))[1]=auth.uid()::text);
alter table public.matching_profiles add column languages_public boolean not null default true;
alter table public.matching_profiles alter column languages_public set default false;
-- Expose only a teacher's self-reported languages, never private matching preferences.
create or replace function public.public_teacher_languages(p_teacher uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select m.languages from public.matching_profiles m
    join public.profiles p on p.id = m.profile_id and p.role = 'teacher'
    where m.profile_id = p_teacher and m.languages_public
      and (p.id = auth.uid() or exists (
        select 1 from public.teacher_applications a
        where a.profile_id = p.id and a.status = 'approved'
      ))
  ), '[]'::jsonb);
$$;
revoke all on function public.public_teacher_languages(uuid) from public;
grant execute on function public.public_teacher_languages(uuid) to anon, authenticated;

create function public.public_profile_lessons(p_teachers uuid[]) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('teacher_id',l.teacher_id,'lesson_id',l.id,'lesson_type',l.type,'next_start',slot.value->>'start','remaining',(slot.value->>'remaining')::int)),'[]'::jsonb)
 from public.teacher_lessons l
 cross join lateral jsonb_array_elements(public.public_lesson_catalog('{}'::jsonb,l.id)->'items') listed
 left join lateral (select value from jsonb_array_elements(listed->'sessions') where (value->>'remaining')::integer>0
   order by (value->>'start')::timestamptz limit 1) slot on true
 where l.is_published and l.teacher_id=any(p_teachers[1:50]) and public.portfolio_teacher_approved(l.teacher_id)
$$;
revoke all on function public.public_profile_lessons(uuid[]) from public;
grant execute on function public.public_profile_lessons(uuid[]) to anon,authenticated;
notify pgrst,'reload schema';
commit;