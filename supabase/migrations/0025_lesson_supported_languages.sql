begin;

-- 지원 언어(대응 언어), 대표 이미지 URL, 영상 링크 컬럼 추가
alter table public.teacher_lessons
  add column if not exists supported_languages text[] not null default array['한국어']::text[],
  add column if not exists image_url text,
  add column if not exists video_url text;

-- 수업 생성 함수 갱신: supportedLanguages, imageUrl, videoUrl, language 파라미터 지원 & 날짜 3개월 제한 & 관리자 수정 카테고리 지원
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
  img_url text := nullif(trim(coalesce(p_data->>'imageUrl', '')), '');
  vid_url text := nullif(trim(coalesce(p_data->>'videoUrl', '')), '');
  supported_langs text[];
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  price:=(p_data->>'price')::integer;
  capacity:=(p_data->>'capacity')::integer;
  start_at:=(p_data->>'scheduledAt')::timestamptz;
  
  -- 현재일 기준 최대 3개월(약 93일) 이내만 수업 개설 가능
  if price is null or price<0 or price>10000000 or capacity is null or capacity<1 or capacity>100 or (mode='fixed' and (start_at is null or start_at<=now() or start_at>now()+interval '3 months')) or length(trim(coalesce(p_data->>'title','')))<2 then raise exception 'Invalid lesson'; end if;
  if p_data->>'type'='free_trial' and price<>0 then raise exception 'Free trial must be free'; end if;
  if mode not in ('fixed','request') or duration is null or duration<10 or duration>240 or length(trim(coalesce(p_data->>'category','')))<1 then raise exception 'Invalid lesson settings'; end if;
  if mode='request' and (jsonb_typeof(windows)<>'array' or jsonb_array_length(windows)=0) then raise exception 'Availability required'; end if;
  if mode='fixed' then windows := '[]'::jsonb; end if;

  -- 대응 언어 파싱 (jsonb 배열 -> text[])
  if p_data ? 'supportedLanguages' and jsonb_typeof(p_data->'supportedLanguages') = 'array' then
    select coalesce(array_agg(elem::text), array['한국어']::text[])
      into supported_langs
      from jsonb_array_elements_text(p_data->'supportedLanguages') as elem;
  else
    supported_langs := array['한국어']::text[];
  end if;

  perform 1 from public.profiles where id=auth.uid() for update;
  insert into public.teacher_profiles(profile_id) values(auth.uid()) on conflict do nothing;
  insert into public.teacher_lessons(teacher_id,title,type,category,level,language,supported_languages,image_url,video_url,price,capacity,description,is_published,scheduling_mode,duration_minutes,availability)
    values(auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,p_data->>'category',p_data->>'level',lesson_lang,supported_langs,img_url,vid_url,price,capacity,p_data->>'description',true,mode,duration,windows) returning id into lesson_id;
  if mode='fixed' then
    insert into public.lesson_sessions(teacher_lesson_id,teacher_id,title,type,scheduled_at,duration_minutes,capacity)
      values(lesson_id,auth.uid(),trim(p_data->>'title'),(p_data->>'type')::public.lesson_type,start_at,coalesce((p_data->>'durationMinutes')::int,50),capacity) returning id into session_id;
  end if;
  return jsonb_build_object('lessonId',lesson_id,'sessionId',session_id);
end $$;

commit;

notify pgrst,'reload schema';
