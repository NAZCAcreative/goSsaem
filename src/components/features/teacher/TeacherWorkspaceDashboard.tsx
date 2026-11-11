'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, UserRound, Award, BookOpen, CalendarCheck, FileText, FolderOpen, PlusCircle, NotebookPen, ArrowUpRight, Check, Sprout } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getTeacherDetail, type TeacherDetail } from '@/lib/queries/teachers';
import { listPortfolio, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';
import { listMaterials, type MaterialRow } from '@/lib/queries/materials';
import { getMyTeacherApplication, type TeacherApplicationData } from '@/lib/queries/teacherApplications';
import { listTodayTeacherSessions, type WorkspaceSession } from '@/lib/queries/teacherWorkspace';
import { getMonthSummary, type MonthSummary } from '@/lib/queries/teacherTools';
import { PageLoading } from '@/components/shared/PageLoading';
import { TeacherTasks } from './TeacherTasks';
import { TeacherEarningsSummary } from './TeacherEarningsSummary';
import styles from './TeacherWorkspaceDashboard.module.css';

type Data = { profile: TeacherDetail | null; portfolio: PortfolioEntry[]; materials: MaterialRow[]; application: TeacherApplicationData | null; sessions: WorkspaceSession[]; summary: MonthSummary | null };
const initial: Data = { profile: null, portfolio: [], materials: [], application: null, sessions: [], summary: null };
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
    Promise.allSettled([getTeacherDetail(user.id), listPortfolio(user.id), listMaterials(user.id), getMyTeacherApplication(), listTodayTeacherSessions(user.id), getMonthSummary()]).then(results => {
      if (cancelled) return;
      const [profile, portfolio, materials, application, sessions, summary] = results;
      setData({ profile: profile.status === 'fulfilled' ? profile.value : null,
        portfolio: portfolio.status === 'fulfilled' ? portfolio.value : [], materials: materials.status === 'fulfilled' ? materials.value : [],
        application: application.status === 'fulfilled' ? application.value : null, sessions: sessions.status === 'fulfilled' ? sessions.value : [], summary: summary.status === 'fulfilled' ? summary.value : null });
      const keys = ['프로필', '경력·대표 작업', '자료실', '심사 상태', '오늘 일정', '활동 요약'];
      setErrors(results.flatMap((result, index) => result.status === 'rejected' || (index === 0 && result.status === 'fulfilled' && !result.value) ? [keys[index]] : []));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, ready, refresh]);
  if (!ready || loading) return <PageLoading />;
  if (!user || user.role !== 'teacher') return <main className="p-8"><h1>선생님 로그인이 필요합니다</h1><Link href="/login?role=teacher&next=%2Fteacher%2Fhome">선생님 로그인</Link></main>;
  const profile = data.profile;
  const approved = data.application?.status === 'approved' && !errors.includes('심사 상태');
  const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  const careerCount = data.portfolio.filter(row => row.kind !== 'work').length;
  const workCount = data.portfolio.filter(row => row.kind === 'work').length;
  const steps = [
    { label: '나를 소개하는 한 줄과 이야기', done: !!profile?.headline && !!profile?.bio, href: '/teacher/profile/edit', icon: UserRound, unavailable: errors.includes('프로필') },
    { label: `경력·자격 ${careerCount}건 등록`, done: careerCount > 0, href: '/teacher/profile/portfolio', icon: Award, unavailable: errors.includes('경력·대표 작업') },
    { label: `대표 작업 ${workCount}건 연결`, done: workCount > 0, href: '/teacher/profile/portfolio', icon: BookOpen, unavailable: errors.includes('경력·대표 작업') },
  ];
  const quick = [
    { label: approved ? '수업 개설' : '신청 상태', description: approved ? '새로운 만남 준비하기' : '선생님 신청 확인하기', href: approved ? '/teacher/lessons/new' : '/teacher/apply', icon: PlusCircle },
    { label: '프로필 업데이트', description: '나의 경험과 전문성', href: '/teacher/profile/edit', icon: UserRound },
    { label: '자료 업로드', description: '교재·활동지 모아두기', href: '/teacher/materials', icon: FolderOpen },
    { label: '학생 노트', description: '배움의 과정 기록하기', href: '/teacher/students', icon: NotebookPen },
    { label: '성장 기록', description: '경력과 작업 돌아보기', href: '/teacher/growth', icon: Sprout },
  ];
  return <main className={styles.workspace}>
    <section className={styles.hero} aria-label="선생님 작업 공간 소개"><p>고쌤 · 선생님의 작업 공간</p><h1>좋아하는 것으로 가르치고,<br />나만의 가능성을 넓혀요.</h1><p>한국어를 가르치는 선생님의 경험이 더 빛나는 공간</p></section>
    <div className={styles.content}>
      <div className={styles.greeting}><div className={styles.identity}>{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className={styles.avatar} /> : <span className={styles.avatar}>{(profile?.name || user.name).slice(0, 1)}</span>}<div><h2>{profile?.name || user.name} 선생님, 반가워요!</h2><p>오늘의 수업부터 내일의 성장까지, 차근차근 함께해요.</p></div></div><div className={styles.date}><span>{date}</span><button onClick={() => setRefresh(value => value + 1)} aria-label="대시보드 새로고침"><RefreshCw size={18} /></button></div></div>
      {errors.length > 0 && <div role="alert" className={styles.error}><p>{errors.join(', ')} 정보를 불러오지 못했습니다.</p><button onClick={() => setRefresh(value => value + 1)}>다시 시도</button></div>}
      <nav aria-label="빠른 시작" className={styles.shortcuts}>{quick.map(item => <Link key={item.href} href={item.href}><span className={styles.shortcutIcon}><item.icon size={27} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span></Link>)}</nav>
      <TeacherEarningsSummary />
      <div className={styles.grid}>
        <div className={styles.panel}><TeacherTasks compact /></div>
        <section className={styles.panel}><div className={styles.panelHeading}><h2><CalendarCheck size={21} />오늘의 수업 일정</h2><span>{errors.includes('오늘 일정') ? '확인 필요' : `${data.sessions.length}건`}</span></div>
          {errors.includes('오늘 일정') ? <p className={styles.empty}>일정을 불러오지 못했습니다.</p> : data.sessions.length ? <ul className={styles.sessions}>{data.sessions.map(session => <li key={session.id}><div className={styles.sessionTime}>{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(session.scheduled_at))}<small>{session.duration_minutes}분</small></div><div><span className={styles.badge}>{session.status === 'completed' ? '완료' : session.status === 'ongoing' ? '진행 중' : '예정'} · {session.enrolled_count}/{session.capacity}명</span><h3>{session.title}</h3><div className={styles.sessionLinks}><Link href={'/teacher/lessons/attendance?session=' + session.id}>출석 관리</Link>{session.teacher_lesson_id && <Link href={'/teacher/lessons/' + session.teacher_lesson_id}>수업 상세</Link>}</div></div></li>)}</ul> : <div className={styles.empty}><CalendarCheck size={30} /><p>오늘 예정된 수업이 없습니다</p><small>다음 수업을 준비하거나 학생 노트를 정리해보세요.</small></div>}
          <Link href="/teacher/lessons" className={styles.more}>전체 수업 보기 →</Link>
        </section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2><Sprout size={21} />활동 요약</h2><span>이번 달 · 한국 시간</span></div><div className={styles.stats}>{[{ label: '마친 수업', value: data.summary ? `${data.summary.completed}회` : '—' }, { label: '함께한 학생', value: data.summary ? `${data.summary.students}명` : '—' }, { label: '평균 만족도', value: data.summary?.rating != null ? Number(data.summary.rating).toFixed(1) : '—' }].map(item => <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong></div>)}</div><div className={styles.summaryNote}><p>작은 만남이 쌓여, 선생님의 경험이 됩니다.</p><small>{data.summary ? `이번 달 완료 수업과 작성된 후기 ${data.summary.reviews}건을 기준으로 집계합니다.` : '활동 정보를 확인할 수 없습니다. 다시 시도해주세요.'}</small></div><Link href="/teacher/settlement" className={styles.more}>수익·정산 확인 →</Link></section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2><UserRound size={21} />내 페이지 미리보기</h2><Link href={'/teachers/' + user.id} aria-label="공개 미리보기"><ArrowUpRight size={20} /></Link></div><div className={styles.profileCover}><span>가르치는 나, 성장하는 나</span></div><div className={styles.profileBody}><h3>{profile?.name || user.name} 선생님</h3><p>{errors.includes('프로필') ? '프로필을 불러오지 못했습니다.' : profile?.headline || '나를 소개하는 한 줄을 작성해보세요.'}</p><div className={styles.tags}>{profile?.specialties?.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div><Link href="/teacher/profile" className={styles.more}>내 페이지 가꾸기 →</Link></section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2><Award size={21} />나의 전문성과 성장</h2></div><ul className={styles.steps}>{steps.map(step => <li key={step.label}><Link href={step.href}><step.icon size={19} /><span>{step.unavailable ? '정보 확인 필요' : step.label}</span>{step.done && !step.unavailable ? <Check size={18} className={styles.done} /> : <ArrowUpRight size={17} />}</Link></li>)}</ul><Link href="/teacher/growth" className={styles.more}>성장 기록 모아보기 →</Link></section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2><FolderOpen size={21} />최근 보관한 자료</h2></div>{errors.includes('자료실') ? <p className={styles.empty}>자료를 불러오지 못했습니다.</p> : data.materials.length ? <ul className={styles.materials}>{data.materials.slice(0, 3).map(material => <li key={material.id}><Link href="/teacher/materials"><FileText size={20} /><span>{material.fileName}<small>{material.folder || '미분류'} · {material.fileSize}</small></span><ArrowUpRight size={16} /></Link></li>)}</ul> : <p className={styles.empty}>다시 쓰고 싶은 교재와 활동지를<br />나만의 자료실에 모아보세요.</p>}<Link href="/teacher/materials" className={styles.more}>자료실 열기 →</Link></section>
      </div>
    </div>
  </main>;
}
