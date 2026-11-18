select to_regclass('public.teacher_portfolio_entries') is not null as portfolio_base,
 to_regclass('public.matching_profiles') is not null as matching_base,
 to_regclass('supabase_migrations.schema_migrations') is not null as history_table,
 to_regprocedure('public.public_profile_lessons(uuid[])') is not null as showcase,
 to_regprocedure('public.my_profile_activity()') is not null as activity,
 exists(select 1 from storage.buckets where id='profile-clips' and not public) as private_clips;
