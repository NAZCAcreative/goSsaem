'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState, useRef } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listMySessions, listMyLessons, type TeacherLessonRow, type MySessionRow } from '@/lib/queries/teacherLessons';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';

const BADGE_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': '1:1', group: '그룹', free_trial: '무료' };
const TYPE_LABEL_FALLBACK: Record<MySessionRow['type'], string> = { '1on1': '1:1 화상 수업', group: '그룹 수업', free_trial: '무료 체험' };
const ACCENT_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': 'bg-primary', group: 'bg-secondary-container', free_trial: 'bg-outline-variant' };
const BADGE_ICON_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': 'person', group: 'groups', free_trial: 'volunteer_activism' };
const BADGE_CLASS = 'bg-primary-fixed text-on-primary-fixed-variant';


function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }),
    time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

export default function TeacherLessonsPage() {
  const [page, setPage] = useState(1);
  const [lessonPage, setLessonPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [lessons, setLessons] = useState<TeacherLessonRow[]>([]);
  const [sessions, setSessions] = useState<MySessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    if (!user) return false;
    const version = ++requestVersion.current;
    setLoadError(false);
    try {
      const data = await listMySessions(user.id, page, '');
      const products = await listMyLessons(user.id, lessonPage, '');
      if (version !== requestVersion.current) return false;
      setLessons(products);
      setSessions(data);
      return true;
    } catch {
      if (version === requestVersion.current) setLoadError(true);
      return false;
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true); setSessions([]);
    let cancelled = false;
    void load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; requestVersion.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated, page, lessonPage]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { void load(); };
    const supabase = createClient();
    const channel = supabase.channel(`teacher-lessons-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_sessions', filter: `teacher_id=eq.${user.id}` }, refresh).subscribe();
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, lessonPage]);

  const visibleSessions = sessions;

  const handleRefresh = async () => {
    setRefreshing(true);
    if (await load()) showToast('최신 일정으로 새로고침했습니다');
    setRefreshing(false);
  };

  return (
    <PageContent loading={loading}>
    <>
      <main className="mx-auto min-h-screen max-w-[1200px] bg-background pb-28 font-body-md text-on-background">
        <section className="border-b border-surface-container-high bg-background px-container-margin pb-stack-md pt-stack-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">수업 관리</h1>
            <div className="flex items-center gap-2">
              <Link href="/teacher/lessons/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-600/20 transition-colors hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 sm:px-6"><Plus size={20} aria-hidden="true" />수업 등록</Link>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="flex items-center justify-center rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
                aria-label="새로고침"
              >
                <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>

        </section>

        <section className="space-y-4 px-container-margin pt-6">
          {loadError && <p role="alert" className="rounded-xl bg-error-container/20 p-4 text-sm">수업 목록을 불러오지 못했습니다. 상단 새로고침으로 다시 시도해주세요.</p>}
          <h2 className="text-xl font-bold">등록한 수업</h2>
          {lessons.map(lesson => <Link key={lesson.id} href={`/teacher/lessons/${lesson.id}`} className="block rounded-xl border bg-surface p-4"><h3 className="font-bold">{lesson.title}</h3><p>{lesson.category} · {lesson.schedulingMode === 'request' ? '학생 신청형' : '시간 확정형'} · {lesson.price.toLocaleString()}원</p></Link>)}
          <ListPager page={lessonPage} count={lessons.length} loading={loading} onPage={setLessonPage} />
        </section>
        <section className="flex flex-col gap-stack-md px-container-margin py-stack-md">
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full flex-col gap-1">
              <p className="mb-1 text-sm font-semibold text-primary">수업 일정</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event
                  </span>
                </div>
                <h2 className="break-keep font-headline-md text-headline-md font-bold text-on-surface">
                  {loadError ? '일정을 확인하지 못했습니다' : `현재 목록 ${sessions.length}개`}
                </h2>
              </div>
            </div>
          </div>

          {loading && <p className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {!loading && !loadError && visibleSessions.length === 0 && (
            <p className="py-10 text-center font-body-md text-on-surface-variant">예정된 수업이 없습니다.</p>
          )}

          {visibleSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </section>
      {user && <ListPager page={page} count={sessions.length} loading={loading} onPage={setPage} />}
      </main>


    </>
    </PageContent>
  );
}

function SessionCard({ session }: { session: MySessionRow }) {
  const badge = BADGE_BY_TYPE[session.type];
  const { date, time } = formatDateTime(session.scheduledAt);
  const ready = isToday(session.scheduledAt);
  const editHref = session.teacherLessonId ? `/teacher/lessons/edit?id=${session.teacherLessonId}` : '/teacher/lessons';
  const attendanceHref = `/teacher/lessons/attendance?session=${session.id}`;

  return (
    <article className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md md:flex-row md:items-center">
      <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${ACCENT_BY_TYPE[session.type]}`} />
      <div className={`flex flex-1 items-start gap-4 ${ready ? '' : 'opacity-80'}`}>
        <div className="flex min-w-[76px] flex-col items-center">
          <span className="font-label-sm text-label-sm font-bold text-on-surface">{date}</span>
          <span className="font-label-lg text-label-lg font-bold text-on-surface">{time}</span>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${BADGE_CLASS}`}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {BADGE_ICON_BY_TYPE[session.type]}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-label-lg text-label-lg font-bold text-on-surface">{session.title}</h3>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${BADGE_CLASS}`}>{badge}</span>
            {ready && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">오늘</span>}
          </div>
          <div className="flex flex-wrap gap-2 font-body-md text-body-md text-on-surface-variant">
            <span>{session.category ?? TYPE_LABEL_FALLBACK[session.type]}</span>
            <span aria-hidden="true">·</span>
            <span>{session.level ?? '전체 레벨'}</span>
            <span aria-hidden="true">·</span>
            <span>
              {session.enrolledCount}/{session.capacity}명 예약
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex w-full flex-wrap gap-2 md:mt-0 md:w-auto">
        <Link href={editHref} className="flex-1 rounded-lg border border-primary px-6 py-2.5 text-center text-[15px] font-bold text-primary transition-all hover:bg-primary/5 md:flex-none">
          수정
        </Link>
        <Link href={attendanceHref} className="flex-1 rounded-lg border border-outline px-6 py-2.5 text-center text-[15px] font-bold text-on-surface transition-all hover:bg-surface-container md:flex-none">
          출석 관리
        </Link>
        {session.meetingLink && /^https?:\/\//i.test(session.meetingLink) ? <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary">수업 입장</a> : <span className="inline-flex min-h-11 flex-1 items-center justify-center text-xs text-outline">링크 미등록</span>}      </div>
    </article>
  );
}
