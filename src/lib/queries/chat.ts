import { createClient } from '@/lib/supabase/client';

export type ChatRoomSummary = {
  id: string;
  teacherId: string;
  studentId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

export async function listChatRooms(userId: string, role: 'teacher' | 'student', page = 1, query = '', unread = false): Promise<ChatRoomSummary[]> {
  const { data, error } = await createClient().rpc('my_chat_rooms', { p_role: role, p_page: page, p_query: query.trim(), p_unread: unread });
  if (error) throw new Error(error.message);
  return data as ChatRoomSummary[];
}
export async function countUnreadChatMessages(): Promise<number> {
  const { data, error } = await createClient().rpc('my_chat_unread_count');
  if (error) throw new Error(error.message);
  return Number(data);
}

export async function getOrCreateRoom(teacherId: string, studentId: string): Promise<string> {
  const supabase = createClient();

  const { data: existing, error: findError } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('chat_rooms')
    .insert({ teacher_id: teacherId, student_id: studentId })
    .select('id')
    .single();

  if (createError) throw new Error(createError.message);
  return created.id;
}

export type ChatRoomInfo = {
  id: string;
  otherUserId: string;
  teacherId: string;
  studentId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
};

export async function getChatRoomInfo(roomId: string, currentUserId: string): Promise<ChatRoomInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id, teacher_id, student_id, profiles!teacher_id(name, avatar_url), student:profiles!student_id(name, avatar_url)')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const teacherProfile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const studentProfile = Array.isArray(data.student) ? data.student[0] : data.student;
  const isTeacher = data.teacher_id === currentUserId;
  const other = isTeacher ? studentProfile : teacherProfile;

  return {
    id: data.id,
    teacherId: data.teacher_id,
    studentId: data.student_id,
    otherUserId: isTeacher ? data.student_id : data.teacher_id,
    otherUserName: other?.name ?? '상대방',
    otherUserAvatar: other?.avatar_url ?? null,
  };
}

export type ChatMessageRow = {
  id: string;
  roomId: string;
  senderId: string;
  type: 'text' | 'file';
  text: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: string | null;
  createdAt: string;
};

export async function listMessages(roomId: string, before?: { createdAt: string; id: string }): Promise<ChatMessageRow[]> {
  const { data, error } = await createClient().rpc('chat_message_page', { p_room: roomId, p_before: before?.createdAt || null, p_before_id: before?.id || null });
  if (error) throw new Error(error.message);
  return (data as { id: string; room_id: string; sender_id: string; type: 'text' | 'file'; text: string | null; file_name: string | null; file_url: string | null; file_size: string | null; created_at: string }[]).reverse().map(row => ({ id: row.id, roomId: row.room_id, senderId: row.sender_id, type: row.type, text: row.text, fileName: row.file_name, fileUrl: row.file_url, fileSize: row.file_size, createdAt: row.created_at }));
}

export async function sendMessage(roomId: string, senderId: string, text: string): Promise<ChatMessageRow> {
  if (!text.trim() || text.length > 4000) throw new Error('메시지를 1~4000자로 입력해주세요.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, sender_id: senderId, type: 'text', text })
    .select('id, room_id, sender_id, type, text, file_name, file_url, file_size, created_at')
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    roomId: data.room_id,
    senderId: data.sender_id,
    type: data.type,
    text: data.text,
    fileName: data.file_name,
    fileUrl: data.file_url,
    fileSize: data.file_size,
    createdAt: data.created_at,
  };
}

export function subscribeToMessages(roomId: string, onInsert: (message: ChatMessageRow) => void) {
  const supabase = createClient();
  // 채널 이름은 고유해야 한다 — 같은 이름으로 여러 컴포넌트가 동시에 구독하면
  // 두 번째 subscribe() 호출이 "cannot add postgres_changes callbacks after subscribe()" 에러를 낸다.
  const channel = supabase
    .channel(`chat-room-${roomId}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const row = payload.new as {
          id: string;
          room_id: string;
          sender_id: string;
          type: 'text' | 'file';
          text: string | null;
          file_name: string | null;
          file_url: string | null;
          file_size: string | null;
          created_at: string;
        };
        onInsert({
          id: row.id,
          roomId: row.room_id,
          senderId: row.sender_id,
          type: row.type,
          text: row.text,
          fileName: row.file_name,
          fileUrl: row.file_url,
          fileSize: row.file_size,
          createdAt: row.created_at,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markRoomRead(roomId: string, userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .is('read_at', null);
}
