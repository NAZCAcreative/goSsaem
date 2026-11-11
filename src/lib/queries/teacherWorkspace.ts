import { createClient } from '@/lib/supabase/client';

export type WorkspaceSession = { id: string; teacher_lesson_id: string | null; title: string; scheduled_at: string; duration_minutes: number; enrolled_count: number; capacity: number; status: string };
export function koreaDayRange(now = new Date()) {
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00+09:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
export async function listTodayTeacherSessions(teacherId: string): Promise<WorkspaceSession[]> {
  const { start, end } = koreaDayRange();
  const { data, error } = await createClient().from('lesson_sessions')
    .select('id, teacher_lesson_id, title, scheduled_at, duration_minutes, enrolled_count, capacity, status')
    .eq('teacher_id', teacherId).gte('scheduled_at', start).lt('scheduled_at', end)
    .in('status', ['scheduled', 'ongoing', 'completed']).order('scheduled_at').order('id');
  if (error) throw new Error('오늘 일정을 불러오지 못했습니다.');
  return (data ?? []) as WorkspaceSession[];
}
