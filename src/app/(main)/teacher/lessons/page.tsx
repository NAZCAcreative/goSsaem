'use client';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { ListPager } from '@/components/shared/ListPager';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listMySessions, type MySessionRow } from '@/lib/queries/teacherLessons';
import { useAuthStore } from '@/stores/auth-store';

const BADGE_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': '1:1', group: '그룹', free_trial: '무료' };
const TYPE_LABEL_FALLBACK: Record<MySessionRow['type'], string> = { '1on1': '1:1 화상 수업', group: '그룹 수업', free_trial: '무료 체험' };
const ACCENT_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': 'bg-primary', group: 'bg-secondary-container', free_trial: 'bg-outline-variant' };
const BADGE_ICON_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': 'person', group: 'groups', free_trial: 'volunteer_activism' };
const BADGE_CLASS = 'bg-primary-fixed text-on-primary-fixed-variant';

const TABS = [
  { label: '전체', badge: null as string | null },
  { label: '1:1 레슨', badge: '1:1' },
  { label: '그룹 클래스', badge: '그룹' },
  { label: '무료 체험', badge: '무료' },
];

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
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [sessions, setSessions] = useState<MySessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meetModalOpen, setMeetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].label);

  const load = async () => {
    if (!user) return;
    try {
      const data = await listMySessions(user.id, page, activeTab === '1:1 레슨' ? '1on1' : activeTab === '그룹 클래스' ? 'group' : activeTab === '무료 체험' ? 'free_trial' : '');
      setSessions(data);
    } catch {
      showToast('수업 목록을 불러오지 못했습니다');
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true); setSessions([]);
    void load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated, page, activeTab]);

  const activeBadge = TABS.find((tab) => tab.label === activeTab)?.badge ?? null;
  const visibleSessions = activeBadge ? sessions.filter((session) => BADGE_BY_TYPE[session.type] === activeBadge) : sessions;

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    showToast('최신 일정으로 새로고침했습니다');
    setRefreshing(false);
  };

  return (
    <PageContent loading={loading}>
    <>
      <main className="mx-auto min-h-screen max-w-[1200px] bg-background pb-28 font-body-md text-on-background">
        <section className="sticky top-[56px] z-40 border-b border-surface-container bg-surface px-container-margin pb-stack-md pt-4 shadow-sm">
          <div className="mb-stack-md flex items-center justify-between">
            <h1 className="font-headline-md text-headline-md text-on-surface">수업관리</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast('달력 보기는 준비 중입니다')}
                className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 font-label-sm text-primary transition-colors hover:bg-primary/5"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                달력으로 보기
              </button>
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

          <div className="hide-scrollbar flex gap-gutter-md overflow-x-auto pb-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => { setPage(1); setActiveTab(tab.label); }}
                  aria-pressed={active}
                  className={`shrink-0 rounded-lg px-4 py-2 font-label-lg transition-colors active:scale-[0.98] ${
                    active ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-stack-md px-container-margin py-stack-md">
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full flex-col gap-1">
              <p className="mb-1 text-[13px] font-bold uppercase tracking-wider text-primary/80">Upcoming Schedule</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event
                  </span>
                </div>
                <h2 className="break-keep font-headline-md text-headline-md font-bold text-on-surface">
                  {sessions.length}개의 예정된 수업
                </h2>
              </div>
            </div>
          </div>

          {loading && <p className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
          {!loading && visibleSessions.length === 0 && (
            <p className="py-10 text-center font-body-md text-on-surface-variant">해당 유형의 수업이 없습니다.</p>
          )}

          {visibleSessions.map((session) => (
            <SessionCard key={session.id} session={session} onOpenMeet={() => setMeetModalOpen(true)} />
          ))}
        </section>
      {user && <ListPager page={page} count={sessions.length} loading={loading} onPage={setPage} />}
      </main>

      {meetModalOpen && <GoogleMeetModal onClose={() => setMeetModalOpen(false)} />}
    </>
    </PageContent>
  );
}

function SessionCard({ session, onOpenMeet }: { session: MySessionRow; onOpenMeet: () => void }) {
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

      <div className="mt-2 flex w-full flex-row gap-2 md:mt-0 md:w-auto">
        <Link href={editHref} className="flex-1 rounded-lg border border-primary px-6 py-2.5 text-center text-[15px] font-bold text-primary transition-all hover:bg-primary/5 md:flex-none">
          수정
        </Link>
        <Link href={attendanceHref} className="flex-1 rounded-lg border border-outline px-6 py-2.5 text-center text-[15px] font-bold text-on-surface transition-all hover:bg-surface-container md:flex-none">
          출석 관리
        </Link>
        {ready ? (
          <button
            className="flex-[2] rounded-lg primary-gradient-btn px-8 py-2.5 text-[15px] font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] md:flex-none"
            onClick={onOpenMeet}
          >
            수업 링크
          </button>
        ) : (
          <button className="flex-[2] cursor-not-allowed rounded-lg border border-outline-variant/30 bg-surface-container px-6 py-2.5 font-label-lg text-outline md:flex-none" disabled>
            수업 링크
          </button>
        )}
      </div>
    </article>
  );
}

function GoogleMeetModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-container-margin">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="모달 닫기" />
      <section className="relative w-full max-w-sm overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl">
        <button className="absolute right-4 top-4 rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high" onClick={onClose} aria-label="닫기">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="material-symbols-outlined text-4xl text-primary">video_camera_front</span>
          </div>
          <h3 className="mb-2 font-headline-md text-headline-md text-on-surface">Google Meet 수업 입장</h3>
          <p className="mb-8 font-body-md text-body-md text-on-surface-variant">수업 시작 5분 전부터 입장이 가능합니다.</p>
          <button
            type="button"
            onClick={() => {
              showToast('수업 링크가 복사되었습니다');
              onClose();
            }}
            className="mb-3 w-full rounded-xl primary-gradient-btn py-4 font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            수업 링크
          </button>
          <button className="w-full rounded-lg py-3 font-label-lg text-on-surface-variant transition-colors hover:bg-surface-container" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}
