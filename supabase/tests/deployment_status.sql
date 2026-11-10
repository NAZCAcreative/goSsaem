select current_database() as database_name,
  to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_exists,
  to_regclass('public.home_banner_settings') is not null as home_banner_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='teacher_profiles' and column_name='featured_rank') as featured_rank_exists;
select tablename from pg_tables where schemaname='supabase_migrations';
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'admin_mutate%' or p.proname in ('admin_list','handle_new_user') or p.proname like '%role%');
select tgname from pg_trigger where not tgisinternal and tgrelid in ('public.profiles'::regclass,'public.teacher_profiles'::regclass,'public.enrollments'::regclass);
