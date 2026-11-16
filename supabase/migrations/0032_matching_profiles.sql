begin;
create function public.valid_matching_languages(value jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(value)='array' and jsonb_array_length(value)<=10 and not exists(
 select 1 from jsonb_array_elements(value) x where jsonb_typeof(x)<>'object'
 or coalesce(x->>'language','') not in ('ko','en','zh','ja','es','vi','th','fr','de','ru')
 or coalesce(x->>'level','') not in ('A1','A2','B1','B2','C1','C2','native'))
 and (select count(*)=count(distinct x->>'language') from jsonb_array_elements(value) x);
$$;
create table public.matching_profiles (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 languages jsonb not null default '[]' check(public.valid_matching_languages(languages)),
 communication_language text not null default '' check(communication_language in ('','ko','en','zh','ja','es','vi','th','fr','de','ru')),
 interests text[] not null default '{}' check(cardinality(interests)<=8 and interests <@ array['여행','음악','드라마·영화','음식','문화·역사','독서','게임','운동','일·비즈니스','일상생활','예술','기술']),
 goals text[] not null default '{}' check(cardinality(goals)<=5 and goals <@ array['일상 회화','여행 회화','시험 준비','취업·비즈니스','발음 개선','문법·쓰기','문화 이해']),
 styles text[] not null default '{}' check(cardinality(styles)<=5 and styles <@ array['대화 중심','체계적인 설명','활동·게임','반복 연습','즉각적인 피드백','천천히 차근차근']),
 traits text[] not null default '{}' check(cardinality(traits)<=5 and traits <@ array['차분한','활기찬','꼼꼼한','유연한','공감하는','목표 지향적인']),
 teaching_levels text[] not null default '{}' check(teaching_levels <@ array['입문','초급','중급','고급'] and cardinality(teaching_levels)<=4),
 mbti text not null default '' check(mbti='' or mbti ~ '^[IE][NS][FT][JP]$'),
 matching_enabled boolean not null default false,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.matching_profiles enable row level security;
revoke all on public.matching_profiles from public,anon;
grant select,insert,update,delete on public.matching_profiles to authenticated;
create policy matching_owner on public.matching_profiles for all to authenticated using(profile_id=(select auth.uid())) with check(profile_id=(select auth.uid()));
create function public.matching_profile_updated() returns trigger language plpgsql security definer set search_path='' as $$
declare korean text;
begin
 new.updated_at:=clock_timestamp();
 select x->>'level' into korean from jsonb_array_elements(new.languages) x where x->>'language'='ko';
 if korean is not null then
 update public.profiles set korean_level=(case korean when 'A1' then 'beginner' when 'A2' then 'elementary' when 'B1' then 'intermediate' else 'advanced' end)::public.korean_level where id=new.profile_id and role='student';
 end if;
 return new;
end $$;
create trigger matching_profile_updated before insert or update on public.matching_profiles for each row execute function public.matching_profile_updated();

create or replace function public.my_lesson_recommendations() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me public.matching_profiles; learner_level text;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select * into me from public.matching_profiles where profile_id=auth.uid() and matching_enabled;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return '[]'::jsonb; end if;
 select case korean_level when 'beginner' then '입문' when 'elementary' then '초급' when 'intermediate' then '중급' when 'advanced' then '고급' when 'topik1' then '초급' else '중급' end into learner_level from public.profiles where id=auth.uid();
 return (with candidates as (
 select l.id,l.created_at,
 array(select distinct x from unnest(me.interests) x where x=any(t.interests) or lower(concat_ws(' ',l.title,l.category,l.description)) like '%'||lower(x)||'%' or (x='음악' and concat_ws(' ',l.title,l.category,l.description) ~* 'k.?pop|노래|가사') or (x='드라마·영화' and concat_ws(' ',l.title,l.category,l.description) ~* '드라마|영화|drama')) as shared_interests,
 array(select distinct x from unnest(me.goals) x where x=any(t.goals) and concat_ws(' ',l.title,l.category,l.description) ~* case x
 when '일상 회화' then '일상|회화|대화|말하기|conversation|speaking'
 when '여행 회화' then '여행|관광|travel' when '시험 준비' then '시험|topik|토픽|exam'
 when '취업·비즈니스' then '취업|면접|직장|비즈니스|business|interview'
 when '발음 개선' then '발음|pronunciation' when '문법·쓰기' then '문법|쓰기|작문|grammar|writing'
 else '문화|역사|culture|history' end) as shared_goals,
 array(select distinct x from unnest(me.styles) x where x=any(t.styles)) as shared_styles,
 array(select distinct x from unnest(me.traits) x where x=any(t.traits)) as shared_traits,
 (me.communication_language<>'' and exists(select 1 from jsonb_array_elements(t.languages) x where x->>'language'=me.communication_language and x->>'level' in ('B2','C1','C2','native'))
 and exists(select 1 from unnest(l.supported_languages) lang where lower(lang)=any(case me.communication_language
 when 'ko' then array['ko','한국어','korean'] when 'en' then array['en','영어','english'] when 'zh' then array['zh','중국어','chinese'] when 'ja' then array['ja','일본어','japanese'] when 'es' then array['es','스페인어','spanish'] when 'vi' then array['vi','베트남어','vietnamese'] when 'th' then array['th','태국어','thai'] when 'fr' then array['fr','프랑스어','french'] when 'de' then array['de','독일어','german'] else array['ru','러시아어','russian'] end))) as language_fit,
 (learner_level=any(t.teaching_levels) and (coalesce(l.level,'') in ('','누구나','전체') or strpos(l.level,learner_level)>0)) as level_fit
 from public.teacher_lessons l join public.teacher_applications a on a.profile_id=l.teacher_id and a.status='approved'
 join public.matching_profiles t on t.profile_id=l.teacher_id and t.matching_enabled
 join public.profiles p on p.id=l.teacher_id and p.role='teacher'
 where l.is_published and l.teacher_id<>auth.uid() and (l.scheduling_mode='request' or exists(
 select 1 from public.lesson_sessions s where s.teacher_lesson_id=l.id and s.status='scheduled' and s.scheduled_at>now()
 and (s.scheduled_at at time zone 'Asia/Seoul')::date<=(now() at time zone 'Asia/Seoul')::date+180
 and (select count(*) from public.enrollments e where e.session_id=s.id and (e.status in ('confirmed','completed') or (e.status='pending_payment' and e.expires_at>now())))<s.capacity))
 ), ranked as (
 select *, least(cardinality(shared_interests),3)*10+least(cardinality(shared_goals),2)*15+least(cardinality(shared_styles),2)*10+least(cardinality(shared_traits),1)*5+(case when language_fit then 20 else 0 end)+(case when level_fit then 15 else 0 end) as score
 from candidates
 ), best as (select * from ranked where score>0 order by score desc,created_at desc,id limit 6)
 select coalesce(jsonb_agg(jsonb_build_object('lesson',public.public_lesson_catalog('{}',b.id)->'items'->0,
 'reasons',array_remove(array[
 case when cardinality(shared_interests)>0 then '관심사: '||array_to_string(shared_interests,', ') end,
 case when cardinality(shared_goals)>0 then '학습 목표: '||array_to_string(shared_goals,', ') end,
 case when cardinality(shared_styles)>0 then '수업 방식: '||array_to_string(shared_styles,', ') end,
 case when language_fit then '선호하는 소통 언어를 지원하는 수업과 선생님' end,
 case when level_fit then '현재 한국어 레벨에 맞는 지도 대상' end,
 case when cardinality(shared_traits)>0 then '선호하는 수업 분위기: '||array_to_string(shared_traits,', ') end],null)) order by score desc,created_at desc,id),'[]'::jsonb) from best b);
end $$;
revoke all on function public.my_lesson_recommendations() from public,anon;
grant execute on function public.my_lesson_recommendations() to authenticated;
comment on table public.matching_profiles is 'Private self-reported matching preferences. MBTI is optional and excluded from recommendation scores. Opt-in teachers may produce matching reasons for opted-in learners.';
notify pgrst,'reload schema';
commit;
