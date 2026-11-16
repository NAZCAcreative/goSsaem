'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMyTeacherApplication, submitTeacherApplication, type TeacherApplicationData } from '@/lib/queries/teacherApplications';
import { PageLoading } from '@/components/shared/PageLoading';
import { enterTeacherDashboard } from '@/lib/auth-redirect';

const labels: Record<string, string> = { not_applied: '선생님 신청을 준비해주세요', review_pending: '선생님 신청을 검토하고 있습니다', needs_changes: '신청 내용을 보완해주세요', review_rejected: '심사 결과를 확인해주세요', approved: '선생님 승인이 완료되었습니다' };

export default function TeacherApplyPage() {
  const user = useAuthStore(s => s.user);
  const [application, setApplication] = useState<TeacherApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true); setError(''); setApplication(null);
    getMyTeacherApplication().then(data => { if (!cancelled) setApplication(data); })
      .catch(() => { if (!cancelled) setError('신청 상태를 불러오지 못했습니다. 다시 확인해주세요.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, revision]);
  useEffect(() => {
    if (application?.status !== 'review_pending') return;
    let cancelled = false;
    let checking = false;
    const check = async () => {
      if (cancelled || checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const latest = await getMyTeacherApplication();
        if (!cancelled) { setApplication(latest); setError(''); }
      } catch {
        if (!cancelled) setError('승인 상태를 확인하지 못했습니다. 연결이 복구되면 자동으로 다시 확인합니다.');
      } finally { checking = false; }
    };
    const interval = window.setInterval(() => void check(), 5000);
    const resume = () => void check();
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [application?.status, user?.id, revision]);
  useEffect(() => {
    if (application?.status === 'approved') {
      // A document navigation discards any prefetched pre-approval redirect.
      enterTeacherDashboard();
    }
  }, [application?.status]);
  const submit = async () => {
    if (!application || saving) return;
    setSaving(true); setError('');
    try { setApplication(await submitTeacherApplication(application.updated_at)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '신청하지 못했습니다. 다시 시도해주세요.'); }
    finally { setSaving(false); }
  };
  if (loading) return <PageLoading />;
  const status = application?.status;
  const canSubmit = status === 'not_applied' || status === 'needs_changes' || status === 'review_rejected';
  const description = status === 'review_pending'
    ? '신청이 정상적으로 접수되었습니다. 운영자가 소개를 검토하고 있습니다. 승인되면 자동으로 대시보드로 이동합니다.'
    : status === 'approved'
      ? '대시보드로 이동하고 있습니다. 잠시만 기다려주세요.'
      : '소개를 작성하고 선생님 신청을 완료해주세요. 운영자 승인 후 대시보드를 이용할 수 있습니다.';
  return <main className="mx-auto w-full max-w-3xl px-container-margin pb-28 pt-10 sm:pt-16">
    <section aria-labelledby="application-title" className="space-y-6">
      <div className="max-w-2xl"><p className="text-sm font-semibold text-primary">선생님 시작하기</p><h1 id="application-title" className="mt-3 break-keep text-2xl font-bold leading-snug sm:text-3xl">{labels[status || ''] || '신청 상태 확인'}</h1><p className="mt-4 break-keep text-sm leading-7 text-on-surface-variant sm:text-base">{description}</p></div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {!application && !error && <p>신청 준비 정보를 확인하고 있습니다. 아래 새로고침 버튼으로 다시 확인해주세요.</p>}
      {canSubmit && <><h2 className="text-lg font-bold">소개를 작성하고 심사를 신청하세요</h2><p className="text-sm leading-relaxed text-on-surface-variant">이름, 한 줄 소개, 자기소개, 전문 분야가 필요합니다. 저장한 소개를 운영자가 검토합니다.</p></>}
      {application?.feedback && <div className="rounded-lg bg-surface-container-low p-4"><h2 className="font-semibold">운영자 안내</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{application.feedback}</p></div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canSubmit && <><Link href="/teacher/profile/edit?from=application" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary px-5 font-semibold text-primary">소개 작성·수정</Link><button disabled={saving} onClick={() => void submit()} className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-on-primary disabled:opacity-50">{saving ? '신청 중...' : status === 'not_applied' ? '선생님 신청하기' : '보완 후 재신청'}</button></>}
        {status === 'approved' && <a href="/teacher/home" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-on-primary">대시보드로 이동 →</a>}
        <button disabled={saving} onClick={() => setRevision(value => value + 1)} className="min-h-12 rounded-lg border border-outline-variant/40 px-5 text-sm disabled:opacity-50">신청 상태 새로고침</button>
      </div>
    </section>
  </main>;
}
