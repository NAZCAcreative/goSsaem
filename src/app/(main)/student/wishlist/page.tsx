'use client';

import { showError } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { TeacherImage } from '@/components/shared/LearningImage';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { listWishlistedTeachers, removeWishlist, type TeacherCard } from '@/lib/queries/teachers';
import { useAuthStore } from '@/stores/auth-store';

export default function WishlistPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [teachers, setTeachers] = useState<TeacherCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    listWishlistedTeachers(user.id)
      .then((data) => {
        if (!cancelled) setTeachers(data);
      })
      .catch(() => {
        if (!cancelled) showError('찜한 선생님 목록을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const handleRemove = async (teacherId: string) => {
    if (!user) return;
    setTeachers((prev) => prev.filter((teacher) => teacher.id !== teacherId));
    try {
      await removeWishlist(user.id, teacherId);
      showToast('찜 목록에서 제거했습니다');
    } catch {
      showError('찜 해제에 실패했습니다');
      void listWishlistedTeachers(user.id).then(setTeachers);
    }
  };

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-surface pb-24 text-on-surface antialiased">
      <div className="sticky top-0 z-40 flex w-full items-center justify-between bg-surface px-container-margin py-4 shadow-sm">
        <Link href="/student/profile" className="flex items-center justify-center rounded-lg p-2 text-primary transition-colors hover:bg-surface-container-high active:scale-[0.98]" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface">찜한 선생님</h1>
        <div className="w-10" />
      </div>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-stack-md px-container-margin py-stack-lg">
        {loading && <p className="py-16 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
        {!loading && teachers.length === 0 && (
          <p className="py-16 text-center font-body-md text-on-surface-variant">찜한 선생님이 없습니다.</p>
        )}
        {teachers.map((teacher) => (
          <article key={teacher.id} className="wishlist-card relative flex flex-col gap-4 overflow-hidden rounded-xl p-4 transition-transform duration-200 hover:-translate-y-1 md:flex-row">
            <Link href={`/teachers/${teacher.id}`} aria-label={`${teacher.name} 선생님 상세 소개 보기`} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-offset-[-3px]" />
            <Link href={`/teachers/${teacher.id}`} className="relative mx-auto h-24 w-24 flex-shrink-0 md:mx-0 md:h-32 md:w-32">
              <TeacherImage name={teacher.name} avatarUrl={teacher.avatarUrl} avatarIsGenerated={teacher.avatarIsGenerated} specialties={teacher.specialties} className="h-full w-full rounded-xl" />
              {teacher.isVerified && (
                <div className="absolute bottom-0 right-0 z-10 flex h-6 w-6 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                </div>
              )}
            </Link>
            <div className="flex flex-1 flex-col justify-between text-center md:text-left">
              <div>
                <div className="mb-1 flex items-start justify-between">
                  <Link href={`/teachers/${teacher.id}`} className="font-headline-md text-headline-md text-on-surface hover:underline">
                    {teacher.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(teacher.id)}
                    className="absolute right-4 top-4 z-20 text-secondary-container transition-transform hover:scale-110 active:scale-[0.98] md:relative md:right-auto md:top-auto"
                    aria-label="찜 해제"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      favorite
                    </span>
                  </button>
                </div>
                {teacher.headline && <p className="mb-2 font-label-sm text-label-sm text-on-surface-variant">{teacher.headline}</p>}
                <div className="mb-3 flex items-center justify-center gap-1 md:justify-start">
                  <span className="material-symbols-outlined text-[16px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-label-lg text-label-lg font-bold">{teacher.ratingAvg.toFixed(1)}</span>
                  <span className="font-body-md text-body-md text-outline">({teacher.ratingCount}개 후기)</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                {teacher.specialties.slice(0, 3).map((tag, index) => (
                  <span
                    key={tag}
                    className={`rounded-full px-3 py-1 font-label-sm text-label-sm ${
                      index === 0 ? 'bg-primary-fixed/20 text-on-primary-fixed' : index === 1 ? 'bg-secondary-fixed/20 text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
    </PageContent>
  );
}
