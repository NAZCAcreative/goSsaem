begin;
create or replace function public.admin_member_list(
  p_section text, p_sort text, p_page integer default 1, p_page_size integer default 20,
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
    when 'members','students','teachers' then
      base:=$q$select p.id,p.name,u.email,p.avatar_url,p.avatar_is_generated,p.native_language,p.korean_level,p.role,p.created_at,p.updated_at,
        u.last_sign_in_at,t.is_verified,a.status as review_status,a.updated_at as review_updated_at,t.headline,t.rating_avg,t.rating_count,t.specialties,
        (select count(*) from public.enrollments e where e.student_id=p.id) as bookings,
        (select count(*) from public.teacher_lessons l where l.teacher_id=p.id) as lessons,
        (n.profile_id is not null and n.note<>'') as has_note,
        concat_ws(' ',p.name,u.email,p.id::text,p.native_language,t.headline,array_to_string(t.specialties,' ')) as _search,
        a.status as _status,
        array[p.id] as _members
        from public.profiles p join auth.users u on u.id=p.id
        left join public.teacher_profiles t on t.profile_id=p.id
        left join public.admin_profile_notes n on n.profile_id=p.id
        left join public.teacher_applications a on a.profile_id=p.id$q$;
      if p_section='teachers' then base:=base||' where p.role=''teacher''';
      elsif p_section='students' then base:=base||' where p.role=''student'''; end if;
    else raise exception 'Invalid admin section';
  end case;
  predicate:=' where ($1='''' or position(lower($1) in lower(coalesce(b._search,'''')))>0)
    and ($2='''' or b._status=$2) and ($3 is null or b.created_at>=($3::timestamp at time zone ''Asia/Seoul''))
    and ($4 is null or b.created_at<(($4+1)::timestamp at time zone ''Asia/Seoul''))
    and ($5 is null or $5=any(b._members))';
  execute 'select count(*) from ('||base||') b'||predicate into total using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id;
  page:=greatest(1,least(coalesce(p_page,1),greatest(1,ceil(total::numeric/size)::integer)));
  execute 'select coalesce(jsonb_agg(to_jsonb(r)-''_search''-''_status''-''_members''),''[]''::jsonb) from
    (select b.* from ('||base||') b'||predicate||' order by '||(case p_sort when 'oldest' then 'b.created_at asc' when 'name' then 'lower(b.name) asc nulls last' when 'bookings' then 'b.bookings desc' when 'lessons' then 'b.lessons desc' else 'b.created_at desc' end)||',b.id desc limit $6 offset $7) r'
    into rows using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id,size,(page-1)*size;
  return jsonb_build_object('rows',rows,'total',total,'page',page,'pageSize',size);
end;
$$;
revoke all on function public.admin_member_list(text,text,integer,integer,text,text,date,date,uuid) from public,anon;
grant execute on function public.admin_member_list(text,text,integer,integer,text,text,date,date,uuid) to authenticated;
commit;
