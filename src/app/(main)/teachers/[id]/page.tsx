'use client';

import { showWarning, showError } from '@/components/shared/AlertDialog';

import { PageLoading } from '@/components/shared/PageLoading';
import { PublicPortfolio } from '@/components/features/teacher/PublicPortfolio';
import Link from 'next/link';
import { TeacherImage } from '@/components/shared/LearningImage';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { addWishlist, getRecentBookingCount, getTeacherDetail, listWishlistedTeacherIds, removeWishlist, type TeacherDetail } from '@/lib/queries/teachers';
import { getOrCreateRoom } from '@/lib/queries/chat';
import { hasUsedFreeTrial, listTeacherLessons, type TeacherLesson } from '@/lib/queries/bookings';
import { useAuthStore } from '@/stores/auth-store';

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
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [lessonError, setLessonError] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState(false);
  const [recentBookings, setRecentBookings] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getTeacherDetail(params.id)
      .then((detail) => { if (!cancelled) setTeacher(detail); })
      .catch(() => { if (!cancelled) { setLoadError(true); showError('선생님 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'); } })
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
    setLessonError(false);
    void listTeacherLessons(params.id)
      .then(async (lessons) => {
        if (cancelled) return;
        setLessons(lessons);
        if (!lessons.some((lesson) => lesson.type === 'free_trial')) return;
        const used = userId ? await hasUsedFreeTrial(userId, params.id) : false;
        if (!cancelled) setFreeTrialAvailable(!used);
      })
      .catch(() => { if (!cancelled) { setLessonError(true); showError('수업을 불러오지 못했습니다. 다시 시도해주세요.'); } });

    return () => { cancelled = true; };
  }, [params.id, userId, isHydrated, retry]);


  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${teacher?.name ?? ''}쌤 - GoSsaem`, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(shareUrl); showToast('프로필 링크가 복사되었습니다'); }
      catch { showError('주소창의 페이지 주소를 복사해 공유해주세요.'); }
    } else {
      showToast('주소창의 페이지 주소를 복사해 공유해주세요.');
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      showWarning('로그인 후 찜할 수 있습니다');
      return;
    }
    const next = !favorite;
    setFavorite(next);
    try {
      if (next) await addWishlist(user.id, params.id);
      else await removeWishlist(user.id, params.id);
    } catch {
      showError('찜하기 처리에 실패했습니다');
      setFavorite(!next);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      showWarning('로그인 후 메시지를 보낼 수 있습니다');
      return;
    }
    setMessaging(true);
    try {
      const roomId = await getOrCreateRoom(params.id, user.id);
      router.push(`/student/chat/${roomId}`);
    } catch {
      showError('채팅방을 여는 데 실패했습니다');
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
      <div className="flex min-h-16 w-full items-center justify-between gap-2 bg-background px-container-margin">
        <div className="flex items-center gap-stack-sm">
          <Link
            href={user?.id === params.id ? '/teacher/profile' : '/student/search'}
            aria-label="뒤로"
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Link>
        </div>
        <h1 className="font-headline-md text-headline-md font-extrabold text-primary">{user?.id === params.id ? '공개 미리보기' : '선생님 개인페이지'}</h1>
        <div className="flex items-center gap-stack-sm">
          {user?.role !== 'teacher' && <button
            type="button"
            aria-label="찜하기"
            aria-pressed={favorite}
            onClick={() => void toggleFavorite()}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:bg-surface-container-low active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-primary" style={favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              favorite
            </span>
          </button>}
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

      <main className="mx-auto max-w-4xl">
        {user?.id === params.id && <p className="m-5 rounded-xl bg-primary-container p-4 text-sm text-on-primary-container">방문자에게 공개되는 소개와 기록입니다. <Link href="/teacher/profile/portfolio" className="font-semibold underline">공개 항목 관리</Link></p>}
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

        <div className="mt-section-gap px-container-margin"><PublicPortfolio teacherId={params.id} /></div>
        {(lessons.length > 0 || lessonError) && <section className="mt-section-gap px-container-margin space-y-4">
          <h2 className="font-headline-md text-headline-md">등록된 수업</h2>
          {lessonError ? <p role="alert">수업을 불러오지 못했습니다. <button className="text-primary" onClick={() => setRetry(value => value + 1)}>다시 시도</button></p> : !lessons.length && <p>현재 공개된 수업이 없습니다.</p>}
          {lessons.map(lesson => <article key={lesson.id} className="rounded-xl border p-5 space-y-2">
            <h3 className="font-bold">{lesson.title}</h3>
            <p>{lesson.category} · {lesson.level} · {lesson.schedulingMode === 'request' ? '학생 신청형' : '시간 확정형'}</p>
            <p>{lesson.price.toLocaleString()}원 · 정원 {lesson.capacity}명</p>
            <p className="whitespace-pre-wrap">{lesson.description}</p>
            <Link className="inline-block text-primary" href={`/student/booking/confirm?teacher=${teacher.id}&lesson=${lesson.id}`}>가능한 시간 확인 및 신청</Link>
          </article>)}
        </section>}
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

      {user?.role !== 'teacher' && <div className="glass-effect fixed bottom-20 left-0 z-50 w-full px-container-margin pb-3 pt-3">
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
          {lessons.length > 0 && <Link
            href={`/student/booking/confirm?teacher=${teacher.id}`}
            className="primary-gradient flex w-full items-center justify-center gap-2 rounded-lg px-8 py-3 font-headline-md text-on-primary shadow-sm shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
          >
            예약하기
            <span className="material-symbols-outlined">calendar_today</span>
          </Link>}
        </div>
      </div>}
    </div>
  );
}

function CategoryRatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full primary-gradient" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-label-sm text-label-sm font-bold text-on-surface">{value.toFixed(1)}</span>
    </div>
  );
}
