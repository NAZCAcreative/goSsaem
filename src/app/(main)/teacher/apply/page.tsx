'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMyTeacherApplication, submitTeacherApplication, type TeacherApplicationData } from '@/lib/queries/teacherApplications';
import { PageLoading } from '@/components/shared/PageLoading';

const labels: Record<string, string> = { not_applied: '선생님 신청을 준비해주세요', review_pending: '선생님 신청을 검토하고 있습니다', needs_changes: '신청 내용을 보완해주세요', review_rejected: '심사 결과를 확인해주세요', approved: '선생님 승인이 완료되었습니다' };

export default function TeacherApplyPage() {
  const user = useAuthStore(s => s.user);
  const [application, setApplication] = useState<TeacherApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setApplication(null);
    getMyTeacherApplication().then(data => { if (!cancelled) setApplication(data); })
      .catch(() => { if (!cancelled) setError('신청 상태를 불러오지 못했습니다. 다시 확인해주세요.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, revision]);
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
  const activeStep = status === 'approved' ? 4 : status === 'review_pending' ? 3 : 2;
  return <main className="mx-auto max-w-3xl space-y-6 px-container-margin py-8 pb-28">
    <div><p className="text-sm font-semibold text-primary">선생님 시작하기</p><h1 className="mt-2 break-keep text-2xl font-bold">{labels[status || ''] || '신청 상태 확인'}</h1><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">가입과 로그인 후 소개를 작성하고 신청해주세요. 운영자 승인 후 대시보드를 이용할 수 있습니다.</p></div>
    <ol aria-label="선생님 이용 단계" className="grid grid-cols-5 gap-1 rounded-xl bg-surface-container-low p-3 text-center text-xs sm:text-sm">{['가입', '로그인', '선생님 신청', '승인', '대시보드'].map((label, index) => <li key={label} aria-current={index === activeStep ? 'step' : undefined} className={`rounded-lg px-1 py-3 ${index === activeStep ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant'}`}><span className="mb-1 block">{index + 1}</span>{label}</li>)}</ol>
    <section className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 sm:p-8">
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {!application && !error && <p>신청 정보를 찾을 수 없습니다. <Link href="/support" className="text-primary underline">고객센터 문의</Link></p>}
      {canSubmit && <><h2 className="text-lg font-bold">소개를 작성하고 심사를 신청하세요</h2><p className="text-sm leading-relaxed text-on-surface-variant">이름, 한 줄 소개, 자기소개, 전문 분야가 필요합니다. 저장한 소개를 운영자가 검토합니다.</p></>}
      {application?.feedback && <div className="rounded-lg bg-surface-container-low p-4"><h2 className="font-semibold">운영자 안내</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{application.feedback}</p></div>}
      {status === 'review_pending' && <p className="text-sm leading-relaxed">신청이 접수되었습니다. 승인 여부는 이 화면에서 확인할 수 있습니다.</p>}
      {status === 'approved' && <p className="text-sm">승인이 완료되었습니다. 대시보드에서 프로필과 수업을 관리해보세요.</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canSubmit && <><Link href="/teacher/profile/edit?from=application" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary px-5 font-semibold text-primary">소개 작성·수정</Link><button disabled={saving} onClick={() => void submit()} className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-on-primary disabled:opacity-50">{saving ? '신청 중...' : status === 'not_applied' ? '선생님 신청하기' : '보완 후 재신청'}</button></>}
        {status === 'approved' && <Link href="/teacher/home" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-on-primary">대시보드 시작하기 →</Link>}
        <button disabled={saving} onClick={() => setRevision(value => value + 1)} className="min-h-12 rounded-lg border border-outline-variant/40 px-5 text-sm disabled:opacity-50">신청 상태 새로고침</button>
      </div>
    </section>
  </main>;
}
