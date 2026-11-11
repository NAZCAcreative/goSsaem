'use client';

import { showError, showWarning } from '@/components/shared/AlertDialog';

import Link from 'next/link';
import { TeacherImage, LearningImage } from '@/components/shared/LearningImage';
import { TeacherSearchForm } from '@/components/shared/TeacherSearchForm';
import { useEffect, useState } from 'react';
import { addWishlist, listFeaturedTeachers, listRecentBookingCounts, listTeachers, listWishlistedTeacherIds, removeWishlist, type TeacherCard } from '@/lib/queries/teachers';
import { getHomeBanner, type HomeBanner } from '@/lib/queries/home';
import { useAuthStore } from '@/stores/auth-store';

const DEFAULT_BANNER: HomeBanner = {
  tag: 'LIVE',
  title: 'K-POP으로 배우는 한국어\n무료 라이브 클래스',
  cta_label: '지금 확인하기',
  cta_href: '/student/search',
  image_scene: 'seoul',
  is_active: true,
};

const QUICK_ACCESS = [
  { icon: 'calendar_month', label: '1:1 수업', color: 'text-primary', bg: 'bg-primary/10', href: '/student/search' },
  { icon: 'groups', label: '그룹 클래스', color: 'text-secondary', bg: 'bg-secondary/10', href: '/student/search' },
  { icon: 'card_giftcard', label: '무료 체험', color: 'text-tertiary', bg: 'bg-tertiary/10', href: '/student/search' },
  { icon: 'live_tv', label: '라이브', color: 'text-primary', bg: 'bg-primary/10', href: '/student/search' },
];

const CATEGORIES = [
  { icon: 'music_note', label: 'K-POP 한국어', color: 'text-primary', bg: 'bg-primary/5', hover: 'group-hover:bg-primary/10' },
  { icon: 'movie', label: 'K-DRAMA 표현', color: 'text-secondary', bg: 'bg-secondary/5', hover: 'group-hover:bg-secondary/10' },
  { icon: 'school', label: 'TOPIK 준비반', color: 'text-tertiary', bg: 'bg-tertiary/5', hover: 'group-hover:bg-tertiary/10' },
  { icon: 'flight', label: '여행 한국어', color: 'text-secondary', bg: 'bg-secondary/5', hover: 'group-hover:bg-secondary/10' },
];


export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [teachers, setTeachers] = useState<TeacherCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentBookingMap, setRecentBookingMap] = useState<Map<string, number>>(new Map());
  const [banner, setBanner] = useState<HomeBanner>(DEFAULT_BANNER);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        const [featuredList, teacherList, wishlisted, recentBookings, homeBanner] = await Promise.all([
          listFeaturedTeachers(4),
          listTeachers(),
          user ? listWishlistedTeacherIds(user.id) : Promise.resolve(new Set<string>()),
          listRecentBookingCounts().catch(() => new Map<string, number>()),
          getHomeBanner().catch(() => null),
        ]);
        if (cancelled) return;
        setTeachers(featuredList.length > 0 ? featuredList : teacherList.slice(0, 4));
        setFavorites(wishlisted);
        setRecentBookingMap(recentBookings);
        if (homeBanner) setBanner(homeBanner);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          showError('추천 선생님을 불러오지 못했습니다');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = async (teacherId: string) => {
    if (!user) {
      showWarning('로그인 후 찜할 수 있습니다');
      return;
    }
    const isFavorite = favorites.has(teacherId);
    setFavorites((current) => {
      const next = new Set(current);
      if (isFavorite) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });

    try {
      if (isFavorite) await removeWishlist(user.id, teacherId);
      else await addWishlist(user.id, teacherId);
    } catch {
      showError('찜하기 처리에 실패했습니다');
      setFavorites((current) => {
        const next = new Set(current);
        if (isFavorite) next.add(teacherId);
        else next.delete(teacherId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-body-md text-on-background">
      <main className="mx-auto max-w-[1200px]">
        <section className="hero-gradient relative overflow-hidden rounded-b-[2rem] px-container-margin pb-12 pt-stack-lg">
          <div className="relative z-10">
            <div className="mb-stack-md flex justify-end">
              <Link href="/login?role=teacher&next=%2Fteacher%2Fhome" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary">
                선생님이신가요? <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile leading-tight text-on-background">
                {user ? <>안녕하세요, <span className="font-bold text-primary">{user.name}</span>님!<br />오늘도 즐겁게 한국어 공부해요!</> : <>나에게 맞는 <span className="font-bold text-primary">한국어 선생님</span>을<br />찾아보세요</>}
              </h1>
              <p className="font-body-md text-on-surface-variant opacity-80">{user ? '즐겁고 특별한 1:1 한국어 수업' : '선생님과 수업을 둘러보고, 마음에 드는 수업을 시작해보세요.'}</p>
            </div>

            <div className="mt-stack-lg">
              <TeacherSearchForm />
            </div>
          </div>

          <div className="absolute -right-8 top-4 h-40 w-40 rounded-full bg-primary-container/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-secondary-container/20 blur-3xl" />
        </section>

        <section className="relative z-20 -mt-6 px-container-margin">
          <div className="grid grid-cols-4 gap-2 sm:gap-gutter-md rounded-xl border border-white/50 bg-white p-stack-md shadow-lg">
            {QUICK_ACCESS.map((item) => (
              <Link key={item.label} href={item.href} className="group flex flex-col items-center gap-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} transition-transform group-active:scale-90`}>
                  <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
                </div>
                <span className="text-center font-label-sm text-label-sm text-on-surface">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-section-gap">
          <div className="mb-stack-md flex flex-wrap items-center justify-between gap-3 px-container-margin">
            <h3 className="flex items-center gap-2 font-headline-md text-headline-md">
              <span className="material-symbols-outlined text-[24px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              오늘의 추천 선생님
            </h3>
            {!loading && teachers.length > 0 && <Link href="/student/search" className="flex items-center font-label-lg text-label-lg text-primary hover:underline">
              더보기 <span className="material-symbols-outlined ml-1 text-sm">chevron_right</span>
            </Link>}
          </div>

          {teachers.length === 0 && (
            <p className="px-container-margin py-6 text-center font-body-md text-on-surface-variant">{loading ? '추천 선생님을 불러오는 중입니다.' : loadError ? '추천 선생님을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : '추천 선생님이 없습니다.'}</p>
          )}

          <div className="grid grid-cols-1 gap-stack-md px-container-margin sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-surface-container-high bg-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Link은 display:contents로 레이아웃에 영향을 주지 않게 하고, 찜 버튼은 형제 요소로 분리한다.
                    버튼을 Link(a 태그) 안에 중첩하면(<a><button/></a>) 잘못된 HTML이라 브라우저가
                    DOM을 임의로 정리하면서 클릭이 엉뚱한 곳(예: 프로필 아이콘)으로 튀는 문제가 있었다. */}
                <Link href={`/teachers/${teacher.id}`} className="contents">
                  <div className="relative flex h-64 items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/15">
                    <TeacherImage name={teacher.name} avatarUrl={teacher.avatarUrl} avatarIsGenerated={teacher.avatarIsGenerated} specialties={teacher.specialties} className="h-full w-full" />
                    {teacher.isVerified && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold text-white shadow-md">
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          workspace_premium
                        </span>
                        인증
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-stack-md">
                    <div className="flex items-center gap-1">
                      <span className="font-headline-md text-headline-md text-on-surface">{teacher.name}쌤</span>
                      {teacher.isVerified && (
                        <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px] text-[#FFC107]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      <span className="font-bold">{teacher.ratingAvg.toFixed(1)}</span> ({teacher.ratingCount})
                    </div>
                    {(recentBookingMap.get(teacher.id) ?? 0) > 0 && (
                      <p className="flex items-center gap-1 text-xs font-semibold text-secondary">
                        <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                        최근 30일 {recentBookingMap.get(teacher.id)}회 예약
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teacher.specialties.slice(0, 2).map((label, index) => (
                        <span
                          key={label}
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            index === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 font-bold text-body-md text-on-surface">
                      {teacher.minPrice != null ? `₩${teacher.minPrice.toLocaleString()}~` : '가격 문의'}{' '}
                      <span className="text-[12px] font-normal text-on-surface-variant">/ 50분</span>
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void toggleFavorite(teacher.id)}
                  aria-pressed={favorites.has(teacher.id)}
                  className={`absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg backdrop-blur-md transition-colors ${
                    favorites.has(teacher.id) ? 'bg-white text-secondary' : 'bg-white/20 text-white'
                  }`}
                  aria-label={`${teacher.name} 찜하기`}
                >
                  <span className="material-symbols-outlined" style={favorites.has(teacher.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    favorite
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {banner.is_active && (
          <section className="mt-stack-lg px-container-margin">
            <div className="primary-gradient group grid grid-cols-1 overflow-hidden rounded-xl shadow-xl sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="flex min-w-0 flex-col justify-center gap-1 p-6 text-white">
                {banner.tag && <span className="inline-block w-fit rounded bg-white/20 px-2 py-0.5 text-xs font-bold opacity-70">{banner.tag}</span>}
                <h4 className="whitespace-pre-line font-headline-lg-mobile text-[18px] leading-snug">{banner.title}</h4>
                <Link href={banner.cta_href} className="mt-2 flex items-center gap-1 font-label-lg text-label-lg opacity-90 transition-opacity group-hover:opacity-100">
                  {banner.cta_label} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="relative min-h-40 overflow-hidden sm:min-h-full">
                <LearningImage scene={banner.image_scene} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>
          </section>
        )}

        <section className="mt-section-gap px-container-margin pb-stack-lg">
          <div className="mb-stack-md flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-headline-md text-headline-md">
              <span className="material-symbols-outlined text-[24px] text-primary">auto_awesome</span>
              수업 카테고리
            </h3>
            <Link href="/student/search" className="flex items-center font-label-lg text-label-lg text-primary hover:underline">
              전체보기 <span className="material-symbols-outlined ml-1 text-sm">chevron_right</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-gutter-md sm:grid-cols-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.label}
                href="/student/search"
                className="group flex flex-col items-center gap-3 rounded-xl border border-surface-container bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${category.bg} ${category.hover} transition-colors`}>
                  <span className={`material-symbols-outlined text-3xl ${category.color}`}>{category.icon}</span>
                </div>
                <span className="text-center font-label-lg text-on-surface">{category.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
