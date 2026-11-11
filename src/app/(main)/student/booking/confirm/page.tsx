'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTeacherDetail, type TeacherDetail } from '@/lib/queries/teachers';
import { createBookingDraft, hasUsedFreeTrial, listTeacherLessons, type TeacherLesson } from '@/lib/queries/bookings';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
type BookingSlot = { start: string; duration: number; label: string; period: '오전' | '오후' | '저녁' };
const PERIODS: ('오전' | '오후' | '저녁')[] = ['오전', '오후', '저녁'];

function buildMonthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  return cells;
}

function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const teacherId = searchParams.get('teacher');

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);

  const today = useMemo(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState('');

  const viewedMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1), [today, monthOffset]);
  const monthLabel = `${viewedMonth.getFullYear()}년 ${viewedMonth.getMonth() + 1}월`;
  const calendarCells = useMemo(() => buildMonthGrid(viewedMonth.getFullYear(), viewedMonth.getMonth()), [viewedMonth]);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const [detail, teacherLessons, usedTrial] = await Promise.all([
          getTeacherDetail(teacherId!),
          listTeacherLessons(teacherId!),
          user ? hasUsedFreeTrial(user.id, teacherId!) : Promise.resolve(false),
        ]);
        if (cancelled) return;
        setTeacher(detail);
        setLessons(teacherLessons);
        setFreeTrialUsed(usedTrial);
        const requested = searchParams.get('lesson');
        const availableLessons = teacherLessons.filter(lesson => !(lesson.type === 'free_trial' && usedTrial));
        const firstAvailable = availableLessons.find(lesson => lesson.id === requested) ?? availableLessons[0];
        setSelectedLessonId(firstAvailable?.id ?? null);
      } catch {
        if (!cancelled) showToast('선생님 정보를 불러오지 못했습니다');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, user]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  useEffect(() => {
    if (!selectedLessonId || !user || selectedLesson?.schedulingMode !== 'fixed') return;
    let active = true;
    void createClient().from('lesson_sessions').select('scheduled_at')
      .eq('teacher_lesson_id', selectedLessonId).eq('status', 'scheduled')
      .gt('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1)
      .then(({ data }) => {
        if (!active || !data?.[0]) return;
        const date = new Date(new Date(data[0].scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        setMonthOffset((date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth());
        setSelectedDay(date.getDate());
      });
    return () => { active = false; };
  }, [selectedLessonId, selectedLesson?.schedulingMode, user, today]);

  useEffect(() => {
    let cancelled = false;
    setSelectedSlot(null); setSlots([]); setSlotError('');
    if (!selectedLessonId || !user) return;
    const day = Math.min(selectedDay, new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 0).getDate());
    if (day !== selectedDay) { setSelectedDay(day); return; }
    const date = viewedMonth.getFullYear() + '-' + String(viewedMonth.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    setSlotsLoading(true);
    createClient().rpc('lesson_booking_slots', { p_lesson: selectedLessonId, p_day: date }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setSlotError('예약 가능 시간을 불러오지 못했습니다. 날짜를 다시 선택해주세요.');
      else {
        const available = (data as { start: string; duration: number }[]).map(slot => {
          const hour = Number(new Date(slot.start).toLocaleString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }));
          return { ...slot, label: new Date(slot.start).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }), period: (hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁') as BookingSlot['period'] };
        });
        setSlots(available); setSelectedSlot(available[0] || null);
      }
      setSlotsLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedLessonId, selectedDay, viewedMonth, user]);

  const handleSubmit = async () => {
    if (!user) {
      showToast('로그인 후 예약할 수 있습니다');
      router.push('/signup');
      return;
    }
    if (!teacherId || !teacher || !selectedLesson || !selectedSlot || slotsLoading || submitting) {
      showToast('예약할 수업을 선택해주세요');
      return;
    }

    const scheduledAt = new Date(selectedSlot.start);

    setSubmitting(true);
    try {
      const { enrollmentId } = await createBookingDraft({
        studentId: user.id,
        teacherId,
        teacherLessonId: selectedLesson.id,
        title: selectedLesson.title,
        type: selectedLesson.type,
        capacity: selectedLesson.capacity,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: selectedSlot.duration,
      });
      router.push(`/student/payment?enrollment=${enrollmentId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '예약에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  if (!teacherId || !teacher) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">예약할 선생님을 찾을 수 없습니다</p>
        <a href="/student/search" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          선생님 검색으로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
      <div className="flex h-16 w-full items-center px-container-margin">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface transition-colors hover:bg-surface-container-high active:scale-[0.98]"
          aria-label="뒤로가기"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>
      <main className="flex-grow overflow-y-auto pb-64">
        <section className="px-container-margin py-stack-lg">
          <div className="mb-stack-md flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary/10 font-headline-md text-headline-md text-primary shadow-sm">
              {teacher.name.slice(0, 1)}
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{teacher.name} 선생님과 예약하기</h1>
              {teacher.headline && <p className="text-body-md text-on-surface-variant">{teacher.headline}</p>}
            </div>
          </div>
          <div className="flex h-1 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full w-2/3 bg-primary" />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="font-label-sm text-label-sm text-primary">시간 선택</span>
            <span className="font-label-sm text-label-sm text-outline">2단계 중 1단계</span>
          </div>
        </section>

        {lessons.length > 0 && (
          <section className="mb-section-gap px-container-margin">
            <h3 className="mb-stack-md font-headline-md text-headline-md">수업 선택</h3>
            <div className="flex flex-wrap gap-2">
              {lessons.map((lesson) => {
                const active = selectedLessonId === lesson.id;
                const disabled = lesson.type === 'free_trial' && freeTrialUsed;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      disabled
                        ? 'cursor-not-allowed border-outline-variant/30 bg-surface-container-low opacity-50'
                        : active
                        ? 'border-primary bg-primary-fixed'
                        : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-label-lg text-label-lg text-on-surface">{lesson.title}</p>
                      {lesson.type === 'free_trial' && (
                        <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-xs font-bold text-secondary">무료체험</span>
                      )}
                    </div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {lesson.category} · {lesson.schedulingMode === 'request' ? '학생 신청형' : '시간 확정형'} ·
                      {lesson.price === 0 ? '무료' : `₩${lesson.price.toLocaleString()}`} · {lesson.type === '1on1' ? '1:1' : lesson.type === 'free_trial' ? '무료체험' : '그룹'}
                      {disabled && ' · 이미 사용함'}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-section-gap px-container-margin">
          <div className="rounded-xl bg-surface-container-lowest p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            <div className="mb-stack-lg flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
                disabled={monthOffset === 0}
                className="material-symbols-outlined rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="이전 달"
              >
                chevron_left
              </button>
              <h2 className="font-headline-md text-headline-md">{monthLabel}</h2>
              <button
                type="button"
                onClick={() => setMonthOffset((prev) => Math.min(6, prev + 1))}
                disabled={monthOffset >= 6}
                className="material-symbols-outlined rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="다음 달"
              >
                chevron_right
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {WEEK_DAYS.map((day) => (
                <span key={day} className={`font-label-sm text-label-sm uppercase ${day === '일' ? 'text-error' : 'text-outline'}`}>
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-x-1 gap-y-2">
              {calendarCells.map((day, index) => {
                if (day === null) return <div key={`blank-${index}`} />;
                const selected = selectedDay === day;
                const isPast = monthOffset === 0 && day < today.getDate();
                return (
                  <button
                    type="button"
                    key={day}
                    disabled={isPast}
                    onClick={() => setSelectedDay(day)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg font-body-md ${
                      selected
                        ? 'scale-105 bg-primary font-bold text-white shadow-md'
                        : isPast
                        ? 'cursor-not-allowed text-outline-variant'
                        : 'hover:bg-surface-container-low'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-container-margin">
          <div className="mb-stack-md flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md">예약 가능한 시간</h3>
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              {selectedSlot ? selectedSlot.duration + '분 수업' : '시간 선택'}
            </span>
          </div>
          {slotsLoading && <p role="status">예약 가능 시간을 확인하는 중...</p>}
          {slotError && <p role="alert" className="text-red-600">{slotError}</p>}
          {!slotsLoading && !slotError && !slots.length && <p className="rounded-xl bg-slate-50 p-4 text-sm">선택한 날짜에 예약 가능한 시간이 없습니다.</p>}
          <div className="space-y-4">
            {PERIODS.map((period) => {
              const slotsInPeriod = slots.filter((slot) => slot.period === period);
              if (slotsInPeriod.length === 0) return null;
              return (
                <div key={period}>
                  <p className="mb-2 font-label-sm text-label-sm font-semibold text-on-surface-variant">{period}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {slotsInPeriod.map((slot) => {
                      const selected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          type="button"
                          key={`${slot.period}-${slot.label}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-xl border px-4 py-3 font-label-lg transition-all duration-200 ${
                            selected
                              ? 'border-primary bg-primary text-white shadow-sm'
                              : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-primary-fixed'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-stack-lg flex items-start gap-3 rounded-xl bg-primary-fixed p-stack-md">
            <span className="material-symbols-outlined text-primary">info</span>
            <p className="text-body-md text-on-surface">
              수업 시간은 한국 시간 기준으로 표시됩니다: <strong>GMT+9 (서울)</strong>.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-20 left-0 z-50 w-full bg-gradient-to-t from-background via-background to-transparent px-container-margin pb-3 pt-4">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !selectedLesson || !selectedSlot || slotsLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg primary-gradient-btn font-headline-md text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? '예약 처리 중...' : '결제 단계로 계속하기'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <BookingConfirmContent />
    </Suspense>
  );
}
