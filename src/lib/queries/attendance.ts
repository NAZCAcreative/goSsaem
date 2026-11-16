import { collectPages } from './paging';
import { createClient } from '@/lib/supabase/client';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export type TeacherSessionSummary = {
  id: string;
  title: string;
  category: string | null;
  scheduledAt: string;
  capacity: number;
  enrolledCount: number;
};

export async function listMySessionsForAttendance(teacherId: string): Promise<TeacherSessionSummary[]> {
  const supabase = createClient();
  const data = await collectPages((from, to) => supabase.from('lesson_sessions')
    .select('id, title, scheduled_at, capacity, enrolled_count, teacher_lessons(category)')
    .eq('teacher_id', teacherId).order('scheduled_at', { ascending: true }).order('id').range(from, to));

  return (data ?? []).map((row) => {
    const lesson = Array.isArray(row.teacher_lessons) ? row.teacher_lessons[0] : row.teacher_lessons;
    return {
      id: row.id,
      title: row.title,
      category: lesson?.category ?? null,
      scheduledAt: row.scheduled_at,
      capacity: row.capacity,
      enrolledCount: row.enrolled_count,
    };
  });
}

export type AttendanceStudentRow = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus | null;
};

export async function listSessionRoster(sessionId: string): Promise<AttendanceStudentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, student_id, profiles(name), attendance_records(status)')
    .eq('session_id', sessionId)
    .in('status', ['confirmed', 'completed', 'no_show']);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const attendance = Array.isArray(row.attendance_records) ? row.attendance_records[0] : row.attendance_records;
    return {
      enrollmentId: row.id,
      studentId: row.student_id,
      studentName: student?.name ?? '학생',
      status: attendance?.status ?? null,
    };
  });
}

export async function upsertAttendance(enrollmentId: string, status: AttendanceStatus, recordedBy: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('attendance_records')
    .upsert({ enrollment_id: enrollmentId, status, recorded_by: recordedBy }, { onConflict: 'enrollment_id' });
  if (error) throw new Error(error.message);
}

export type StudentAttendanceStat = {
  studentId: string;
  studentName: string;
  present: number;
  total: number;
};

export async function listStudentAttendanceStats(teacherId: string): Promise<StudentAttendanceStat[]> {
  const supabase = createClient();

  const enrollments = await collectPages((from, to) => supabase.from('enrollments')
    .select('id, student_id, profiles(name), attendance_records(status), lesson_sessions!inner(teacher_id)')
    .eq('lesson_sessions.teacher_id', teacherId).in('status', ['confirmed', 'completed', 'no_show']).order('id').range(from, to));
  const statsByStudent = new Map<string, StudentAttendanceStat>();
  for (const enrollment of enrollments) {
    const profile = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
    const record = Array.isArray(enrollment.attendance_records) ? enrollment.attendance_records[0] : enrollment.attendance_records;
    const current = statsByStudent.get(enrollment.student_id) || { studentId: enrollment.student_id, studentName: profile?.name || '학생', present: 0, total: 0 };
    current.total++;
    if (record?.status === 'present') current.present++;
    statsByStudent.set(current.studentId, current);
  }
  return Array.from(statsByStudent.values());
}
