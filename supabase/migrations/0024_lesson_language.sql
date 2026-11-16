begin;

-- 수업 언어 컬럼 추가 (기본값: 한국어)
alter table public.teacher_lessons
  add column if not exists language text not null default '한국어';

-- 수업 생성 함수 갱신: language 파라미터 지원
create or replace function public.create_teacher_lesson(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  lesson_id uuid;
  session_id uuid;
  price integer;
  capacity integer;
  start_at timestamptz;
  mode text := coalesce(p_data->>'schedulingMode','fixed');
  duration integer := (p_data->>'durationMinutes')::integer;
  windows jsonb := coalesce(p_data->'availability','[]'::jsonb);
  lesson_lang text := coalesce(nullif(trim(p_data->>'language'), ''), '한국어');
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  price:=(p_data->>'price')::integer;
  capacity:=(p_data->>'capacity')::integer;
  start_at:=(p_data->>'scheduledAt')::timestamptz;
  if price is null or price<0 or price>10000000 or capacity is null or capacity<1 or capacity>100 or (mode='fixed' and (start_at is null or start_at<=now() or start_at>now()+interval '180 days')) or length(trim(coalesce(p_data->>'title','')))<2 then raise exception 'Invalid lesson'; end if;
  if p_data->>'type'='free_trial' and price<>0 then raise exception 'Free trial must be free'; end if;
  if mode not in ('fixed','request') or duration is null or duration<10 or duration>240 or coalesce(p_data->>'category','') not in ('TOPIK','회화','비즈니스','발음 교정','취미/문화') then raise exception 'Invalid lesson settings'; end if;
  if mode='request' and (jsonb_typeof(windows)<>'array' or jsonb_array_length(windows)=0) then raise exception 'Availability required'; end if;
  if mode='fixed' then windows := '[]'::jsonb; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  insert into public.teacher_profiles(profile_id) values(auth.uid()) on conflict do nothing;
  insert into public.teacher_lessons(teacher_id,title,type,category,level,language,price,capacity,description,is_published,scheduling_mode,duration_minutes,availability)
    values(auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,p_data->>'category',p_data->>'level',lesson_lang,price,capacity,p_data->>'description',true,mode,duration,windows) returning id into lesson_id;
  if mode='fixed' then
    insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
      values(lesson_id,auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,start_at,coalesce((p_data->>'durationMinutes')::int,50),capacity) returning id into session_id;
  end if;
  return jsonb_build_object('lessonId',lesson_id,'sessionId',session_id);
end $$;

commit;

notify pgrst,'reload schema';

