'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { TeacherImage } from '@/components/shared/LearningImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  listTeachers,
  addWishlist,
  removeWishlist,
  listWishlistedTeacherIds,
  listTeacherAvailabilityPeriods,
  listRecentBookingCounts,
  type TeacherCard as TeacherCardData,
  type AvailabilityPeriod,
} from '@/lib/queries/teachers';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';
import { TeacherSearchForm } from '@/components/shared/TeacherSearchForm';

const PAGE_SIZE = 8;
const FILTERS = ['TOPIK 전문', '비즈니스', 'K-POP 한국어', '여행 회화', '회화'];

const SORT_OPTIONS: { value: 'recommended' | 'rating' | 'price' | 'popular'; label: string }[] = [
  { value: 'recommended', label: '추천순' },
  { value: 'rating', label: '평점순' },
  { value: 'price', label: '가격 낮은순' },
  { value: 'popular', label: '인기순' },
];

const PRICE_BUCKETS: { value: 'all' | 'low' | 'mid' | 'high'; label: string }[] = [
  { value: 'all', label: '전체 가격' },
  { value: 'low', label: '2만원 이하' },
  { value: 'mid', label: '2~4만원' },
  { value: 'high', label: '4만원 이상' },
];

const PERIOD_OPTIONS: { value: AvailabilityPeriod; label: string }[] = [
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
];

function matchesPriceBucket(minPrice: number | null, bucket: (typeof PRICE_BUCKETS)[number]['value']) {
  if (bucket === 'all') return true;
  const price = minPrice ?? 0;
  if (bucket === 'low') return price <= 20000;
  if (bucket === 'mid') return price > 20000 && price <= 40000;
  return price > 40000;
}


function TeacherCard({
  teacher,
  favorite,
  onToggleFavorite,
  recentBookings,
}: {
  teacher: TeacherCardData;
  favorite: boolean;
  onToggleFavorite: () => void;
  recentBookings: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <Link href={`/teachers/${teacher.id}`} aria-label={`${teacher.name} 선생님 상세 소개 보기`} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-offset-[-3px]" />
      <div className="flex gap-4">
        <div className="relative flex-shrink-0">
          <TeacherImage name={teacher.name} avatarUrl={teacher.avatarUrl} avatarIsGenerated={teacher.avatarIsGenerated} specialties={teacher.specialties} className="h-36 w-28 rounded-lg sm:h-48 sm:w-40" />
          {teacher.isVerified && (
            <div className="absolute -left-2 -top-2 flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-on-secondary shadow-sm">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                workspace_premium
              </span>
              인증
            </div>
          )}
        </div>

        <div className="min-w-0 flex-grow">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="flex flex-wrap items-center gap-1 font-headline-md text-headline-md text-on-surface">
                {teacher.name}쌤
                {teacher.isVerified && (
                  <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                )}
              </h3>
              <div className="mb-2 flex flex-wrap items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-[#FFD700]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="font-label-lg text-label-lg">{teacher.ratingAvg.toFixed(1)}</span>
                <span className="font-body-md text-body-md opacity-70">({teacher.ratingCount} reviews)</span>
              </div>
              {recentBookings > 0 && (
                <p className="mb-2 flex items-center gap-1 font-label-sm text-label-sm font-semibold text-secondary">
                  <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                  최근 30일 {recentBookings}회 예약
                </p>
              )}
            </div>
            <button
              type="button"
              className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-secondary/5 hover:text-secondary active:scale-[0.98]"
              aria-label={`${teacher.name} 찜하기`}
              onClick={onToggleFavorite}
            >
              <span className="material-symbols-outlined" style={favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                favorite
              </span>
            </button>
          </div>

          {teacher.headline && <p className="mb-2 font-body-md text-body-md text-on-surface-variant">{teacher.headline}</p>}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {teacher.specialties.map((label, index) => (
              <span
                key={label}
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  index === 0 ? 'bg-primary/10 text-primary' : index === 1 ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-surface-container pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-headline-md text-headline-md font-bold text-primary">
          {teacher.minPrice != null ? `₩${teacher.minPrice.toLocaleString()}` : '가격 문의'}
          <span className="text-sm font-normal text-on-surface-variant"> / 50분</span>
        </p>
        <div className="relative z-20 flex gap-2">
          <Link
            href={`/teachers/${teacher.id}`}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-primary px-5 py-2 text-center font-label-lg text-primary transition-colors hover:bg-primary/5 active:scale-[0.98] sm:flex-none"
          >
            프로필 보기
          </Link>
          <Link
            href={`/student/booking/confirm?teacher=${teacher.id}`}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2 text-center font-label-lg text-white shadow-md transition-transform active:scale-[0.98] sm:flex-none"
          >
            예약하기
          </Link>
        </div>
      </div>
    </article>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherCardData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, Set<AvailabilityPeriod>>>(new Map());
  const [recentBookingMap, setRecentBookingMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('recommended');
  const [priceBucket, setPriceBucket] = useState<(typeof PRICE_BUCKETS)[number]['value']>('all');
  const [selectedPeriods, setSelectedPeriods] = useState<Set<AvailabilityPeriod>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const query = (searchParams.get('q') ?? '').trim();

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeFilter, priceBucket, selectedPeriods, sortBy]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [teacherList, wishlisted, availability, recentBookings] = await Promise.all([
          listTeachers(),
          user ? listWishlistedTeacherIds(user.id) : Promise.resolve(new Set<string>()),
          listTeacherAvailabilityPeriods(),
          listRecentBookingCounts(),
        ]);
        if (cancelled) return;
        setTeachers(teacherList);
        setFavorites(wishlisted);
        setAvailabilityMap(availability);
        setRecentBookingMap(recentBookings);
      } catch {
        if (!cancelled) showToast('선생님 목록을 불러오지 못했습니다');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleTeachers = useMemo(() => {
    let result = teachers;
    const terms = query.normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      result = result.filter((teacher) => {
        const searchable = [teacher.name, teacher.headline ?? '', ...teacher.specialties,
          ...(Array.isArray(teacher.lessonTitles) ? teacher.lessonTitles : [])]
          .join(' ').normalize('NFKC').toLocaleLowerCase();
        return terms.every((term) => searchable.includes(term));
      });
    }
    if (activeFilter) result = result.filter((teacher) => teacher.specialties.includes(activeFilter));
    if (priceBucket !== 'all') result = result.filter((teacher) => matchesPriceBucket(teacher.minPrice, priceBucket));
    if (selectedPeriods.size > 0) {
      result = result.filter((teacher) => {
        const periods = availabilityMap.get(teacher.id);
        if (!periods) return false;
        return Array.from(selectedPeriods).some((period) => periods.has(period));
      });
    }

    const sorted = [...result];
    if (sortBy === 'rating') sorted.sort((a, b) => b.ratingAvg - a.ratingAvg);
    else if (sortBy === 'price') sorted.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    else if (sortBy === 'popular') sorted.sort((a, b) => b.ratingCount - a.ratingCount);
    return sorted;
  }, [teachers, query, activeFilter, priceBucket, selectedPeriods, availabilityMap, sortBy]);

  const activeFilterCount = (priceBucket !== 'all' ? 1 : 0) + selectedPeriods.size + (sortBy !== 'recommended' ? 1 : 0);

  const togglePeriod = (period: AvailabilityPeriod) => {
    setSelectedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  };

  const toggleFavorite = async (teacherId: string) => {
    if (!user) {
      showToast('로그인 후 찜할 수 있습니다');
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
      showToast('찜하기 처리에 실패했습니다');
      setFavorites((current) => {
        const next = new Set(current);
        if (isFavorite) next.add(teacherId);
        else next.delete(teacherId);
        return next;
      });
    }
  };

  return (
    <PageContent loading={loading}>
    <div className="teacher-recommend-page min-h-screen bg-background pb-32 font-body-md text-on-background">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-container-margin pt-stack-md">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-surface-container"
          aria-label="뒤로가기"
          onClick={() => router.back()}
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">선생님 검색</h1>
      </div>

      <main className="mx-auto w-full max-w-7xl px-container-margin pb-6">
        <section className="mb-section-gap pt-4">
          <div className="mb-4 space-y-3">
            <TeacherSearchForm query={query} />
            <p className="text-body-md text-on-surface-variant">선생님 이름, 소개, 전문 분야와 공개된 수업명으로 검색해 보세요.</p>
          </div>

          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={`flex items-center gap-1 min-h-11 shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-label-lg transition-colors ${
                activeFilter === null ? 'bg-primary text-on-primary shadow-md' : 'border border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              전체
            </button>
            {FILTERS.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 font-label-lg transition-colors ${
                    active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
                  }`}
                  onClick={() => setActiveFilter(active ? null : filter)}
                >
                  {filter}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-pressed={filtersOpen}
              className={`flex shrink-0 items-center gap-1 min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 font-label-lg transition-colors ${
                filtersOpen || activeFilterCount > 0 ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              필터·정렬
              {activeFilterCount > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs font-bold">{activeFilterCount}</span>}
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <div>
                <p className="mb-2 font-label-sm text-label-sm font-semibold text-on-surface-variant">정렬</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((option) => {
                    const active = sortBy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortBy(option.value)}
                        className={`min-h-11 rounded-lg border px-3 py-1.5 font-label-sm text-label-sm transition-colors ${
                          active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 font-label-sm text-label-sm font-semibold text-on-surface-variant">가격 (50분 기준)</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_BUCKETS.map((option) => {
                    const active = priceBucket === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPriceBucket(option.value)}
                        className={`min-h-11 rounded-lg border px-3 py-1.5 font-label-sm text-label-sm transition-colors ${
                          active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 font-label-sm text-label-sm font-semibold text-on-surface-variant">가능한 시간대</p>
                <div className="flex flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((option) => {
                    const active = selectedPeriods.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => togglePeriod(option.value)}
                        className={`min-h-11 rounded-lg border px-3 py-1.5 font-label-sm text-label-sm transition-colors ${
                          active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('recommended');
                    setPriceBucket('all');
                    setSelectedPeriods(new Set());
                  }}
                  className="font-label-sm text-label-sm text-primary hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </section>

        <section className="space-y-gutter-md">
          <p role="status" className="font-label-sm text-label-sm text-on-surface-variant">{loading ? '' : `${query ? `“${query}” 검색 결과` : '전체 선생님'} · ${visibleTeachers.length}명`}</p>
          {loading && <p className="py-16 text-center font-body-md text-on-surface-variant">선생님을 찾고 있어요...</p>}
          {!loading && visibleTeachers.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-body-md text-on-surface-variant">조건에 맞는 선생님이 없어요. 검색어를 바꾸거나 필터를 해제해 보세요.</p>
              <button
                type="button"
                onClick={() => {
                  router.push('/student/search');
                  setActiveFilter(null);
                  setSortBy('recommended');
                  setPriceBucket('all');
                  setSelectedPeriods(new Set());
                }}
                className="rounded-lg bg-primary px-5 py-2.5 font-label-lg text-label-lg text-on-primary shadow-md transition-opacity hover:opacity-90"
              >
                필터 초기화하고 전체 선생님 보기
              </button>
            </div>
          )}
          {visibleTeachers.slice(0, visibleCount).map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              favorite={favorites.has(teacher.id)}
              onToggleFavorite={() => toggleFavorite(teacher.id)}
              recentBookings={recentBookingMap.get(teacher.id) ?? 0}
            />
          ))}

          {!loading && visibleTeachers.length > 0 && (
            <div className="flex flex-col items-center gap-3 py-5">
              <p role="status" className="text-sm text-on-surface-variant">
                전체 {visibleTeachers.length}명 중 {Math.min(visibleCount, visibleTeachers.length)}명 표시
              </p>
              {visibleCount < visibleTeachers.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-6 py-3 font-label-lg font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  선생님 더보기
                  <span className="text-sm font-normal">+{Math.min(PAGE_SIZE, visibleTeachers.length - visibleCount)}명</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">expand_more</span>
                </button>
              )}
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
            <div className="relative z-10">
              <p className="mb-1 font-label-lg uppercase tracking-wider text-white/80">SPECIAL OFFER</p>
              <h4 className="mb-2 font-headline-lg text-headline-lg font-bold">첫 수업 50% 할인!</h4>
              <p className="max-w-[70%] font-body-md text-body-md opacity-90">지금 바로 마음에 드는 선생님과 첫 레슨을 예약하고 할인을 받으세요.</p>
            </div>
            <div className="absolute right-0 top-0 h-full w-32 translate-x-4 opacity-20">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                celebration
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
    </PageContent>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchContent />
    </Suspense>
  );
}
