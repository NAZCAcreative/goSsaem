'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/components/shared/Toast';
import {
  listMySessionsForAttendance,
  listSessionRoster,
  listStudentAttendanceStats,
  upsertAttendance,
  type AttendanceStatus,
  type AttendanceStudentRow,
  type StudentAttendanceStat,
  type TeacherSessionSummary,
} from '@/lib/queries/attendance';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
  { label: '출석', value: 'present' },
  { label: '지각', value: 'late' },
  { label: '결석', value: 'absent' },
];

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function TeacherAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const requestedSessionId = searchParams.get('session');

  const [sessions, setSessions] = useState<TeacherSessionSummary[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [roster, setRoster] = useState<AttendanceStudentRow[]>([]);
  const [stats, setStats] = useState<StudentAttendanceStat[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([listMySessionsForAttendance(user.id), listStudentAttendanceStats(user.id)])
      .then(([sessionRows, statRows]) => {
        if (cancelled) return;
        setSessions(sessionRows);
        setStats(statRows);
        const foundIndex = requestedSessionId ? sessionRows.findIndex((row) => row.id === requestedSessionId) : -1;
        setSessionIndex(foundIndex >= 0 ? foundIndex : 0);
      })
      .catch(() => {
        if (!cancelled) showError('수업 일정을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated]);

  const currentSession = sessions[sessionIndex];

  useEffect(() => {
    if (!currentSession) return;
    let cancelled = false;

    listSessionRoster(currentSession.id)
      .then((rows) => {
        if (cancelled) return;
        setRoster(rows);
        setStatuses(Object.fromEntries(rows.map((row) => [row.enrollmentId, row.status])));
      })
      .catch(() => {
        if (!cancelled) showError('수강생 명단을 불러오지 못했습니다');
      });

    return () => {
      cancelled = true;
    };
  }, [currentSession]);

  const handleSave = async () => {
    if (!user || !currentSession) return;
    setSaving(true);
    try {
      await Promise.all(
        roster
          .filter((row) => statuses[row.enrollmentId])
          .map((row) => upsertAttendance(row.enrollmentId, statuses[row.enrollmentId] as AttendanceStatus, user.id)),
      );
      showToast('출석 정보가 저장되었습니다');
      router.push('/teacher/lessons');
    } catch {
      showError('출석 정보 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  if (sessions.length === 0 || !currentSession) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">출석을 관리할 수업이 없습니다</p>
        <Link href="/teacher/lessons" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          수업관리로 돌아가기
        </Link>
      </main>
    );
  }

  const rosterStats = roster
    .map((row) => stats.find((stat) => stat.studentId === row.studentId))
    .filter((stat): stat is StudentAttendanceStat => Boolean(stat));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-surface">
      <section className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/teacher/lessons" className="rounded-lg p-2 transition-colors hover:bg-surface-container-high active:scale-[0.98]" aria-label="뒤로가기">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-headline-md font-semibold text-primary">출석 관리</h1>
        </div>
      </section>

      <section className="mb-6">
        <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              {currentSession.category && (
                <span className="mb-2 inline-block rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed">{currentSession.category}</span>
              )}
              <h2 className="font-headline-md text-xl font-bold text-on-surface">{currentSession.title}</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-secondary">
                {currentSession.enrolledCount}/{currentSession.capacity}명
              </span>
              <span className="text-xs text-outline">수강 인원</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-on-surface-variant transition-colors hover:bg-surface-container-high">
            <button
              type="button"
              onClick={() => setSessionIndex((prev) => Math.max(0, prev - 1))}
              disabled={sessionIndex === 0}
              className="flex items-center justify-center rounded-lg p-1 transition-transform hover:bg-surface-container-highest active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="이전 일정"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl font-bold text-primary">calendar_today</span>
              <span className="font-body-md text-body-md font-bold text-on-surface">{formatSessionDate(currentSession.scheduledAt)}</span>
            </div>
            <button
              type="button"
              onClick={() => setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1))}
              disabled={sessionIndex === sessions.length - 1}
              className="flex items-center justify-center rounded-lg p-1 transition-transform hover:bg-surface-container-highest active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="다음 일정"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {rosterStats.length > 0 && (
        <section className="mb-8 rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">학생별 수업 참여율</h2>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">학생별 전체 수업 대비 실제 참여한 수업 비율입니다.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rosterStats.map((stat) => {
              const rate = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
              return (
                <article key={stat.studentId} className="rounded-xl border border-surface-container bg-surface-container-low p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary/10 font-bold text-primary">
                      {stat.studentName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-label-lg text-label-lg text-on-surface">{stat.studentName}</h3>
                    </div>
                  </div>

                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {stat.present}/{stat.total}회 참여
                    </span>
                    <span className="font-headline-md text-headline-md text-primary">{rate}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full primary-gradient" style={{ width: `${rate}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline-md text-lg font-bold">수강생 명단</h3>
          <span className="font-body-md text-body-md text-outline">상태를 선택해주세요</span>
        </div>
        {roster.length === 0 && <p className="py-10 text-center font-body-md text-on-surface-variant">이 수업에 예약한 학생이 없습니다.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {roster.map((student) => (
            <article key={student.enrollmentId} className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed font-bold text-primary">{student.studentName.slice(0, 1)}</div>
                <span className="font-bold text-on-surface">{student.studentName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={getStatusClass(statuses[student.enrollmentId] ?? null, option.value)}
                    onClick={() => setStatuses((current) => ({ ...current, [student.enrollmentId]: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || roster.length === 0}
          className="w-full rounded-xl primary-gradient-btn py-4 text-lg font-bold text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? '저장 중...' : '출석 완료 저장'}
        </button>
      </div>
    </main>
  );
}

function getStatusClass(current: AttendanceStatus | null, value: AttendanceStatus) {
  const base = 'rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-semibold transition-all';
  if (current !== value) {
    return `${base} text-on-surface-variant hover:bg-surface-container-high`;
  }
  if (value === 'present') {
    return `${base} bg-primary-container text-on-primary-container ring-2 ring-primary`;
  }
  if (value === 'late') {
    return `${base} bg-secondary-container text-on-secondary-container ring-2 ring-secondary`;
  }
  return `${base} bg-error-container text-on-error-container ring-2 ring-error`;
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TeacherAttendanceContent />
    </Suspense>
  );
}
