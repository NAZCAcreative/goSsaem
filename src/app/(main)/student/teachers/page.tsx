'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { TeacherImage } from '@/components/shared/LearningImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  searchTeachers,
  addWishlist,
  removeWishlist,
  listWishlistedTeacherIds,
  type TeacherCard as TeacherCardData,
  type AvailabilityPeriod,
} from '@/lib/queries/teachers';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';
import { TeacherSearchForm } from '@/components/shared/TeacherSearchForm';
import { DiscoverySwitcher } from '@/components/shared/DiscoveryGateway';
import experience from '@/components/shared/StudentExperience.module.css';

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
    <article className="group relative overflow-hidden rounded-2xl border border-[#e8dfef] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#c8b1df] hover:shadow-lg">
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
          <span className="text-xs font-normal text-on-surface-variant">{teacher.minPrice != null?'부터 · 1인·1회':''}</span>
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
  const [recentBookingMap, setRecentBookingMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('recommended');
  const [priceBucket, setPriceBucket] = useState<(typeof PRICE_BUCKETS)[number]['value']>('all');
  const [selectedPeriods, setSelectedPeriods] = useState<Set<AvailabilityPeriod>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [popularityAvailable, setPopularityAvailable] = useState(true);

  const query = (searchParams.get('q') ?? '').trim();

  const filterKey = JSON.stringify([query, activeFilter, priceBucket, [...selectedPeriods].sort(), sortBy]);
  const [loadedKey, setLoadedKey] = useState('');
  const effectivePage = filterKey === loadedKey ? page : 1;
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    const timer = setTimeout(() => {
      searchTeachers({ query, specialty: activeFilter, price: priceBucket, periods: [...selectedPeriods], sort: sortBy, page: effectivePage, size: PAGE_SIZE }).then(result => {
        if (cancelled) return;
        setTeachers(result.items); setTotal(result.total);
        setPopularityAvailable(result.popularityAvailable !== false);
        setRecentBookingMap(new Map(result.items.map(item => [item.id, item.recentBookings])));
        setLoadedKey(filterKey); setPage(effectivePage);
      }).catch(() => { if (!cancelled) { setLoadError(true); setTeachers([]); setTotal(0); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  // filterKey contains all search inputs; stale responses are ignored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, effectivePage, retry]);

  useEffect(() => {
    let cancelled = false;
    setFavorites(new Set());
    if (user) void listWishlistedTeacherIds(user.id).then(ids => {
      if (!cancelled) setFavorites(ids);
    }).catch(() => { if (!cancelled) showToast('찜 목록을 불러오지 못했습니다.'); });
    return () => { cancelled = true; };
  }, [user]);
  const visibleTeachers = loading ? [] : teachers;

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
    <div className={`${experience.experience} teacher-recommend-page min-h-screen bg-background pb-32 font-body-md text-on-background`}>
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
        <DiscoverySwitcher active="teachers" query={query}/>
        <section className="mb-section-gap pt-4">
          <div className="mb-6 space-y-4 rounded-3xl border border-[#e8deef] bg-gradient-to-br from-[#f3edf9] to-[#fff8f1] p-6 sm:p-8">
            <p className="text-[10px] font-bold tracking-[.15em] text-[#86679b]">MEET YOUR NEXT CONNECTION</p>
            <h2 className="text-2xl font-bold leading-snug tracking-tight text-[#4a355a] sm:text-3xl">좋은 대화는,<br/>잘 맞는 선생님부터.</h2>
            <TeacherSearchForm query={query} destination="/student/teachers" />
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
                  {SORT_OPTIONS.filter(option => option.value !== 'popular' || popularityAvailable).map((option) => {
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

        <section className={experience.teacherResults} aria-label="선생님 검색 결과">
          <p role="status" className="font-label-sm text-label-sm text-on-surface-variant">{loading ? '' : `${query ? `“${query}” 검색 결과` : '전체 선생님'} · ${total}명`}</p>
          {loading && <p className="py-16 text-center font-body-md text-on-surface-variant">선생님을 찾고 있어요...</p>}
          {loadError && <div role="alert" className="rounded-xl bg-error-container/20 p-4 text-error">검색을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.<button onClick={() => setRetry(value => value + 1)} className="ml-3 min-h-11 font-semibold">다시 시도</button></div>}
          {!loading && !loadError && visibleTeachers.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-body-md text-on-surface-variant">조건에 맞는 선생님이 없어요. 검색어를 바꾸거나 필터를 해제해 보세요.</p>
              <button
                type="button"
                onClick={() => {
                  router.push('/student/teachers');
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
          {visibleTeachers.map((teacher) => (
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
                전체 {total}명 · {page}페이지
              </p>
              {(page > 1 || page * PAGE_SIZE < total) && (
                <button
                  type="button"
                  onClick={() => setPage((count) => count * PAGE_SIZE < total ? count + 1 : 1)}
                  className="flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-6 py-3 font-label-lg font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {page * PAGE_SIZE < total ? '다음 페이지' : '처음으로'}
                  <span className="text-sm font-normal">{page * PAGE_SIZE < total ? `${Math.min(PAGE_SIZE, total - page * PAGE_SIZE)}명` : '1페이지'}</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">expand_more</span>
                </button>
              )}
            </div>
          )}

          <Link href="/guide" className="block rounded-xl bg-primary/5 p-6 text-primary">처음이신가요? 예약과 수업 이용 방법 확인하기 →</Link>
        </section>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchContent />
    </Suspense>
  );
}
