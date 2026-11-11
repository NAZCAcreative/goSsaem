import { createClient } from '@/lib/supabase/client';

export type TeacherApplicationStatus = 'not_applied' | 'review_pending' | 'needs_changes' | 'approved' | 'review_rejected';

export type TeacherApplicationData = {
  status: TeacherApplicationStatus;
  feedback: string;
  reviewed_at: string | null;
  updated_at: string;
};

export async function getMyTeacherApplication(): Promise<TeacherApplicationData | null> {
  const { data, error } = await createClient().rpc('my_teacher_application');
  if (error) throw new Error('심사 상태를 확인하지 못했습니다. 다시 시도해주세요.');
  if (data) return data as TeacherApplicationData;
  const { data: prepared, error: prepareError } = await createClient().rpc('ensure_my_teacher_application');
  if (prepareError || !prepared) throw new Error('신청 준비 정보를 만들지 못했습니다. 잠시 후 다시 시도해주세요.');
  return prepared as TeacherApplicationData;
}

export async function submitTeacherApplication(expectedUpdatedAt: string): Promise<TeacherApplicationData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('submit_teacher_application', {
    p_expected: expectedUpdatedAt,
  });
  if (error) {
    throw new Error(error.message || '심사 신청에 실패했습니다.');
  }
  return data as TeacherApplicationData;
}
