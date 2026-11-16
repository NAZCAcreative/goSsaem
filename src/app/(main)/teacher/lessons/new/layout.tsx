'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getMyTeacherApplication } from '@/lib/queries/teacherApplications';
import { useAuthStore } from '@/stores/auth-store';
import { PageLoading } from '@/components/shared/PageLoading';
export default function LessonCreationLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  const pathname = usePathname();
  const [state, setState] = useState<'loading' | 'approved' | 'blocked' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    if (!user) { setState('blocked'); return; }
    getMyTeacherApplication().then(result => { if (!cancelled) setState(result?.status === 'approved' ? 'approved' : 'blocked'); }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [user, pathname, retry]);
  if (state === 'loading') return <PageLoading />;
  if (state === 'approved') return children;
  return <main className="mx-auto max-w-4xl px-container-margin pb-32 pt-8"><section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6"><h1 className="font-headline-lg">{state === 'error' ? '심사 상태를 확인하지 못했습니다' : '심사 승인 후 수업을 개설할 수 있습니다'}</h1><p className="mt-3 text-on-surface-variant">소개와 경력 관리, 자료실은 계속 이용할 수 있습니다.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setRetry(value => value + 1)} className="min-h-11 rounded-lg bg-primary px-4 text-on-primary">다시 확인</button><Link href="/teacher/profile#teacher-review" className="inline-flex min-h-11 items-center px-3 text-primary">심사 안내</Link><Link href="/teacher/home" className="inline-flex min-h-11 items-center px-3">홈으로</Link></div></section></main>;
}
