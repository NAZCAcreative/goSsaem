begin;

-- ─── 메인 화면 노출 관리: 추천 선생님 순서 + 배너 ────────────────────────────

alter table public.teacher_profiles add column if not exists featured_rank integer;
create index if not exists teacher_profiles_featured_rank_idx on public.teacher_profiles(featured_rank) where featured_rank is not null;

create table public.home_banner_settings (
  id boolean primary key default true check (id),
  tag text not null default 'LIVE' check (length(tag) <= 20),
  title text not null default 'K-POP으로 배우는 한국어
무료 라이브 클래스' check (length(title) <= 100),
  cta_label text not null default '지금 확인하기' check (length(cta_label) <= 30),
  cta_href text not null default '/student/search' check (left(cta_href, 1) = '/' and length(cta_href) <= 200),
  image_scene text not null default 'seoul' check (image_scene in ('cafe', 'desk', 'seoul')),
  is_active boolean not null default true,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles(id)
);
insert into public.home_banner_settings (id) values (true);

alter table public.home_banner_settings enable row level security;
revoke all on public.home_banner_settings from public, anon, authenticated;
create policy home_banner_settings_select_all on public.home_banner_settings for select using (true);
grant select on public.home_banner_settings to anon, authenticated;

-- teachers 목록에 featured_rank 노출 (admin_list 계약은 그대로 유지)
create or replace function public.admin_list(
  p_section text, p_page integer default 1, p_page_size integer default 20,
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
        u.last_sign_in_at,t.is_verified,t.featured_rank,a.status as review_status,a.updated_at as review_updated_at,t.headline,t.rating_avg,t.rating_count,t.specialties,
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
      if p_section='teachers' then base:=base||' where t.profile_id is not null';
      elsif p_section='students' then base:=base||' where p.role=''student'' or exists(select 1 from public.enrollments e where e.student_id=p.id)'; end if;
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
      base:=$q$select e.id,e.student_id,s.teacher_id,st.name as student_name,t.name as teacher_name,s.title,s.scheduled_at,e.status,e.package_type,e.created_at,
        concat_ws(' ',st.name,t.name,s.title,e.id::text) as _search,e.status::text as _status,array[e.student_id,s.teacher_id] as _members
        from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
        join public.profiles st on st.id=e.student_id join public.profiles t on t.id=s.teacher_id$q$;
    when 'payments' then
      base:=$q$select pay.id,pay.student_id,s.teacher_id,st.name as student_name,t.name as teacher_name,s.title,pay.amount,pay.currency,pay.method,pay.status,pay.pg_transaction_id,pay.verified_payment,pay.created_at,
        concat_ws(' ',st.name,t.name,s.title,pay.id::text,pay.pg_transaction_id) as _search,pay.status::text as _status,array[pay.student_id,s.teacher_id] as _members
        from public.payments pay join public.profiles st on st.id=pay.student_id
        left join public.enrollments e on e.id=pay.enrollment_id left join public.lesson_sessions s on s.id=e.session_id left join public.profiles t on t.id=s.teacher_id$q$;
    when 'settlements' then
      base:=$q$select s.id,s.teacher_id,p.name as teacher_name,s.period_start,s.period_end,s.gross_amount,s.platform_fee,s.net_amount,s.currency,s.verified_settlement,s.status,s.paid_at,s.created_at,
        concat_ws(' ',p.name,s.id::text) as _search,s.status::text as _status,array[s.teacher_id] as _members
        from public.settlements s join public.profiles p on p.id=s.teacher_id$q$;
    when 'withdrawals' then
      base:=$q$select w.id,w.teacher_id,p.name as teacher_name,w.amount,w.status,w.requested_at as created_at,w.processed_at,a.bank_name,a.account_holder,
        case when a.account_number is not null then '**** '||right(a.account_number,4) end as account_number,
        concat_ws(' ',p.name,w.id::text,a.bank_name) as _search,w.status::text as _status,array[w.teacher_id] as _members
        from public.withdrawal_requests w join public.profiles p on p.id=w.teacher_id left join public.settlement_accounts a on a.teacher_id=w.teacher_id$q$;
    when 'reviews' then
      base:=$q$select r.id,r.student_id,r.teacher_id,st.name as student_name,t.name as teacher_name,r.rating,r.text,r.teacher_reply,r.created_at,
        concat_ws(' ',st.name,t.name,r.text,r.id::text) as _search,case when r.rating<=2 then 'low' when r.teacher_reply is null then 'unanswered' else 'replied' end as _status,
        array[r.student_id,r.teacher_id] as _members from public.reviews r join public.profiles st on st.id=r.student_id join public.profiles t on t.id=r.teacher_id$q$;
    when 'coupons' then
      base:=$q$select c.id,c.code,c.title,c.discount_type,c.discount_value,c.min_order_amount,c.expires_at,c.is_active,c.created_at,
        (select count(*) from public.user_coupons uc where uc.coupon_id=c.id) as issued,
        concat_ws(' ',c.title,c.code,c.id::text) as _search,case when not c.is_active then 'inactive' when c.expires_at<now() then 'expired' else 'active' end as _status,
        array[]::uuid[] as _members from public.coupons c$q$;
    when 'tickets' then
      base:=$q$select s.*,p.name as requester_name,p.role as requester_role,
        concat_ws(' ',p.name,s.title,s.body,s.response,s.id::text) as _search,s.status as _status,array[s.requester_id] as _members
        from public.support_tickets s join public.profiles p on p.id=s.requester_id$q$;
    when 'audit' then
      base:=$q$select a.id,a.actor_id,p.name as actor_name,a.action,a.target_id,a.reason,a.before_data,a.after_data,a.created_at,
        concat_ws(' ',p.name,a.action,a.reason,a.target_id::text) as _search,a.action as _status,array[a.target_id] as _members
        from public.admin_audit_logs a join public.profiles p on p.id=a.actor_id$q$;
    else raise exception 'Invalid admin section';
  end case;
  predicate:=' where ($1='''' or position(lower($1) in lower(coalesce(b._search,'''')))>0)
    and ($2='''' or b._status=$2) and ($3 is null or b.created_at>=($3::timestamp at time zone ''Asia/Seoul''))
    and ($4 is null or b.created_at<(($4+1)::timestamp at time zone ''Asia/Seoul''))
    and ($5 is null or $5=any(b._members))';
  execute 'select count(*) from ('||base||') b'||predicate into total using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id;
  page:=greatest(1,least(coalesce(p_page,1),greatest(1,ceil(total::numeric/size)::integer)));
  execute 'select coalesce(jsonb_agg(to_jsonb(r)-''_search''-''_status''-''_members''),''[]''::jsonb) from
    (select b.* from ('||base||') b'||predicate||' order by b.created_at desc,b.id desc limit $6 offset $7) r'
    into rows using coalesce(trim(p_query),''),coalesce(p_status,''),p_from,p_to,p_member_id,size,(page-1)*size;
  return jsonb_build_object('rows',rows,'total',total,'page',page,'pageSize',size);
end;
$$;

-- admin_mutate에 teacher_featured(메인 노출 순서)/home_banner(배너 내용) 액션 추가
alter function public.admin_mutate(text,uuid,jsonb,text,jsonb) rename to admin_mutate_legacy2;
revoke all on function public.admin_mutate_legacy2(text,uuid,jsonb,text,jsonb) from public,anon,authenticated;

create function public.admin_mutate(p_action text,p_id uuid,p_data jsonb,p_reason text,p_expected jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous jsonb; result jsonb; rank integer;
begin
  if not public.admin_is_authorized() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_action not in ('teacher_featured','home_banner') then
    return public.admin_mutate_legacy2(p_action,p_id,p_data,p_reason,p_expected);
  end if;
  if length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>500 then raise exception 'A reason of 3 to 500 characters is required'; end if;
  if p_expected is null then raise exception 'Expected previous value is required'; end if;

  if p_action='teacher_featured' then
    if not(p_expected ? 'featured_rank') then raise exception 'Expected rank required'; end if;
    select to_jsonb(t) into previous from public.teacher_profiles t where profile_id=p_id for update;
    if previous is null then raise exception 'Teacher not found' using errcode='P0002'; end if;
    if not(previous @> p_expected) then raise exception 'Record changed; refresh before saving' using errcode='40001'; end if;
    if p_data->'featured_rank' is null or jsonb_typeof(p_data->'featured_rank')='null' then
      rank:=null;
    elsif jsonb_typeof(p_data->'featured_rank')='number' then
      rank:=(p_data->>'featured_rank')::integer;
      if rank<1 or rank>999 then raise exception 'Rank must be between 1 and 999'; end if;
    else raise exception 'Invalid rank';
    end if;
    update public.teacher_profiles set featured_rank=rank where profile_id=p_id returning to_jsonb(teacher_profiles.*) into result;
  else
    if not(p_expected ? 'updated_at') then raise exception 'Expected timestamp required'; end if;
    select to_jsonb(s) into previous from public.home_banner_settings s where id=true for update;
    if not(previous @> p_expected) then raise exception 'Record changed; refresh before saving' using errcode='40001'; end if;
    if length(trim(coalesce(p_data->>'title','')))<1 or length(p_data->>'title')>100
      or length(trim(coalesce(p_data->>'cta_label','')))<1 or length(p_data->>'cta_label')>30
      or length(trim(coalesce(p_data->>'cta_href','')))<1 or length(p_data->>'cta_href')>200 or left(p_data->>'cta_href',1)<>'/'
      or coalesce(p_data->>'image_scene','') not in ('cafe','desk','seoul') or length(coalesce(p_data->>'tag',''))>20
      or jsonb_typeof(p_data->'is_active')<>'boolean'
    then raise exception 'Invalid banner content'; end if;
    update public.home_banner_settings set
      tag=trim(coalesce(p_data->>'tag','')), title=trim(p_data->>'title'), cta_label=trim(p_data->>'cta_label'),
      cta_href=trim(p_data->>'cta_href'), image_scene=p_data->>'image_scene', is_active=(p_data->>'is_active')::boolean,
      updated_at=clock_timestamp(), updated_by=auth.uid()
      where id=true returning to_jsonb(home_banner_settings.*) into result;
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_id,reason,before_data,after_data)
    values(auth.uid(),p_action,p_id,trim(p_reason),previous,result);
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.admin_mutate(text,uuid,jsonb,text,jsonb) from public,anon;
grant execute on function public.admin_mutate(text,uuid,jsonb,text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
