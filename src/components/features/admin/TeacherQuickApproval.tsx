'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function TeacherQuickApproval({ id, application, onSaved }: { id: string; application: Record<string, unknown>; onSaved: () => void }) {
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (application.status !== 'review_pending') return null;
  const approve = async () => {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try {
      const { error: failure } = await createClient().rpc('admin_mutate', {
        p_action: 'teacher_review', p_id: id,
        p_data: { status: 'approved', feedback: '선생님 신청이 승인되었습니다. 대시보드에서 활동을 시작해주세요.', internal_note: application.internal_note || '' },
        p_reason: '신청 정보 확인 후 바로 승인',
        p_expected: { status: 'review_pending', updated_at: application.updated_at },
      });
      if (failure) {
        setError(failure.code === '40001' ? '신청 상태가 변경되었습니다. 상세창을 닫고 목록을 새로고침해주세요.' : failure.code === '42501' ? '관리자 권한을 확인할 수 없습니다.' : '승인하지 못했습니다. 다시 시도해주세요.');
        return;
      }
      onSaved();
    } catch { setError('연결에 실패했습니다. 다시 시도해주세요.'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <div className="space-y-2"><button type="button" disabled={saving} onClick={() => void approve()} className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-on-primary disabled:opacity-50">{saving ? '승인 중...' : '바로 승인'}</button><p className="text-xs text-on-surface-variant">승인 즉시 선생님이 대시보드를 이용할 수 있으며, 처리 내용은 관리 이력에 기록됩니다.</p>{error && <p role="alert" className="text-sm text-error">{error}</p>}</div>;
}
