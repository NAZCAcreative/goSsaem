begin;

create table public.teacher_portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,
  kind text not null check (kind in ('career', 'qualification', 'work')),
  title text not null check (length(trim(title)) between 1 and 120),
  organization text not null default '' check (length(organization) <= 120),
  period text not null default '' check (length(period) <= 80),
  description text not null default '' check (length(description) <= 2000),
  url text not null default '' check (url = '' or (length(url) <= 2000 and url ~* '^https?://[^[:space:]]+$')),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index teacher_portfolio_owner_idx on public.teacher_portfolio_entries(teacher_id, created_at desc);
alter table public.teacher_portfolio_entries enable row level security;
grant select on public.teacher_portfolio_entries to anon, authenticated;
grant insert, update, delete on public.teacher_portfolio_entries to authenticated;
create policy portfolio_read on public.teacher_portfolio_entries for select
  using (is_public or teacher_id = (select auth.uid()));
create policy portfolio_insert on public.teacher_portfolio_entries for insert to authenticated
  with check (teacher_id = (select auth.uid()));
create policy portfolio_update on public.teacher_portfolio_entries for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy portfolio_delete on public.teacher_portfolio_entries for delete to authenticated
  using (teacher_id = (select auth.uid()));

comment on table public.teacher_portfolio_entries is 'Self-reported career, qualifications and work; private by default. No verified credential claims.';
notify pgrst, 'reload schema';
commit;
