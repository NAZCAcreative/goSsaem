-- Verify the existing account without changing its teacher role or retaining test data.
begin;
do $$
declare target uuid; ordinary uuid := gen_random_uuid(); result jsonb;
begin
  select id into target from auth.users where lower(email)='nazca4902@naver.com';
  assert target is not null, 'Requested account must exist';
  assert exists(select 1 from public.profiles where id=target and role='teacher'), 'Teacher role must be preserved';
  perform set_config('request.jwt.claim.sub',target::text,true);
  assert public.admin_is_authorized(), 'Requested teacher must have admin access';
  result := public.admin_dashboard();
  assert result is not null, 'Admin dashboard must load';
  result := public.admin_list('members');
  assert result is not null, 'Admin member list must load';
  insert into auth.users(id,email,raw_user_meta_data) values (ordinary,ordinary::text||'@admin-test.example.invalid','{"name":"Ordinary teacher","role":"teacher"}');
  perform set_config('request.jwt.claim.sub',ordinary::text,true);
  assert not public.admin_is_authorized(), 'Ordinary teacher must not have admin access';
  begin
    perform public.admin_dashboard();
    raise exception 'Ordinary teacher unexpectedly accessed dashboard';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  assert not public.admin_is_authorized(), 'Anonymous caller must not have admin access';
end $$;
rollback;
