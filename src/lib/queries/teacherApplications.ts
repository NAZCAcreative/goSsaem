import { createClient } from '@/lib/supabase/client';

export type TeacherApplicationStatus = 'not_applied' | 'review_pending' | 'needs_changes' | 'approved' | 'review_rejected';

export type TeacherApplicationData = {
  status: TeacherApplicationStatus;
  feedback: string;
  reviewed_at: string | null;
  updated_at: string;
};

export async function getMyTeacherApplication(): Promise<TeacherApplicationData | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('my_teacher_application');
    if (error) {
      // If table has no record or user not logged in
      return null;
    }
    return data as TeacherApplicationData;
  } catch {
    return null;
  }
}

export async function submitTeacherApplication(expectedUpdatedAt?: string): Promise<TeacherApplicationData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('submit_teacher_application', {
    p_expected: expectedUpdatedAt || new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message || '심사 신청에 실패했습니다.');
  }
  return data as TeacherApplicationData;
}

/**
 * 테스트 및 데모용: 로컬 스토리지 또는 DB를 통해 선생님 승인 상태를 즉시 토글할 수 있게 지원
 */
const DEMO_STATUS_KEY = 'gossaem_demo_teacher_status';

export function getDemoTeacherStatus(): TeacherApplicationStatus | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(DEMO_STATUS_KEY);
  if (val && ['not_applied', 'review_pending', 'needs_changes', 'approved', 'review_rejected'].includes(val)) {
    return val as TeacherApplicationStatus;
  }
  return null;
}

export function setDemoTeacherStatus(status: TeacherApplicationStatus | null) {
  if (typeof window === 'undefined') return;
  if (!status) {
    localStorage.removeItem(DEMO_STATUS_KEY);
  } else {
    localStorage.setItem(DEMO_STATUS_KEY, status);
  }
  window.dispatchEvent(new Event('gossaem_teacher_status_changed'));
}

