'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, UserRound, Award, BookOpen, CalendarCheck, FileText, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getTeacherDetail, type TeacherDetail } from '@/lib/queries/teachers';
import { listPortfolio, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';
import { listMaterials, type MaterialRow } from '@/lib/queries/materials';
import { getMyTeacherApplication, type TeacherApplicationData } from '@/lib/queries/teacherApplications';
import { listTodayTeacherSessions, type WorkspaceSession } from '@/lib/queries/teacherWorkspace';
import { PageLoading } from '@/components/shared/PageLoading';
import { AdminEntry } from '@/components/shared/AdminEntry';

const statusLabels: Record<string, string> = { approved: '심사 승인', review_pending: '심사 중', needs_changes: '보완 요청', review_rejected: '재심사 필요', not_applied: '신청 정보 없음' };
const panel = 'rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6';
type Data = { profile: TeacherDetail | null; portfolio: PortfolioEntry[]; materials: MaterialRow[]; application: TeacherApplicationData | null; sessions: WorkspaceSession[] };
const initial: Data = { profile: null, portfolio: [], materials: [], application: null, sessions: [] };

export function TeacherWorkspaceDashboard() {
  const user = useAuthStore(s => s.user);
  const ready = useAuthStore(s => s.isHydrated);
  const [data, setData] = useState<Data>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'teacher') { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setErrors([]); setData(initial);
    Promise.allSettled([getTeacherDetail(user.id), listPortfolio(user.id), listMaterials(user.id), getMyTeacherApplication(), listTodayTeacherSessions(user.id)]).then(results => {
      if (cancelled) return;
      const [profile, portfolio, materials, application, sessions] = results;
      setData({
        profile: profile.status === 'fulfilled' ? profile.value : null,
        portfolio: portfolio.status === 'fulfilled' ? portfolio.value : [],
        materials: materials.status === 'fulfilled' ? materials.value : [],
        application: application.status === 'fulfilled' ? application.value : null,
        sessions: sessions.status === 'fulfilled' ? sessions.value : [],
      });
      const keys = ['소개', '경력·대표 작업', '자료실', '심사 상태', '오늘 일정'];
      setErrors(results.flatMap((result, index) => result.status === 'rejected' || (index === 0 && result.status === 'fulfilled' && !result.value) ? [keys[index]] : []));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, ready, refresh]);
  if (!ready || loading) return <PageLoading />;
  if (!user || user.role !== 'teacher') return <main className="mx-auto max-w-4xl px-container-margin py-12 pb-32"><h1 className="font-headline-lg">선생님 로그인이 필요합니다</h1><Link href="/login?role=teacher&next=%2Fteacher%2Fhome" className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-on-primary">선생님 로그인</Link></main>;
  const profile = data.profile;
  const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
  const approved = data.application?.status === 'approved' && !errors.includes('심사 상태');
  const careerCount = data.portfolio.filter(row => row.kind !== 'work').length;
  const workCount = data.portfolio.filter(row => row.kind === 'work').length;
  const publicCount = data.portfolio.filter(row => row.is_public).length;
  const steps = [
    { title: '소개를 다듬어보세요', description: '한 줄 소개와 전문분야로 나를 알리세요.', href: '/teacher/profile/edit', done: !!profile?.headline && !!profile?.bio, unavailable: errors.includes('소개'), icon: UserRound },
    { title: '경력과 자격을 기록하세요', description: '기관, 교육 대상, 맡은 역할을 남겨보세요.', href: '/teacher/profile/portfolio', done: careerCount > 0, unavailable: errors.includes('경력·대표 작업'), icon: Award },
    { title: '대표 작업을 연결하세요', description: '수업안과 활동지를 나만의 포트폴리오로.', href: '/teacher/profile/portfolio', done: workCount > 0, unavailable: errors.includes('경력·대표 작업'), icon: BookOpen },
  ];
  return <main className="mx-auto max-w-[1200px] space-y-7 px-container-margin pb-32 pt-stack-lg text-on-surface">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-on-surface-variant">{date} · 한국 시간</p><h1 className="mt-2 font-headline-lg text-headline-lg">안녕하세요, {profile?.name || user.name} 선생님</h1><p className="mt-2 text-sm text-on-surface-variant">오늘의 수업을 준비하고, 내일의 기회가 될 경험을 쌓아보세요.</p></div><button onClick={() => setRefresh(value => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-4 text-sm"><RefreshCw size={18} aria-hidden="true" />새로고침</button></div>
    <AdminEntry />
    {errors.length > 0 && <div role="alert" className="rounded-xl border border-error/20 bg-error-container/30 p-4 text-sm"><p>{errors.join(', ')} 정보를 불러오지 못했습니다. 확인되지 않은 수치는 표시하지 않습니다.</p><button onClick={() => setRefresh(value => value + 1)} className="mt-2 min-h-11 font-semibold text-primary">다시 시도</button></div>}
    <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary-container/40 p-6 sm:p-8">
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-xs font-semibold tracking-wide text-primary">MY TEACHING PORTFOLIO</p><h2 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">나의 경험을 한 페이지에</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant">수업 밖에서 쌓은 경력과 직접 만든 작업도 소중한 자산입니다. 내 페이지에 정리하고, 필요한 곳에 소개하세요.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/teacher/profile" className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary">내 페이지 가꾸기 <span aria-hidden="true" className="ml-2">→</span></Link><Link href={'/teachers/' + user.id} className="inline-flex min-h-12 items-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-5 text-sm font-semibold">공개 미리보기</Link></div></div><div className="grid grid-cols-2 gap-3 md:w-64">{[{ label: '경력·자격', value: careerCount }, { label: '대표 작업', value: workCount }].map(item => <div key={item.label} className="rounded-xl bg-surface-container-lowest/90 p-4"><p className="text-xs text-on-surface-variant">{item.label}</p><p className="mt-2 text-2xl font-bold">{errors.includes('경력·대표 작업') ? '—' : item.value}<span className="ml-1 text-sm font-normal">개</span></p></div>)}</div></div>
    </section>
    <section aria-label="내 페이지 준비" className="grid gap-3 md:grid-cols-3">{steps.map(step => <Link key={step.title} href={step.href} className={panel + ' group transition-colors hover:border-primary/50'}><div className="flex items-center justify-between"><step.icon size={24} className="text-primary" aria-hidden="true" /><span className="text-xs text-on-surface-variant">{step.unavailable ? '확인 필요' : step.done ? '등록됨 · 업데이트' : '시작하기'}</span></div><h2 className="mt-4 font-semibold">{step.title}</h2><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{step.description}</p></Link>)}</section>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6"><section className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-headline-md">오늘의 일정</h2><Link href="/teacher/lessons" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">전체 수업 →</Link></div>
        {errors.includes('오늘 일정') ? <p className="py-8 text-sm text-on-surface-variant">일정을 확인할 수 없습니다. 다시 시도해주세요.</p> : data.sessions.length === 0 ? <div className="py-8 text-center"><CalendarCheck size={32} className="mx-auto text-outline" aria-hidden="true" /><p className="mt-3 font-semibold">오늘 예정된 수업이 없습니다</p><p className="mt-2 text-sm text-on-surface-variant">다음 수업을 확인하거나 자료를 정리해보세요.</p></div> : <ul className="mt-3 divide-y divide-surface-container-high">{data.sessions.map(session => <li key={session.id} className="py-4"><div className="flex gap-4"><div className="w-14 shrink-0"><p className="font-semibold">{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(session.scheduled_at))}</p><p className="mt-1 text-xs text-on-surface-variant">{session.duration_minutes}분</p></div><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{session.title}</h3><p className="mt-1 text-xs text-on-surface-variant">{session.enrolled_count}/{session.capacity}명 · {session.status === 'completed' ? '완료' : session.status === 'ongoing' ? '진행 중' : '예정'}</p><div className="mt-2 flex flex-wrap gap-4"><Link href={'/teacher/lessons/attendance?session=' + session.id} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">출석 관리</Link>{session.teacher_lesson_id && <Link href={'/teacher/lessons/' + session.teacher_lesson_id} className="inline-flex min-h-11 items-center text-sm text-on-surface-variant">수업 상세</Link>}</div></div></div></li>)}</ul>}
      </section><section className={panel}><div className="flex items-center justify-between gap-2"><h2 className="font-headline-md">최근 보관한 자료</h2><Link href="/teacher/materials" className="inline-flex min-h-11 items-center text-sm text-primary">자료실 →</Link></div>{errors.includes('자료실') ? <p className="py-5 text-sm text-on-surface-variant">자료를 확인하지 못했습니다.</p> : data.materials.length ? <ul className="mt-3 divide-y divide-surface-container-high">{data.materials.slice(0, 3).map(material => <li key={material.id}><Link href="/teacher/materials" className="flex min-h-16 items-center gap-3 py-3"><FileText size={22} className="shrink-0 text-secondary" aria-hidden="true" /><div className="min-w-0"><p className="break-words text-sm font-semibold">{material.fileName}</p><p className="mt-1 text-xs text-on-surface-variant">{material.folder || '미분류'} · {material.fileSize}</p></div></Link></li>)}</ul> : <p className="py-6 text-sm text-on-surface-variant">보관한 자료가 없습니다. 자주 쓰는 교재와 활동지를 자료실에 모아보세요.</p>}</section></div>
      <aside className="min-w-0 space-y-6"><section className={panel}><div className="flex items-center gap-2"><ShieldCheck size={22} className="shrink-0 text-secondary" aria-hidden="true" /><h2 className="font-semibold">수업 개설 준비</h2></div><p className="mt-4 text-lg font-bold">{errors.includes('심사 상태') ? '상태 확인 필요' : statusLabels[data.application?.status ?? 'not_applied']}</p><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{approved ? '승인된 선생님입니다. 수업·학생에서 수업을 개설하고 관리할 수 있습니다.' : '심사와 관계없이 내 페이지와 자료실을 이용할 수 있습니다. 수업 개설은 승인 후 가능합니다.'}</p>{data.application?.feedback && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-sm">{data.application.feedback}</p>}<Link href={approved ? '/teacher/lessons/new' : '/teacher/profile#teacher-review'} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">{approved ? '수업 개설하기 →' : '심사 안내 확인 →'}</Link></section>
      <section className={panel}><h2 className="font-semibold">공유하기 전 확인하세요</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{errors.includes('경력·대표 작업') ? '공개 기록 수를 확인하지 못했습니다.' : '현재 ' + publicCount + '개의 기록을 공개하고 있습니다.'} 경력과 자격은 본인이 작성한 정보로 표시됩니다.</p><Link href="/teacher/profile/portfolio" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary">공개 항목 관리 →</Link></section>
      <div className="grid grid-cols-2 gap-3"><Link href="/teacher/chat" className={panel + ' text-sm font-semibold'}>메시지 확인 →</Link><Link href="/teacher/settlement" className={panel + ' text-sm font-semibold'}>수익·정산 →</Link></div></aside>
    </div>
  </main>;
}
