'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listMySessions, type MySessionRow } from '@/lib/queries/teacherLessons';
import { getTeacherOverview, type TeacherOverview } from '@/lib/queries/teacherOverview';
import { useAuthStore } from '@/stores/auth-store';
import { AdminEntry } from '@/components/shared/AdminEntry';

const BADGE_BY_TYPE: Record<MySessionRow['type'], string> = { '1on1': '1:1 수업', group: '그룹 수업', free_trial: '무료 체험' };
const TABS = ['전체', '1:1 수업', '그룹 수업', '무료 체험'];

function formatWon(amount: number) {
  return `₩${amount.toLocaleString()}`;
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function HomeTPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [sessions, setSessions] = useState<MySessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([getTeacherOverview(user.id), listMySessions(user.id, 1, '', true)])
      .then(([overviewData, sessionRows]) => {
        if (cancelled) return;
        setOverview(overviewData);
        setSessions(sessionRows.filter((s) => isToday(s.scheduledAt)));
      })
      .catch(() => {
        if (!cancelled) showError('홈 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const visibleSchedule = activeTab === TABS[0] ? sessions : sessions.filter((s) => BADGE_BY_TYPE[s.type] === activeTab);
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen max-w-[1200px] bg-background px-container-margin pb-28 pt-stack-lg font-body-md text-on-surface">
      <section className="mt-2">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          안녕하세요, {loading ? '선생님' : `${overview?.name ?? '선생님'}쌤`}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">오늘도 멋진 수업 만들어봐요!</p>
      </section>

      <div className="mt-4">
        <AdminEntry />
      </div>



      <section className="primary-gradient relative mt-stack-lg overflow-hidden rounded-xl p-stack-lg text-on-primary shadow-lg">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="font-label-sm text-label-sm opacity-90">이번 달 정산액</p>
            <h3 className="mt-1 font-display-lg text-display-lg">{overview ? formatWon(overview.monthRevenue) : '-'}</h3>
          </div>
          <span className="material-symbols-outlined text-4xl opacity-30">payments</span>
        </div>
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      </section>

      <section className="mt-stack-lg grid grid-cols-3 gap-2 sm:gap-stack-md">
        <StatCard label="예정 수업" value={overview ? `${overview.upcomingSessionCount}건` : '-'} helper={`오늘 ${sessions.length}건`} valueClassName="text-primary" />
        <StatCard label="완료 수업" value={overview ? `${overview.completedSessionCount}건` : '-'} helper="전체" valueClassName="text-secondary" />
        <div className="flex flex-col items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md text-center shadow-sm">
          <p className="font-label-sm text-label-sm text-on-surface-variant">평균 평점</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <p className="font-headline-md text-headline-md text-on-surface">{overview ? overview.ratingAvg.toFixed(1) : '-'}</p>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">({overview?.ratingCount ?? 0})</p>
        </div>
      </section>

      <section className="mt-section-gap space-y-stack-md">
        <div className="flex items-end justify-between px-1">
          <div>
            <h4 className="font-headline-md text-headline-md">오늘의 일정</h4>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">{todayLabel}</p>
          </div>
          {!loading && visibleSchedule.length > 0 && <Link href="/teacher/lessons" className="flex items-center gap-1 font-label-lg text-primary transition-opacity hover:opacity-80">
            더보기 <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>}
        </div>

        <div className="-mx-container-margin flex gap-2 overflow-x-auto px-container-margin py-1 no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-lg px-5 py-2 text-[13px] font-semibold transition-colors ${
                  active ? 'bg-primary text-on-primary shadow-sm shadow-primary/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="space-y-stack-md">
          {!loading && visibleSchedule.length === 0 && (
            <p className="py-8 text-center font-body-md text-on-surface-variant">{activeTab === TABS[0] ? '오늘 예정된 수업이 없습니다.' : '오늘은 해당 유형의 수업이 없습니다.'}</p>
          )}
          {visibleSchedule.map((session) => (
            <ScheduleCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <section className="glass-card mt-section-gap flex items-center gap-4 rounded-xl border border-primary/10 p-stack-lg">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
          <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
        </div>
        <div>
          <h5 className="font-label-lg text-label-lg text-primary">교사 팁: 활발한 피드백</h5>
          <p className="mt-1 text-[12px] leading-snug text-on-surface-variant">수업 직후 피드백을 작성하면 학생의 재수강률이 40% 이상 상승합니다.</p>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute left-[12%] top-[18%] h-16 w-16 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-[12%] top-[56%] h-20 w-20 rounded-full bg-secondary/5 blur-3xl" />
      </div>
    </main>
    </PageContent>
  );
}

function StatCard({ label, value, helper, valueClassName }: { label: string; value: string; helper: string; valueClassName: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md text-center shadow-sm">
      <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
      <p className={`mt-1 font-headline-md text-headline-md ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{helper}</p>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ScheduleCard({ session }: { session: MySessionRow }) {
  const icon = session.type === 'group' ? 'groups' : session.type === 'free_trial' ? 'volunteer_activism' : 'person';

  return (
    <Link href="/teacher/lessons" className="block rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="w-14 shrink-0 pt-0.5">
            <p className="font-label-lg text-label-lg font-bold text-on-surface">{formatTime(session.scheduledAt)}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">{session.durationMinutes}분</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-label-lg text-label-lg font-bold text-on-surface">{session.title}</p>
            <p className="mt-1 truncate text-[12px] text-on-surface-variant">
              {BADGE_BY_TYPE[session.type]} · {session.category ?? session.level ?? '전체 레벨'} · {session.enrolledCount}/{session.capacity}명
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 font-label-sm text-label-sm text-primary">{session.status === 'scheduled' ? '예정' : session.status}</span>
      </div>
    </Link>
  );
}
