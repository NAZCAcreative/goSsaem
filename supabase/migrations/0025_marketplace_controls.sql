begin;
create table public.teacher_launch_flags (
  teacher_id uuid primary key references public.teacher_profiles(profile_id) on delete cascade,
  is_demo boolean not null default false,updated_at timestamptz not null default now()
);
insert into public.teacher_launch_flags(teacher_id,is_demo) select t.profile_id,p.avatar_is_generated from public.teacher_profiles t join public.profiles p on p.id=t.profile_id;
alter table public.teacher_launch_flags enable row level security;
revoke all on public.teacher_launch_flags from public,anon,authenticated;
create function public.marketplace_teacher_visible(p_teacher uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.teacher_applications a where a.profile_id=p_teacher and a.status='approved')
    and not exists(select 1 from public.teacher_launch_flags f where f.teacher_id=p_teacher and f.is_demo)
$$;
revoke all on function public.marketplace_teacher_visible(uuid) from public;
grant execute on function public.marketplace_teacher_visible(uuid) to anon,authenticated;
drop policy teacher_profiles_select_all on public.teacher_profiles;
create policy teacher_profiles_market_read on public.teacher_profiles for select using(profile_id=auth.uid() or public.marketplace_teacher_visible(profile_id));
drop policy teacher_lessons_select on public.teacher_lessons;
create policy teacher_lessons_market_read on public.teacher_lessons for select using(teacher_id=auth.uid() or (is_published and public.marketplace_teacher_visible(teacher_id)));

create function public.admin_mark_demo(p_teacher uuid,p_is_demo boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.admin_is_authorized() then raise exception 'Admin required' using errcode='42501'; end if;
  if length(trim(p_reason)) not between 3 and 1000 or p_is_demo is null then raise exception 'Reason required'; end if;
  insert into public.teacher_launch_flags(teacher_id,is_demo) values(p_teacher,p_is_demo) on conflict(teacher_id) do update set is_demo=excluded.is_demo,updated_at=now();
  insert into public.admin_audit_logs(actor_id,action,target_id,reason,after_data) values(auth.uid(),'mark_demo',p_teacher,trim(p_reason),jsonb_build_object('isDemo',p_is_demo));
end $$;

create table public.teacher_days_off (
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,day date not null,primary key(teacher_id,day)
);
alter table public.teacher_days_off enable row level security;
revoke all on public.teacher_days_off from public,anon,authenticated;
grant select on public.teacher_days_off to authenticated;
create policy teacher_days_off_read on public.teacher_days_off for select using(teacher_id=auth.uid());
create function public.guard_availability_slot() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.profiles where id=new.teacher_id for update;
  if new.weekday not between 0 and 6 or new.start_time>=new.end_time then raise exception 'Invalid slot'; end if;
  if exists(select 1 from public.teacher_availability a where a.teacher_id=new.teacher_id and a.id<>new.id and a.weekday=new.weekday and a.start_time<new.end_time and a.end_time>new.start_time) then raise exception 'Overlapping slots'; end if;
  if (select count(*) from public.teacher_availability where teacher_id=new.teacher_id and id<>new.id)>=50 then raise exception 'Too many slots'; end if;
  return new;
end $$;
create trigger availability_slot_guard before insert or update on public.teacher_availability for each row execute function public.guard_availability_slot();
revoke all on function public.guard_availability_slot() from public,anon,authenticated;
create function public.save_teacher_availability(p_slots jsonb,p_days_off date[]) returns void language plpgsql security definer set search_path='' as $$
declare slot record;
begin
  if auth.uid() is null or not exists(select 1 from public.teacher_profiles where profile_id=auth.uid()) then raise exception 'Teacher required' using errcode='42501'; end if;
  if jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>50 or coalesce(cardinality(p_days_off),0)>366 then raise exception 'Too many slots'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  delete from public.teacher_availability where teacher_id=auth.uid();
  for slot in select * from jsonb_to_recordset(p_slots) as x(weekday integer,start_time text,end_time text) loop
    if slot.weekday is null or slot.weekday not between 0 and 6 or slot.start_time is null or slot.end_time is null or slot.start_time::time>=slot.end_time::time then raise exception 'Invalid slot'; end if;
    if exists(select 1 from public.teacher_availability where teacher_id=auth.uid() and weekday=slot.weekday and start_time<slot.end_time::time and end_time>slot.start_time::time) then raise exception 'Overlapping slots'; end if;
    insert into public.teacher_availability(teacher_id,weekday,start_time,end_time) values(auth.uid(),slot.weekday,slot.start_time::time,slot.end_time::time);
  end loop;
  delete from public.teacher_days_off where teacher_id=auth.uid();
  insert into public.teacher_days_off(teacher_id,day) select auth.uid(),d from unnest(p_days_off) d where d is not null on conflict do nothing;
end $$;
-- Existing confirmed bookings are preserved when changing availability or holidays.
alter function public.reserve_lesson(uuid,timestamptz) rename to reserve_lesson_base;
create function public.reserve_lesson(p_lesson uuid,p_start timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare teacher uuid;
begin
  select teacher_id into teacher from public.teacher_lessons where id=p_lesson;
  perform 1 from public.profiles where id=teacher for update;
  if not public.marketplace_teacher_visible(teacher) then raise exception 'Teacher is not available for sale'; end if;
  if exists(select 1 from public.teacher_days_off where teacher_id=teacher and day=(p_start at time zone 'Asia/Seoul')::date) then raise exception 'Teacher is unavailable'; end if;
  return public.reserve_lesson_base(p_lesson,p_start);
end $$;
alter function public.lesson_booking_slots(uuid,date) rename to lesson_booking_slots_base;
create function public.lesson_booking_slots(p_lesson uuid,p_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare teacher uuid;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select teacher_id into teacher from public.teacher_lessons where id=p_lesson;
  if not public.marketplace_teacher_visible(teacher) or exists(select 1 from public.teacher_days_off where teacher_id=teacher and day=p_day) then return '[]'::jsonb; end if;
  return public.lesson_booking_slots_base(p_lesson,p_day);
end $$;
revoke all on function public.reserve_lesson_base(uuid,timestamptz),public.lesson_booking_slots_base(uuid,date) from public,anon,authenticated;
revoke all on function public.reserve_lesson(uuid,timestamptz),public.lesson_booking_slots(uuid,date),public.save_teacher_availability(jsonb,date[]),public.admin_mark_demo(uuid,boolean,text) from public,anon;
grant execute on function public.reserve_lesson(uuid,timestamptz),public.lesson_booking_slots(uuid,date),public.save_teacher_availability(jsonb,date[]),public.admin_mark_demo(uuid,boolean,text) to authenticated;

-- SECURITY DEFINER search must enforce the same publication rules as RLS.
do $$ declare definition text; begin
  select pg_get_functiondef('public.search_teachers(text,text,text,text[],text,integer,integer)'::regprocedure) into definition;
  definition:=replace(definition,'where (p_specialty is null','where public.marketplace_teacher_visible(t.profile_id) and (p_specialty is null');
  execute definition;
end $$;

-- Private lesson materials: student access is scoped to a specific booked session.
create table public.session_materials (
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,primary key(session_id,material_id)
);
alter table public.session_materials enable row level security;
revoke all on public.session_materials from public,anon,authenticated;
create function public.share_session_material(p_session uuid,p_material uuid,p_share boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.lesson_sessions where id=p_session and teacher_id=auth.uid()) or not exists(select 1 from public.materials where id=p_material and teacher_id=auth.uid()) then raise exception 'Material access denied' using errcode='42501'; end if;
  if p_share then insert into public.session_materials values(p_session,p_material) on conflict do nothing;
  else delete from public.session_materials where session_id=p_session and material_id=p_material; end if;
end $$;
create function public.session_material_list(p_session uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.lesson_sessions s where s.id=p_session and (s.teacher_id=auth.uid() or exists(select 1 from public.enrollments where session_id=s.id and student_id=auth.uid() and status in ('confirmed','completed','no_show')))) then raise exception 'Session access denied' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'fileName',m.file_name,'storagePath',m.file_url,'fileSize',m.file_size)),'[]') from public.materials m join public.session_materials x on x.material_id=m.id where x.session_id=p_session);
end $$;
create policy materials_shared_read on storage.objects for select using(bucket_id='materials' and exists(
  select 1 from public.materials m join public.session_materials sm on sm.material_id=m.id join public.enrollments e on e.session_id=sm.session_id
  where m.file_url=storage.objects.name and e.student_id=auth.uid() and e.status in ('confirmed','completed','no_show')));
-- Storage policy runs as the caller; use a narrow definer predicate instead of
-- exposing join tables or other students' enrollments.
create function public.can_download_material(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.materials m join public.session_materials sm on sm.material_id=m.id join public.enrollments e on e.session_id=sm.session_id where m.file_url=p_path and split_part(m.file_url,'/',1)=m.teacher_id::text and e.student_id=auth.uid() and e.status in ('confirmed','completed','no_show'))
$$;
create function public.guard_material_path() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if split_part(new.file_url,'/',1)<>new.teacher_id::text or length(new.file_url)>500 then raise exception 'Material storage owner mismatch' using errcode='42501'; end if;
  return new;
end $$;
create trigger material_path_guard before insert or update on public.materials for each row execute function public.guard_material_path();
revoke all on function public.guard_material_path() from public,anon,authenticated;
drop policy materials_shared_read on storage.objects;
create policy materials_shared_read on storage.objects for select using(bucket_id='materials' and public.can_download_material(name));
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'] where id='materials';
revoke all on function public.share_session_material(uuid,uuid,boolean),public.session_material_list(uuid),public.can_download_material(text) from public,anon;
grant execute on function public.share_session_material(uuid,uuid,boolean),public.session_material_list(uuid),public.can_download_material(text) to authenticated;
notify pgrst,'reload schema';
commit;
