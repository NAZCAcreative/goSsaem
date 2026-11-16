begin;
-- Keep the existing student profile editor and detailed language levels consistent.
create function public.sync_student_matching_level() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if pg_trigger_depth()>1 or new.role<>'student' then return new; end if;
 update public.matching_profiles set languages=(select jsonb_agg(case when x->>'language'='ko' then jsonb_set(x,'{level}',to_jsonb(case new.korean_level when 'beginner' then 'A1' when 'elementary' then 'A2' when 'intermediate' then 'B1' when 'topik1' then 'A2' when 'topik2' then 'B1' else 'B2' end)) else x end order by ord)
 from jsonb_array_elements(languages) with ordinality as e(x,ord))
 where profile_id=new.id and exists(select 1 from jsonb_array_elements(languages) x where x->>'language'='ko');
 return new;
end $$;
create trigger sync_student_matching_level after update of korean_level on public.profiles
 for each row when (old.korean_level is distinct from new.korean_level) execute function public.sync_student_matching_level();
commit;
