'use client';

import { useEffect, useState } from 'react';
import { getMyTeacherApplication, type TeacherApplicationData } from '@/lib/queries/teacherApplications';

function formatDate(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return '기록 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(value));
}

export function TeacherAccountDates({ joinedAt }: { joinedAt: string }) {
  const [application, setApplication] = useState<TeacherApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    getMyTeacherApplication().then(value => { if (!cancelled) setApplication(value); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  return <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-on-surface-variant">
    <div className="flex items-center gap-2"><dt>가입일</dt><dd>{formatDate(joinedAt)}</dd></div>
    <div className="flex flex-wrap items-center gap-2"><dt>심사 승인일</dt><dd>{loading ? '확인 중…' : error ? <button type="button" onClick={() => setRevision(value => value + 1)} className="min-h-11 text-primary underline">조회 실패 · 다시 확인</button> : application?.status === 'approved' ? formatDate(application.reviewed_at) : '승인 전'}</dd></div>
  </dl>;
}
