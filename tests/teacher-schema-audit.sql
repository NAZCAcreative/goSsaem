select jsonb_build_object(
 'triggers', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'function',p.proname)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and c.relnamespace='public'::regnamespace and c.relname in ('profiles','teacher_profiles','teacher_lessons')),
 'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name)) from information_schema.columns where table_schema='public' and table_name='teacher_lessons'),
 'functions', (select jsonb_agg(jsonb_build_object('name',proname,'definition',pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace and proname in ('guard_teacher_verification','guard_account_role','initialize_teacher_application'))
) as audit;
