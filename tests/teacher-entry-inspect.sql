select count(*) as teachers,
 count(*) filter(where t.profile_id is null) as missing_profile,
 count(*) filter(where a.profile_id is null) as missing_application
from public.profiles p left join public.teacher_profiles t on t.profile_id=p.id
left join public.teacher_applications a on a.profile_id=p.id where p.role='teacher';
