begin;
create table public.chat_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
alter table public.chat_blocks enable row level security;
revoke all on public.chat_blocks from public,anon,authenticated;
create function public.my_chat_block(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.chat_blocks where blocker_id=auth.uid() and blocked_id=p_user)$$;
create function public.set_chat_block(p_user uuid,p_block boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.chat_rooms where (student_id=auth.uid() and teacher_id=p_user) or (teacher_id=auth.uid() and student_id=p_user)) then raise exception 'Chat participant required' using errcode='42501'; end if;
  if p_block then insert into public.chat_blocks(blocker_id,blocked_id) values(auth.uid(),p_user) on conflict do nothing;
  else delete from public.chat_blocks where blocker_id=auth.uid() and blocked_id=p_user; end if;
end $$;
create function public.guard_chat_message() returns trigger language plpgsql security definer set search_path='' as $$
declare room public.chat_rooms;
begin
  select * into room from public.chat_rooms where id=new.room_id;
  if new.sender_id not in (room.teacher_id,room.student_id) then raise exception 'Invalid sender' using errcode='42501'; end if;
  if exists(select 1 from public.chat_blocks where (blocker_id=room.teacher_id and blocked_id=room.student_id) or (blocker_id=room.student_id and blocked_id=room.teacher_id)) then raise exception 'Chat blocked' using errcode='42501'; end if;
  if new.type<>'text' or length(trim(coalesce(new.text,''))) not between 1 and 4000 then raise exception 'Text messages must contain 1-4000 characters'; end if;
  perform 1 from public.profiles where id=new.sender_id for update;
  if (select count(*) from public.chat_messages where sender_id=new.sender_id and created_at>now()-interval '1 minute')>=60 then raise exception 'Message rate limit'; end if;
  return new;
end $$;
create trigger chat_message_safety before insert on public.chat_messages for each row execute function public.guard_chat_message();
revoke all on function public.guard_chat_message() from public,anon,authenticated;
revoke all on function public.my_chat_block(uuid),public.set_chat_block(uuid,boolean) from public,anon;
grant execute on function public.my_chat_block(uuid),public.set_chat_block(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
