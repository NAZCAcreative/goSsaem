import { createClient } from '@/lib/supabase/client';

export type TeacherTask = { id: string; teacher_id: string; title: string; due_date: string | null; is_done: boolean; updated_at: string };
export type TeacherStudent = { id: string; name: string; avatar_url: string | null; korean_level: string; lessons: number; last_session: string };
export type StudentNote = { id: string; student_id: string; goals: string; learning_notes: string; next_steps: string; updated_at: string };
export type MonthSummary = { completed: number; students: number; rating: number | null; reviews: number };
export async function listTeacherTasks(teacherId: string): Promise<TeacherTask[]> {
  const { data, error } = await createClient().from('teacher_tasks').select('*').eq('teacher_id', teacherId).order('is_done').order('due_date', { nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw new Error('할 일을 불러오지 못했습니다.');
  return data ?? [];
}
export async function createTeacherTask(teacherId: string, title: string, dueDate: string): Promise<TeacherTask> {
  if (!title.trim() || title.trim().length > 200) throw new Error('할 일은 1~200자로 입력해주세요.');
  const { data, error } = await createClient().from('teacher_tasks').insert({ teacher_id: teacherId, title: title.trim(), due_date: dueDate || null }).select('*').single();
  if (error) throw new Error('저장하지 못했습니다. 다시 시도해주세요.');
  return data;
}
export async function toggleTeacherTask(teacherId: string, task: TeacherTask): Promise<TeacherTask> {
  const { data, error } = await createClient().from('teacher_tasks').update({ is_done: !task.is_done }).eq('id', task.id).eq('teacher_id', teacherId).eq('updated_at', task.updated_at).select('*').single();
  if (error) throw new Error('할 일이 변경되었거나 저장하지 못했습니다. 새로고침 후 다시 시도해주세요.');
  return data;
}
export async function deleteTeacherTask(teacherId: string, task: TeacherTask) {
  const { error } = await createClient().from('teacher_tasks').delete().eq('id', task.id).eq('teacher_id', teacherId).eq('updated_at', task.updated_at).select('id').single();
  if (error) throw new Error('삭제하지 못했습니다. 새로고침 후 다시 시도해주세요.');
}
export async function listTeacherStudents(): Promise<TeacherStudent[]> {
  const { data, error } = await createClient().rpc('my_teacher_students');
  if (error) throw new Error('학생 목록을 불러오지 못했습니다.');
  return data ?? [];
}
export async function getMonthSummary(): Promise<MonthSummary> {
  const { data, error } = await createClient().rpc('my_teacher_month_summary');
  if (error) throw new Error('활동 요약을 불러오지 못했습니다.');
  return data;
}
export async function getStudentNote(teacherId: string, studentId: string): Promise<StudentNote | null> {
  const { data, error } = await createClient().from('teacher_student_notes').select('*').eq('teacher_id', teacherId).eq('student_id', studentId).maybeSingle();
  if (error) throw new Error('학생 노트를 불러오지 못했습니다.');
  return data;
}
export async function saveStudentNote(teacherId: string, studentId: string, input: Pick<StudentNote, 'goals' | 'learning_notes' | 'next_steps'>, previous: StudentNote | null): Promise<StudentNote> {
  if (input.goals.length > 2000 || input.learning_notes.length > 5000 || input.next_steps.length > 2000) throw new Error('입력 가능한 글자 수를 초과했습니다.');
  const table = createClient().from('teacher_student_notes');
  const request = previous ? table.update(input).eq('id', previous.id).eq('teacher_id', teacherId).eq('student_id', studentId).eq('updated_at', previous.updated_at) : table.insert({ ...input, teacher_id: teacherId, student_id: studentId });
  const { data, error } = await request.select('*').single();
  if (error) throw new Error('저장하지 못했거나 다른 창에서 노트가 변경되었습니다. 입력한 내용을 복사해 둔 뒤 새로고침해주세요.');
  return data;
}
