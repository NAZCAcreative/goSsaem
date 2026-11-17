begin;

alter table public.reviews add column tags text[] not null default '{}';
alter table public.reviews add column text_edited_at timestamptz;
drop policy reviews_select_all on public.reviews;
create policy reviews_read_participants on public.reviews for select to authenticated using(student_id=auth.uid() or teacher_id=auth.uid() or public.admin_is_authorized());
create trigger active_actor_guard before insert or update or delete on public.reviews for each row execute function public.guard_active_actor();
-- Preserve historical reviews; validate new writes without rewriting their content.
create function public.validate_review_content() returns trigger language plpgsql set search_path='' as $$
begin
  if length(trim(coalesce(new.text,''))) not between 1 and 2000 then raise exception 'Review requires 1-2000 characters'; end if;
  if new.teacher_reply is not null and length(trim(new.teacher_reply)) not between 1 and 2000 then raise exception 'Reply requires 1-2000 characters'; end if;
  if cardinality(new.tags)>3 or not new.tags <@ array['clear','speaking','materials','kind','prepared']::text[] then raise exception 'Invalid review tags'; end if;
  new.text:=trim(new.text);
  if tg_op='INSERT' then new.text_edited_at:=null;
  elsif new.text is distinct from old.text then new.text_edited_at:=now();
  else new.text_edited_at:=old.text_edited_at;
  end if;
  return new;
end $$;
create trigger review_content_check before insert or update on public.reviews for each row execute function public.validate_review_content();

create function public.review_notifications() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.notifications(user_id,type,title,body,link_url) values(new.teacher_id,'booking_status','새 후기가 도착했습니다','후기를 확인하고 답변을 남겨주세요.','/teacher/profile/reviews');
  elsif new.teacher_reply is distinct from old.teacher_reply and new.teacher_reply is not null then
    insert into public.notifications(user_id,type,title,body,link_url) values(new.student_id,'booking_status','선생님의 후기 답변이 도착했습니다','내 후기에서 답변을 확인하세요.','/student/reviews');
  end if;
  return new;
end $$;
create trigger reviews_notify after insert or update on public.reviews for each row execute function public.review_notifications();

create function public.my_review_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select jsonb_build_object('total',count(*),'average',coalesce(round(avg(rating),1),0),'unanswered',count(*) filter(where teacher_reply is null)) from public.reviews where teacher_id=auth.uid());
end $$;

create function public.my_pending_review_target(p_session uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select jsonb_build_object('sessionId',s.id,'teacherId',s.teacher_id,'teacherName',p.name,'teacherAvatarUrl',p.avatar_url,'scheduledAt',s.scheduled_at,'sessionTitle',s.title)
    from public.enrollments e join public.lesson_sessions s on s.id=e.session_id join public.profiles p on p.id=s.teacher_id
    where e.student_id=auth.uid() and e.session_id=p_session and e.status='completed'
      and not exists(select 1 from public.reviews r where r.student_id=auth.uid() and r.session_id=s.id));
end $$;

-- Public output deliberately excludes student IDs, full names and avatars.
create function public.public_teacher_reviews(p_teacher uuid,p_page integer default 1,p_sort text default 'recent') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.marketplace_teacher_visible(p_teacher) then return jsonb_build_object('total',0,'average',0,'rows','[]'::jsonb); end if;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
    select r.id,left(coalesce(p.name,'학생'),1)||'***' as name,r.rating,r.text,r.tags,r.teacher_reply as reply,r.created_at as "createdAt",
      (r.text_edited_at is not null) as edited,
      s.type as "lessonType",exists(select 1 from public.enrollments e where e.session_id=r.session_id and e.student_id=r.student_id and e.status='completed') as verified
    from public.reviews r left join public.profiles p on p.id=r.student_id left join public.lesson_sessions s on s.id=r.session_id
    where r.teacher_id=p_teacher
    order by case when p_sort='high' then r.rating end desc,r.created_at desc,r.id desc
    limit 20 offset (greatest(1,least(coalesce(p_page,1),100000))-1)*20
  ) r;
  return (select jsonb_build_object('total',count(*),'average',coalesce(round(avg(rating),1),0),'rows',result) from public.reviews where teacher_id=p_teacher);
end $$;

-- Reports use the existing support queue and its audit/response workflow.
create function public.report_review(p_review uuid,p_reason text,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
  if p_reason is null or length(trim(p_reason)) not between 10 and 1000 then raise exception 'Report requires 10-1000 characters'; end if;
  if not exists(select 1 from public.reviews where id=p_review) then raise exception 'Review not found'; end if;
  return public.create_support_ticket('report','lesson','후기 신고', '후기 ID: '||p_review::text||E'\n'||trim(p_reason),p_request);
end $$;

create table public.lesson_feedback (
  enrollment_id uuid primary key references public.enrollments(id),
  strengths text not null check(length(trim(strengths)) between 1 and 2000),
  practice text not null check(length(trim(practice)) between 1 and 2000),
  next_steps text not null check(length(next_steps)<=2000),
  published boolean not null default false,
  practice_done boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.lesson_feedback enable row level security;
create trigger active_actor_guard before insert or update or delete on public.lesson_feedback for each row execute function public.guard_active_actor();
revoke all on public.lesson_feedback from public,anon,authenticated;
grant select on public.lesson_feedback to authenticated;
create policy feedback_read on public.lesson_feedback for select using(exists(
  select 1 from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.id=enrollment_id and (s.teacher_id=auth.uid() or (e.student_id=auth.uid() and published))
));

create function public.save_lesson_feedback(p_enrollment uuid,p_strengths text,p_practice text,p_next text,p_publish boolean) returns void language plpgsql security definer set search_path='' as $$
declare student uuid; was_published boolean;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select e.student_id into student from public.enrollments e join public.lesson_sessions s on s.id=e.session_id
    where e.id=p_enrollment and s.teacher_id=auth.uid() and e.status='completed' for update of e;
  if student is null then raise exception 'Completed lesson ownership required' using errcode='42501'; end if;
  select published into was_published from public.lesson_feedback where enrollment_id=p_enrollment;
  insert into public.lesson_feedback(enrollment_id,strengths,practice,next_steps,published)
    values(p_enrollment,trim(p_strengths),trim(p_practice),trim(coalesce(p_next,'')),p_publish)
    on conflict(enrollment_id) do update set strengths=excluded.strengths,practice=excluded.practice,next_steps=excluded.next_steps,
      published=excluded.published,practice_done=case when lesson_feedback.practice=excluded.practice then lesson_feedback.practice_done else false end,updated_at=now();
  if p_publish and not coalesce(was_published,false) then
    insert into public.notifications(user_id,type,title,body,link_url) values(student,'booking_status','수업 피드백이 도착했습니다','잘한 점과 복습할 내용을 확인하세요.','/student/bookings/'||p_enrollment::text);
  end if;
end $$;

create function public.set_practice_done(p_enrollment uuid,p_done boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.enrollments where id=p_enrollment and student_id=auth.uid()) then raise exception 'Access denied' using errcode='42501'; end if;
  update public.lesson_feedback set practice_done=p_done where enrollment_id=p_enrollment and published;
  if not found then raise exception 'Published feedback required'; end if;
end $$;

create table public.learning_goals (
  student_id uuid primary key references public.profiles(id),
  goal text not null check(length(trim(goal)) between 1 and 500),updated_at timestamptz not null default now()
);
alter table public.learning_goals enable row level security;
create trigger active_actor_guard before insert or update or delete on public.learning_goals for each row execute function public.guard_active_actor();
revoke all on public.learning_goals from public,anon,authenticated;
grant select,insert,update on public.learning_goals to authenticated;
create policy learning_goal_own on public.learning_goals for all using(student_id=auth.uid()) with check(student_id=auth.uid());

create function public.my_next_lesson() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select jsonb_build_object('enrollmentId',e.id,'sessionId',s.id,'title',s.title,'scheduledAt',s.scheduled_at,'durationMinutes',s.duration_minutes,'teacherName',p.name)
    from public.enrollments e join public.lesson_sessions s on s.id=e.session_id join public.profiles p on p.id=s.teacher_id
    where e.student_id=auth.uid() and e.status='confirmed' and s.status in ('scheduled','ongoing')
      and s.scheduled_at+make_interval(mins=>s.duration_minutes)>now() order by s.scheduled_at,s.id limit 1);
end $$;

create function public.my_teacher_preparation() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select s.id,s.title,s.scheduled_at as "scheduledAt",
      case when s.scheduled_at+make_interval(mins=>s.duration_minutes)<=now() then 'attendance' else 'meeting' end as kind
    from public.lesson_sessions s where s.teacher_id=auth.uid() and s.status<>'cancelled' and (
      (s.status in ('scheduled','ongoing') and s.scheduled_at between now() and now()+interval '7 days' and not exists(select 1 from public.session_meetings m where m.session_id=s.id))
      or (s.scheduled_at>=now()-interval '30 days' and s.scheduled_at+make_interval(mins=>s.duration_minutes)<=now() and exists(select 1 from public.enrollments e where e.session_id=s.id and e.status='confirmed'))
    ) order by s.scheduled_at,s.id limit 30
  ) r);
end $$;

create function public.my_teacher_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  return (with counts as (select e.student_id,count(*) n from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where s.teacher_id=auth.uid() and e.status='completed' group by e.student_id)
    select jsonb_build_object('completed',coalesce(sum(n),0),'students',count(*),'returning',count(*) filter(where n>1)) from counts);
end $$;

revoke all on function public.validate_review_content(),public.review_notifications() from public,anon,authenticated;
revoke all on function public.my_pending_review_target(uuid) from public,anon;
grant execute on function public.my_pending_review_target(uuid) to authenticated;
revoke all on function public.my_review_summary(),public.report_review(uuid,text,uuid),public.save_lesson_feedback(uuid,text,text,text,boolean),public.set_practice_done(uuid,boolean),public.my_next_lesson(),public.my_teacher_preparation(),public.my_teacher_metrics() from public,anon;
grant execute on function public.my_review_summary(),public.report_review(uuid,text,uuid),public.save_lesson_feedback(uuid,text,text,text,boolean),public.set_practice_done(uuid,boolean),public.my_next_lesson(),public.my_teacher_preparation(),public.my_teacher_metrics() to authenticated;
revoke all on function public.public_teacher_reviews(uuid,integer,text) from public;
grant execute on function public.public_teacher_reviews(uuid,integer,text) to anon,authenticated;
commit;
