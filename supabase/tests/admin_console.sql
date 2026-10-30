-- Runs against the configured project and rolls every test mutation back.
begin;
insert into public.coupons(code,title,discount_type,discount_value)
values ('ADMIN_TEST_'||gen_random_uuid()::text,'관리자 트랜잭션 검증','fixed',1000);
set local role authenticated;
select set_config('request.jwt.claim.sub','3429c1b9-9b35-45dd-87fb-64fccf769a9a',true);
do $$
declare s text; r jsonb; r2 jsonb; m jsonb; n jsonb; t uuid; seen integer;
begin
  assert public.admin_is_authorized(), 'Owner must be authorized';
  assert (public.admin_dashboard()->>'members')::int>=156, 'Dashboard counts';
  foreach s in array array['members','students','teachers','lessons','sessions','bookings','payments','settlements','withdrawals','reviews','coupons','audit'] loop
    r:=public.admin_list(s,1,10);
    assert jsonb_array_length(r->'rows')<=10, 'Page limit: '||s;
    assert (r->>'page')::int=1, 'First page: '||s;
    r2:=public.admin_list(s,2147483647,10);
    assert (r2->>'page')::int=greatest(1,ceil((r->>'total')::numeric/10)::int), 'Page clamping: '||s;
  end loop;
  r:=public.admin_list('teachers',1,10);
  r2:=public.admin_list('teachers',2,10);
  select count(*) into seen from jsonb_array_elements(r->'rows') a join jsonb_array_elements(r2->'rows') b on a->>'id'=b->>'id';
  assert seen=0,'Pagination overlap';
  assert (public.admin_list('students',1,20,'박대건')->>'total')::int=1, 'Member search';
  assert (public.admin_list('teachers',1,20,$q$' OR 1=1 --$q$)->>'total')::int=0, 'Literal search';
  m:=public.admin_member('3429c1b9-9b35-45dd-87fb-64fccf769a9a');
  perform public.admin_mutate('note','3429c1b9-9b35-45dd-87fb-64fccf769a9a','{"note":"transactional admin test"}','관리 기능 검증',jsonb_build_object('updated_at',m->'noteUpdatedAt'));
  assert public.admin_member('3429c1b9-9b35-45dd-87fb-64fccf769a9a')->>'note'='transactional admin test','Note persistence';
  begin
    perform public.admin_mutate('note','3429c1b9-9b35-45dd-87fb-64fccf769a9a','{"note":"stale"}','동시 수정 검증',jsonb_build_object('updated_at',m->'noteUpdatedAt'));
    raise exception 'Stale mutation must fail';
  exception when serialization_failure then null; end;
  t:=(r->'rows'->0->>'id')::uuid;
  m:=public.admin_member(t);
  perform public.admin_mutate('teacher_review',t,jsonb_build_object('status',case when (m->'teacher'->>'is_verified')::boolean then 'review_pending' else 'approved' end,'feedback','Review regression check'),'인증 처리 검증',jsonb_build_object('updated_at',m->'application'->'updated_at'));
  n:=public.admin_member(t);
  assert (m->'teacher'->>'is_verified')::boolean<>(n->'teacher'->>'is_verified')::boolean,'Verification persistence';
  m:=public.admin_member('3429c1b9-9b35-45dd-87fb-64fccf769a9a');
  perform public.admin_mutate('profile','3429c1b9-9b35-45dd-87fb-64fccf769a9a',jsonb_build_object('name',m->'profile'->>'name','native_language','TEST','korean_level','beginner'),'회원 변경 검증',jsonb_build_object('updated_at',m->'profile'->'updated_at'));
  assert public.admin_member('3429c1b9-9b35-45dd-87fb-64fccf769a9a')->'profile'->>'native_language'='TEST','Profile update';
  r:=public.admin_list('lessons',1,10); t:=(r->'rows'->0->>'id')::uuid;
  perform public.admin_mutate('lesson_published',t,jsonb_build_object('is_published',not (r->'rows'->0->>'is_published')::boolean),'수업 공개 검증',jsonb_build_object('is_published',r->'rows'->0->'is_published'));
  r2:=public.admin_list('lessons',1,10,t::text);
  assert (r2->'rows'->0->>'is_published')::boolean<>(r->'rows'->0->>'is_published')::boolean,'Lesson visibility';
  r:=public.admin_list('coupons',1,10,'ADMIN_TEST_'); t:=(r->'rows'->0->>'id')::uuid;
  perform public.admin_mutate('coupon_active',t,'{"is_active":false}','쿠폰 상태 검증','{"is_active":true}');
  r2:=public.admin_list('coupons',1,10,t::text);
  assert not (r2->'rows'->0->>'is_active')::boolean,'Coupon update';
  r:=public.admin_list('teachers',1,50,'','approved');
  assert not exists(select 1 from jsonb_array_elements(r->'rows') a where not (a->>'is_verified')::boolean),'Status filter';
  r:=public.admin_list('teachers',1,10,'','','1900-01-01','1900-01-02');
  assert (r->>'total')::int=0,'Date filter';
  r:=public.admin_list('teachers',1,10,'','',null,null,'4e827ccb-c588-49c0-a78c-be9cde1a772e');
  assert (r->>'total')::int=1,'Related member filter';
  r:=public.admin_list('audit',1,10,'관리 기능 검증');
  assert (r->>'total')::int>=1,'Audit inserted';
  raise notice 'Admin dashboard, all lists, paging, search, note, verification, conflict and audit checks passed';
end $$;

select set_config('request.jwt.claim.sub','4e827ccb-c588-49c0-a78c-be9cde1a772e',true);
do $$
begin
  assert not public.admin_is_authorized(),'Other teacher must not be admin';
  -- Neither changing the display name nor attempting a role change grants access.
  update public.profiles set name='박대건' where id=auth.uid();
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'Account role must be immutable';
  exception when insufficient_privilege then null; end;
  assert not public.admin_is_authorized(),'Name and role impersonation must not grant access';
  begin perform public.admin_dashboard(); raise exception 'Unauthorized dashboard'; exception when insufficient_privilege then null; end;
  begin perform public.admin_list('students'); raise exception 'Unauthorized list'; exception when insufficient_privilege then null; end;
  begin perform public.admin_member(auth.uid()); raise exception 'Unauthorized detail'; exception when insufficient_privilege then null; end;
  begin perform public.admin_mutate('note',auth.uid(),'{"note":"forbidden"}','unauthorized','{"updated_at":null}'); raise exception 'Unauthorized mutation'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.admin_profile_notes; raise exception 'Unauthorized notes'; exception when insufficient_privilege then null; end;
  begin insert into public.admin_members(profile_id) values(auth.uid()); raise exception 'Unauthorized grant'; exception when insufficient_privilege then null; end;
  begin update public.teacher_profiles set is_verified=not is_verified where profile_id=auth.uid(); raise exception 'Unauthorized self-verification'; exception when insufficient_privilege then null; end;
  raise notice 'Non-admin identity spoofing, RPC and direct table access checks passed';
end $$;
rollback;
select 'Admin dashboard, 12 paged lists, 5 mutations, audit, filters, conflicts and access checks passed; all test mutations rolled back' as result;
