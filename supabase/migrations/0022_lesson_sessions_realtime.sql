begin;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lesson_sessions') then
    alter publication supabase_realtime add table public.lesson_sessions;
  end if;
end $$;
commit;
