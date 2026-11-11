-- All fixtures and writes are rolled back, including auth/profile records.
begin;
select set_config('test.portfolio_owner', gen_random_uuid()::text, true);
select set_config('test.portfolio_other', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data) values
  (current_setting('test.portfolio_owner')::uuid, current_setting('test.portfolio_owner') || '@example.test', '{"role":"teacher","name":"Portfolio test"}'),
  (current_setting('test.portfolio_other')::uuid, current_setting('test.portfolio_other') || '@example.test', '{"role":"teacher","name":"Other test"}');
insert into public.profiles(id, name, role, active_role) values
  (current_setting('test.portfolio_owner')::uuid, 'Portfolio test', 'teacher', 'teacher'),
  (current_setting('test.portfolio_other')::uuid, 'Other test', 'teacher', 'teacher') on conflict (id) do nothing;
insert into public.teacher_profiles(profile_id) values
  (current_setting('test.portfolio_owner')::uuid), (current_setting('test.portfolio_other')::uuid) on conflict (profile_id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.portfolio_owner'), true);
insert into public.teacher_portfolio_entries(teacher_id, kind, title, is_public) values
  (current_setting('test.portfolio_owner')::uuid, 'career', 'Private test', false),
  (current_setting('test.portfolio_owner')::uuid, 'work', 'Public test', true);
do $$ begin
  if (select count(*) from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid) <> 2 then raise exception 'Owner must read both entries'; end if;
end $$;
update public.teacher_portfolio_entries set description='Saved and reloaded' where teacher_id=current_setting('test.portfolio_owner')::uuid;
do $$ begin
  if (select count(*) from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid and description='Saved and reloaded') <> 2 then raise exception 'Owner update did not persist'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.portfolio_other'), true);
do $$ declare affected integer; begin
  if (select count(*) from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid) <> 1 then raise exception 'Other user saw private entry'; end if;
  update public.teacher_portfolio_entries set title='Unauthorized' where teacher_id=current_setting('test.portfolio_owner')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner update succeeded'; end if;
  delete from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner delete succeeded'; end if;
  begin
    insert into public.teacher_portfolio_entries(teacher_id, kind, title) values (current_setting('test.portfolio_owner')::uuid, 'work', 'Unauthorized');
    raise exception 'Cross-owner insert succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  if (select count(*) from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid) <> 1 then raise exception 'Anonymous public visibility failed'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.portfolio_owner'), true);
update public.teacher_portfolio_entries set is_public=false where teacher_id=current_setting('test.portfolio_owner')::uuid;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  if exists(select 1 from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid) then raise exception 'Unpublished entry still visible'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.portfolio_owner'), true);
delete from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid;
do $$ begin
  if exists(select 1 from public.teacher_portfolio_entries where teacher_id=current_setting('test.portfolio_owner')::uuid) then raise exception 'Owner delete failed'; end if;
end $$;
rollback;
