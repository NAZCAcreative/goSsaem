begin;
create or replace function public.admin_class_list(
  p_section text, p_sort text, p_type text, p_page integer default 1, p_page_size integer default 20,
  p_query text default '', p_status text default '', p_from date default null,
  p_to date default null, p_member_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  base text; predicate text; total bigint; rows jsonb; page integer; size integer;
begin
  if not public.admin_is_authorized() then raise exception 'Admin access required' using errcode='42501'; end if;
  if length(coalesce(p_query,''))>100 then raise exception 'Search is too long'; end if;
  if p_from is not null and p_to is not null and p_from>p_to then raise exception 'Invalid date range'; end if;
  size:=case when p_page_size in (10,20,50) then p_page_size else 20 end;
  case p_section
    when 'lessons' then
      base:=$q$select l.id,l.teacher_id,p.name as teacher_name,l.title,l.type,l.category,l.price,l.currency,l.capacity,l.is_published,l.created_at,l.updated_at,
        concat_ws(' ',l.title,l.category,p.name,l.id::text) as _search,
        case when l.is_published then 'published' else 'unpublished' end as _status,array[l.teacher_id] as _members
        from public.teacher_lessons l join public.profiles p on p.id=l.teacher_id$q$;
    when 'sessions' then
      base:=$q$select s.id,s.teacher_id,p.name as teacher_name,s.title,s.type,s.scheduled_at,s.duration_minutes,s.capacity,s.enrolled_count,s.status,s.created_at,
        concat_ws(' ',s.title,p.name,s.id::text) as _search,s.status::text as _status,array[s.teacher_id] as _members
        from public.lesson_sessions s join public.profiles p on p.id=s.teacher_id$q$;
    when 'bookings' then
      base:=$q$select e.id,e.student_id,s.teacher_id,st.name as student_name,t.name as teacher_name,s.title,s.scheduled_at,e.status,e.package_type,s.type,e.created_at,
        concat_ws(' ',st.name,t.name,s.title,e.id::text) as _search,e.status::text as _status,array[e.student_id,s.teacher_id] as _members
        from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
        join public.profiles st on st.id=e.student_id join public.profiles t on t.id=s.teacher_id$q$;
    else raise exception 'Invalid admin section';
  end case;
  predicate:=' where ($1='''' or position(lower($1) in lower(coalesce(b._search,'''')))>0)
    and ($2='''' or b._status=$2) and ($3 is null or '||case when p_section='sessions' then 'b.scheduled_at' else 'b.created_at' end||'>=($3::timestamp at time zone ''Asia/Seoul''))
    and ($4 is null or '||case when p_section='sessions' then 'b.scheduled_at' else 'b.created_at' end||'<(($4+1)::timestamp at time zone ''Asia/Seoul''))
    and ($5 is null or $5=any(b._members)) and ($6='''' or b.type::text=$6)';
  execute 'select count(*) from ('||base||') b'||predicate into total using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id,coalesce(p_type,'');
  page:=greatest(1,least(coalesce(p_page,1),greatest(1,ceil(total::numeric/size)::integer)));
  execute 'select coalesce(jsonb_agg(to_jsonb(r)-''_search''-''_status''-''_members''),''[]''::jsonb) from
    (select b.* from ('||base||') b'||predicate||' order by '||(case p_sort when 'oldest' then 'b.created_at asc' when 'title' then 'lower(b.title) asc' when 'price_low' then case when p_section='lessons' then 'b.price asc' else 'b.created_at desc' end when 'price_high' then case when p_section='lessons' then 'b.price desc' else 'b.created_at desc' end when 'time_asc' then case when p_section<>'lessons' then 'b.scheduled_at asc' else 'b.created_at desc' end when 'time_desc' then case when p_section<>'lessons' then 'b.scheduled_at desc' else 'b.created_at desc' end else 'b.created_at desc' end)||',b.id desc limit $7 offset $8) r'
    into rows using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id,coalesce(p_type,''),size,(page-1)*size;
  return jsonb_build_object('rows',rows,'total',total,'page',page,'pageSize',size);
end;
$$;
revoke all on function public.admin_class_list(text,text,text,integer,integer,text,text,date,date,uuid) from public,anon;
grant execute on function public.admin_class_list(text,text,text,integer,integer,text,text,date,date,uuid) to authenticated;
commit;
