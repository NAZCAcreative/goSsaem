import { createClient } from '@/lib/supabase/client';

export type TeacherLesson = {
  id: string;
  teacherId: string;
  type: 'group' | '1on1' | 'free_trial';
  category: string;
  title: string;
  level: string | null;
  price: number;
  currency: string;
  capacity: number;
  description: string | null;
  schedulingMode: 'fixed' | 'request';
};

export async function listTeacherLessons(teacherId: string): Promise<TeacherLesson[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teacher_lessons')
    .select('id, teacher_id, type, category, title, level, price, currency, capacity, description, scheduling_mode')
    .eq('teacher_id', teacherId)
    .eq('is_published', true)
    .order('price', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    type: row.type,
    category: row.category,
    title: row.title,
    level: row.level,
    price: row.price,
    currency: row.currency,
    capacity: row.capacity,
    description: row.description,
    schedulingMode: row.scheduling_mode,
  }));
}

export type CreateBookingInput = {
  studentId: string;
  teacherId: string;
  teacherLessonId: string;
  title: string;
  type: 'group' | '1on1' | 'free_trial';
  capacity: number;
  scheduledAt: string; // ISO
  durationMinutes: number;
};

export async function createBookingDraft(input: CreateBookingInput): Promise<{ enrollmentId: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('reserve_lesson', { p_lesson: input.teacherLessonId, p_start: input.scheduledAt });
  if (error) throw new Error(error.message.includes('full') ? '예약 정원이 마감되었습니다.' : error.message.includes('unavailable') || error.code === '23P01' ? '선생님이 예약 가능한 시간이 아닙니다. 다른 시간을 선택해주세요.' : error.message.includes('expired') ? '예약 시간이 만료되었습니다.' : '예약할 수 없습니다. 수업 시간과 무료 체험 이용 여부를 확인해주세요.');
  return data as { enrollmentId: string };
}

export type EnrollmentDetail = {
  id: string;
  status: string;
  sessionId: string;
  scheduledAt: string;
  durationMinutes: number;
  sessionTitle: string;
  teacherId: string;
  teacherName: string;
  teacherHeadline: string | null;
  price: number;
  currency: string;
};

export async function getEnrollmentDetail(enrollmentId: string): Promise<EnrollmentDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      'id, status, session_id, reserved_price, reserved_currency, expires_at, lesson_sessions(scheduled_at, duration_minutes, title, teacher_id, teacher_lesson_id, teacher_lessons(price, currency), profiles(name))',
    )
    .eq('id', enrollmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const session = Array.isArray(data.lesson_sessions) ? data.lesson_sessions[0] : data.lesson_sessions;
  if (!session) return null;

  const lesson = Array.isArray(session.teacher_lessons) ? session.teacher_lessons[0] : session.teacher_lessons;
  const teacherProfile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;

  let teacherHeadline: string | null = null;
  try {
    const { data: teacherProfileRow } = await supabase
      .from('teacher_profiles')
      .select('headline')
      .eq('profile_id', session.teacher_id)
      .maybeSingle();
    teacherHeadline = teacherProfileRow?.headline ?? null;
  } catch {
    teacherHeadline = null;
  }

  return {
    id: data.id,
    status: data.status,
    sessionId: data.session_id,
    scheduledAt: session.scheduled_at,
    durationMinutes: session.duration_minutes,
    sessionTitle: session.title,
    teacherId: session.teacher_id,
    teacherName: teacherProfile?.name ?? '선생님',
    teacherHeadline,
    price: data.reserved_price ?? lesson?.price ?? 0,
    currency: data.reserved_currency ?? lesson?.currency ?? 'KRW',
  };
}

export async function hasUsedFreeTrial(studentId: string, teacherId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, status, lesson_sessions!inner(type, teacher_id)')
    .eq('student_id', studentId)
    .eq('lesson_sessions.teacher_id', teacherId)
    .eq('lesson_sessions.type', 'free_trial')
    .neq('status', 'cancelled');

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export type ConfirmPaymentInput = {
  enrollmentId: string;
  studentId: string;
  amount: number;
  method: 'card' | 'paypal' | 'kakaopay';
  userCouponId?: string;
};

export async function confirmPayment(input: ConfirmPaymentInput): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('checkout_free_booking', { p_enrollment: input.enrollmentId, p_coupon: input.userCouponId || null });
  if (error) throw new Error(error.code === 'P0003' ? '유료 결제는 준비 중입니다. 결제가 진행되지 않았습니다.' : '예약이 만료되었거나 쿠폰을 사용할 수 없습니다. 예약을 다시 확인해주세요.');
}

export type MyEnrollment = {
  id: string;
  status: string;
  scheduledAt: string;
  sessionTitle: string;
  teacherName: string;
};

export type PaymentHistoryItem = {
  verified: boolean;
  id: string;
  createdAt: string;
  status: 'pending' | 'succeeded' | 'refunded' | 'cancelled';
  method: 'card' | 'paypal' | 'kakaopay';
  amount: number;
  currency: string;
  title: string;
};

export async function listPaymentHistory(studentId: string, page = 1, filter = '전체'): Promise<PaymentHistoryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payments')
    .select('id, created_at, status, method, amount, currency, verified_payment, enrollments(lesson_sessions(title))')
    .in('status', filter === '결제 완료' ? ['succeeded'] : filter === '결제 취소' ? ['cancelled', 'refunded'] : ['pending', 'succeeded', 'refunded', 'cancelled'])
    .eq('student_id', studentId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 20, page * 20 - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const enrollment = Array.isArray(row.enrollments) ? row.enrollments[0] : row.enrollments;
    const session = enrollment ? (Array.isArray(enrollment.lesson_sessions) ? enrollment.lesson_sessions[0] : enrollment.lesson_sessions) : null;
    return {
      id: row.id,
      createdAt: row.created_at,
      status: row.status,
      method: row.method,
      verified: row.verified_payment,
      amount: row.amount,
      currency: row.currency,
      title: session?.title ?? '수업 결제',
    };
  });
}

export async function listMyEnrollments(studentId: string, page = 1): Promise<MyEnrollment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, status, lesson_sessions(scheduled_at, title, profiles(name))')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 20, page * 20 - 1);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const session = Array.isArray(row.lesson_sessions) ? row.lesson_sessions[0] : row.lesson_sessions;
      if (!session) return null;
      const teacherProfile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;
      return {
        id: row.id,
        status: row.status,
        scheduledAt: session.scheduled_at,
        sessionTitle: session.title,
        teacherName: teacherProfile?.name ?? '선생님',
      };
    })
    .filter((row): row is MyEnrollment => row !== null);
}
