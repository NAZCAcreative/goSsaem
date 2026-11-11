'use client';

import { useAlertState } from '@/components/shared/AlertDialog';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminDisplay } from '@/lib/admin';

type Application = { status: string; feedback: string; reviewed_at: string | null; updated_at: string };

export function TeacherReviewStatus({ profileId }: { profileId: string }) {
  const [application, setApplication] = useState<Application | null>(null);
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useAlertState<string>('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setApplication(null);
    const load = async () => {
      try {
        const result = await createClient().rpc('my_teacher_application');
        if (result.error) throw result.error;
        if (!cancelled) { setApplication(result.data); setOwner(profileId); }
      } catch { if (!cancelled) setError('심사 상태를 불러오지 못했습니다.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [profileId, refresh, setError]);
  const submit = async () => {
    if (!application || saving) return;
    setSaving(true); setError('');
    try {
      const result = await createClient().rpc('submit_teacher_application', { p_expected: application.updated_at });
      if (result.error) throw result.error;
      setApplication(result.data);
    } catch { setError('요청하지 못했습니다. 최신 상태를 확인하고 다시 시도해주세요.'); }
    finally { setSaving(false); }
  };
  return <section id="teacher-review" className="scroll-mt-24 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">선생님 심사</h2><button type="button" disabled={loading || saving} className="min-h-11 rounded-lg px-3 text-sm text-primary disabled:opacity-40" onClick={() => setRefresh((value) => value + 1)}>새로고침</button></div>
    {loading && <p role="status" className="text-sm text-slate-500">심사 상태를 확인하고 있습니다...</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!loading && !error && !application && <p className="text-sm text-on-surface-variant">심사 신청 정보를 찾을 수 없습니다. <Link href="/support" className="text-primary underline">고객센터 문의</Link></p>}
    {!loading && application && owner === profileId && <>
      <p className="font-bold text-primary">{adminDisplay('status', application.status)}</p>
      {application.feedback && <div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-semibold">운영자 심사 안내</p><p className="whitespace-pre-wrap break-words text-sm">{application.feedback}</p></div>}
      {application.status === 'review_pending' && <p className="text-sm text-slate-500">운영자가 프로필과 소개를 확인한 뒤 결과를 안내합니다.</p>}
      {application.status === 'approved' && <p className="text-sm text-slate-500">승인되었습니다. 선생님 프로필에 인증 배지가 표시됩니다.</p>}
      {['needs_changes', 'review_rejected'].includes(application.status) && <div className="space-y-3"><p className="text-sm text-slate-500">심사 안내에 따라 프로필을 수정·저장한 뒤 재심사를 요청해주세요.</p><div className="flex flex-wrap gap-2"><Link href="/teacher/profile/edit" className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold">프로필 수정</Link><button type="button" disabled={saving} onClick={() => void submit()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40">{saving ? '요청 중...' : '재심사 요청'}</button></div></div>}
      {application.reviewed_at && <p className="text-xs text-slate-400">최근 심사 {adminDisplay('reviewed_at', application.reviewed_at)}</p>}
    </>}
  </section>;
}
