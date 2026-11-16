begin;
-- Deliberately project public fields only; never expose meeting URLs or enrollments.
create or replace function public.public_lesson_catalog(p_filters jsonb default '{}'::jsonb, p_lesson uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
with catalog as (
 select l.id,l.teacher_id,l.title,l.description,l.category,l.level,l.type,l.price,l.currency,
 l.duration_minutes,l.capacity,l.image_url,l.scheduling_mode,l.supported_languages,l.created_at,
 p.name as teacher_name,
 coalesce(sl.sessions,'[]'::jsonb) as sessions,sl.next_start
 from public.teacher_lessons l join public.profiles p on p.id=l.teacher_id
 join public.teacher_applications a on a.profile_id=l.teacher_id and a.status='approved'
 left join lateral (
   select jsonb_agg(jsonb_build_object('id',x.id,'start',x.scheduled_at,'duration',x.duration_minutes,'capacity',x.capacity,'remaining',x.remaining) order by x.scheduled_at,x.id) as sessions,
   min(x.scheduled_at) filter(where x.remaining>0) as next_start
   from (select s.id,s.scheduled_at,s.duration_minutes,s.capacity,
     greatest(0,s.capacity-(select count(*) from public.enrollments e where e.session_id=s.id and (e.status in ('confirmed','completed') or (e.status='pending_payment' and e.expires_at>now())))) as remaining
     from public.lesson_sessions s where s.teacher_lesson_id=l.id and s.teacher_id=l.teacher_id
     and s.status='scheduled' and s.scheduled_at>now()
     and (s.scheduled_at at time zone 'Asia/Seoul')::date <= (now() at time zone 'Asia/Seoul')::date+180
   ) x
 ) sl on true
 where l.is_published and p.role='teacher'
), filtered as (
 select c.*, (select min((s->>'start')::timestamptz) from jsonb_array_elements(c.sessions) s
   where (s->>'remaining')::int>0 and (coalesce(p_filters->>'day','')='' or ((s->>'start')::timestamptz at time zone 'Asia/Seoul')::date::text=p_filters->>'day')) as matching_start
 from catalog c where (p_lesson is null or c.id=p_lesson)
 and (p_lesson is not null or (
   (coalesce(p_filters->>'type','group')='all' or c.type::text=coalesce(p_filters->>'type','group'))
   and (coalesce(p_filters->>'category','')='' or c.category=p_filters->>'category')
   and (coalesce(p_filters->>'level','')='' or coalesce(nullif(c.level,''),'누구나')=p_filters->>'level')
   and not exists(select 1 from regexp_split_to_table(lower(trim(coalesce(p_filters->>'q',''))), '\s+') term
     where term<>'' and strpos(lower(concat_ws(' ',c.title,c.category,c.description)),term)=0)
   and (coalesce(p_filters->>'price','all')='all' or (c.currency='KRW' and (
     (p_filters->>'price'='free' and c.price=0) or (p_filters->>'price'='low' and c.price<=20000)
     or (p_filters->>'price'='mid' and c.price>20000 and c.price<=40000) or (p_filters->>'price'='high' and c.price>40000))))
   and (coalesce(p_filters->>'day','')='' or exists(select 1 from jsonb_array_elements(c.sessions) s
     where ((s->>'start')::timestamptz at time zone 'Asia/Seoul')::date::text=p_filters->>'day' and (s->>'remaining')::int>0))
   and (coalesce(p_filters->>'scheduled','false')<>'true' or c.next_start is not null)
 ))
), page as (
 select * from filtered order by
 case when p_filters->>'sort'='price' then currency end asc,
 case when p_filters->>'sort'='price' then price end asc,
 case when coalesce(p_filters->>'sort','upcoming')='upcoming' then matching_start end asc nulls last,
 created_at desc,id
 limit 12 offset ((greatest(1,least(coalesce(nullif(p_filters->>'page','')::int,1),100000))-1)*12)
)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p)-'created_at'-'matching_start') from page p),'[]'::jsonb),
 'total',(select count(*) from filtered),
 'categories',coalesce((select jsonb_agg(category order by category) from (select distinct category from catalog where category is not null and category<>'') q),'[]'::jsonb),
 'levels',coalesce((select jsonb_agg(level order by level) from (select distinct coalesce(nullif(level,''),'누구나') as level from catalog) q),'[]'::jsonb));
$$;
revoke all on function public.public_lesson_catalog(jsonb,uuid) from public;
grant execute on function public.public_lesson_catalog(jsonb,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
