select jsonb_build_object(
  'functions', (select jsonb_agg(jsonb_build_object('name',proname,'definition',pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace and proname in ('my_teacher_application','create_teacher_lesson','my_teacher_overview','submit_teacher_application')),
  'tables', (select jsonb_agg(table_name) from information_schema.tables where table_schema='public'),
  'triggers', (select jsonb_agg(jsonb_build_object('table',event_object_table,'name',trigger_name)) from information_schema.triggers where trigger_schema='public' and event_object_table in ('teacher_profiles','teacher_lessons','teacher_applications'))
) as audit;
