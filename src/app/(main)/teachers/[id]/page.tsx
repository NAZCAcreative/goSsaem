'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { TeacherImage } from '@/components/shared/LearningImage';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { addWishlist, getRecentBookingCount, getTeacherDetail, listWishlistedTeacherIds, removeWishlist, type TeacherDetail } from '@/lib/queries/teachers';
import { getOrCreateRoom } from '@/lib/queries/chat';
import { hasUsedFreeTrial, listTeacherLessons } from '@/lib/queries/bookings';
import { useAuthStore } from '@/stores/auth-store';

const DAYS = [
  { day: '월', date: '24' },
  { day: '화', date: '25' },
  { day: '수', date: '26' },
  { day: '목', date: '27' },
  { day: '금', date: '28' },
];

const EXTRA_DAYS = [
  { day: '토', date: '29' },
  { day: '일', date: '30' },
  { day: '월', date: '31' },
  { day: '화', date: '1' },
];

export default function TeacherDetailPage({ params }: { params: { id: string } }) {
  return <TeacherDetailContent key={params.id} params={params} />;
}

function TeacherDetailContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const userId = isHydrated ? user?.id : undefined;
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [selectedDate, setSelectedDate] = useState(DAYS[0].date);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState(false);
  const [recentBookings, setRecentBookings] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getTeacherDetail(params.id)
      .then((detail) => { if (!cancelled) setTeacher(detail); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [params.id, retry]);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    setFavorite(false);
    setFreeTrialAvailable(false);

    // Optional data must not prevent the public introduction from being displayed.
    if (userId) {
      void listWishlistedTeacherIds(userId)
        .then((ids) => { if (!cancelled) setFavorite(ids.has(params.id)); })
        .catch(() => {});
    }
    void getRecentBookingCount(params.id)
      .then((count) => { if (!cancelled) setRecentBookings(count); })
      .catch(() => {});
    void listTeacherLessons(params.id)
      .then(async (lessons) => {
        if (cancelled || !lessons.some((lesson) => lesson.type === 'free_trial')) return;
        const used = userId ? await hasUsedFreeTrial(userId, params.id) : false;
        if (!cancelled) setFreeTrialAvailable(!used);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [params.id, userId, isHydrated, retry]);

  const visibleDays = calendarExpanded ? [...DAYS, ...EXTRA_DAYS] : DAYS;

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${teacher?.name ?? ''}쌤 - GoSsaem`, url: shareUrl });
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 클립보드 복사로 대체
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('프로필 링크가 복사되었습니다');
    } else {
      showToast('공유하기를 준비 중입니다');
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      showToast('로그인 후 찜할 수 있습니다');
      return;
    }
    const next = !favorite;
    setFavorite(next);
    try {
      if (next) await addWishlist(user.id, params.id);
      else await removeWishlist(user.id, params.id);
    } catch {
      showToast('찜하기 처리에 실패했습니다');
      setFavorite(!next);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      showToast('로그인 후 메시지를 보낼 수 있습니다');
      return;
    }
    setMessaging(true);
    try {
      const roomId = await getOrCreateRoom(params.id, user.id);
      router.push(`/student/chat/${roomId}`);
    } catch {
      showToast('채팅방을 여는 데 실패했습니다');
    } finally {
      setMessaging(false);
    }
  };

  if (loading) return <PageLoading />;

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p role="alert" className="font-body-md text-on-surface-variant">선생님 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">다시 시도</button>
        <Link href="/student/search" className="text-primary">선생님 검색으로 돌아가기</Link>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">선생님을 찾을 수 없습니다</p>
        <Link href="/student/search" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          선생님 검색으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48 font-body-md text-on-background">
      <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-surface px-container-margin">
        <div className="flex items-center gap-stack-sm">
          <Link
            href="/student/search"
            aria-label="뒤로"
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Link>
        </div>
        <h1 className="font-headline-md text-headline-md font-extrabold text-primary">선생님 프로필</h1>
        <div className="flex items-center gap-stack-sm">
          <button
            type="button"
            aria-label="찜하기"
            aria-pressed={favorite}
            onClick={() => void toggleFavorite()}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary" style={favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              favorite
            </span>
          </button>
          <button
            type="button"
            aria-label="공유하기"
            onClick={() => void handleShare()}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-md">
        <section className="relative flex h-80 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
          <TeacherImage name={teacher.name} avatarUrl={teacher.avatarUrl} avatarIsGenerated={teacher.avatarIsGenerated} specialties={teacher.specialties} className="absolute inset-0 h-full w-full" />
          {teacher.introVideoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <button
                type="button"
                onClick={() => showToast('소개 영상을 준비 중입니다')}
                className="flex h-20 w-20 items-center justify-center rounded-lg border border-white/40 bg-white/30 backdrop-blur-md transition-transform active:scale-[0.98]"
                aria-label="소개 영상 재생"
              >
                <span className="material-symbols-outlined text-5xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
              </button>
            </div>
          )}
        </section>

        <section className="px-container-margin py-stack-lg">
          <div className="min-w-0 rounded-xl border border-surface-container-high bg-surface p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="min-w-0 break-words font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{teacher.name}</span>
              {teacher.isVerified && (
                <span className="material-symbols-outlined shrink-0 text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_florist
                </span>
              )}
            </div>
            {teacher.headline && <p className="break-words font-label-lg text-label-lg text-primary">{teacher.headline}</p>}
          </div>
        </section>

        <section className="px-container-margin">
          <div className="grid grid-cols-2 gap-stack-md">
            <div className="flex flex-col items-center rounded-xl border border-surface-container-highest bg-surface p-stack-lg text-center shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
              <span className="material-symbols-outlined mb-2 text-primary">workspace_premium</span>
              <span className="font-headline-md text-headline-md text-on-surface">{teacher.yearsExperience ?? '-'}년 이상</span>
              <span className="font-label-sm text-label-sm text-outline">강의 경력</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-surface-container-highest bg-surface p-stack-lg text-center shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
              <span className="material-symbols-outlined mb-2 text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-headline-md text-headline-md text-on-surface">{teacher.ratingAvg.toFixed(1)}</span>
              <span className="font-label-sm text-label-sm text-outline">리뷰 {teacher.ratingCount}개</span>
            </div>
          </div>
          {recentBookings > 0 && (
            <div className="mt-stack-md flex items-center justify-center gap-1.5 rounded-full bg-secondary/10 px-4 py-2 text-center">
              <span className="material-symbols-outlined text-[16px] text-secondary">local_fire_department</span>
              <span className="font-label-sm text-label-sm font-semibold text-secondary">최근 30일간 {recentBookings}회 예약되었어요</span>
            </div>
          )}
        </section>

        {teacher.ratingCount > 0 && (
          <section className="mt-section-gap px-container-margin">
            <h2 className="mb-stack-md font-headline-md text-headline-md">학생들의 평가</h2>
            <div className="space-y-3 rounded-xl bg-surface p-stack-lg shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
              <CategoryRatingBar label="친절함" value={teacher.categoryRatings.kindness} />
              <CategoryRatingBar label="설명 명확성" value={teacher.categoryRatings.clarity} />
              <CategoryRatingBar label="실력 향상" value={teacher.categoryRatings.improvement} />
              <CategoryRatingBar label="수업 준비" value={teacher.categoryRatings.preparation} />
            </div>
          </section>
        )}

        <section className="mt-section-gap px-container-margin">
          <h2 className="mb-stack-md font-headline-md text-headline-md">자기소개</h2>
          <div className="rounded-xl bg-surface p-stack-lg shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <p className="whitespace-pre-wrap font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {teacher.bio?.trim() || '아직 등록된 소개글이 없습니다.'}
            </p>
            <div className="mt-stack-lg flex flex-wrap gap-2">
              {teacher.specialties.map((label, index) => (
                <span
                  key={label}
                  className={`rounded-full px-3 py-1 font-label-sm text-label-sm ${
                    index === 0 ? 'bg-primary/10 text-primary' : index === 1 ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-section-gap px-container-margin">
          <div className="mb-stack-md flex items-end justify-between">
            <h2 className="font-headline-md text-headline-md">수업 가능 시간</h2>
            <button
              type="button"
              onClick={() => setCalendarExpanded((prev) => !prev)}
              className="font-label-lg text-label-lg text-primary"
            >
              {calendarExpanded ? '간략히 보기' : '달력 보기'}
            </button>
          </div>
          <div className="hide-scrollbar flex flex-wrap gap-stack-md overflow-x-auto pb-2">
            {visibleDays.map((day) => {
              const active = selectedDate === day.date;
              return (
                <button
                  type="button"
                  key={`${day.day}-${day.date}`}
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={active}
                  className={`flex min-w-[80px] flex-col items-center rounded-xl p-4 transition-colors ${
                    active ? 'bg-primary text-on-primary' : 'border border-surface-container-highest bg-surface'
                  }`}
                >
                  <span className={`font-label-sm text-label-sm ${active ? 'opacity-80' : 'text-outline'}`}>{day.day}</span>
                  <span className={`font-headline-md text-headline-md ${active ? '' : 'text-on-surface'}`}>{day.date}</span>
                </button>
              );
            })}
          </div>
        </section>
        {freeTrialAvailable && (
          <section className="mt-stack-lg flex items-center gap-3 rounded-xl bg-secondary-fixed/40 p-stack-md">
            <span className="material-symbols-outlined text-secondary">volunteer_activism</span>
            <div>
              <p className="font-label-lg text-label-lg font-bold text-on-surface">이 선생님과 무료 체험 수업이 가능해요</p>
              <p className="text-xs text-on-surface-variant">아직 사용하지 않은 1회 무료 체험이 남아있습니다. 예약 시 수업 선택에서 골라주세요.</p>
            </div>
          </section>
        )}
      </main>

      <div className="glass-effect fixed bottom-20 left-0 z-50 w-full px-container-margin pb-3 pt-3">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => void handleMessage()}
            disabled={messaging}
            aria-label="메시지 보내기"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border-2 border-primary text-primary transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="material-symbols-outlined">chat_bubble</span>
          </button>
          <Link
            href={`/student/booking/confirm?teacher=${teacher.id}&date=${selectedDate}`}
            className="primary-gradient flex w-full items-center justify-center gap-2 rounded-lg px-8 py-3 font-headline-md text-on-primary shadow-sm shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
          >
            예약하기
            <span className="material-symbols-outlined">calendar_today</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CategoryRatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-label-sm text-label-sm font-bold text-on-surface">{value.toFixed(1)}</span>
    </div>
  );
}
