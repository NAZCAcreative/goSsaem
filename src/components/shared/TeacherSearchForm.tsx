'use client';

import { useRouter } from 'next/navigation';

export function TeacherSearchForm({ query = '' }: { query?: string }) {
  const router = useRouter();

  return (
    <form
      role="search"
      action="/student/search"
      method="get"
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get('q') ?? '').trim();
        const params = new URLSearchParams();
        if (value) params.set('q', value);
        router.push(`/student/search${value ? `?${params}` : ''}`);
      }}
    >
      <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
      <input
        key={query}
        name="q"
        type="search"
        defaultValue={query}
        aria-label="수업명, 주제 또는 배우고 싶은 내용 검색"
        placeholder="배우고 싶은 수업과 주제를 검색해보세요"
        enterKeyHint="search"
        className="min-h-14 w-full rounded-lg border border-outline-variant/40 bg-white py-4 pl-12 pr-16 text-base text-on-surface shadow-sm focus:border-primary"
      />
      <button type="submit" aria-label="검색" className="primary-gradient absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-white">
        <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
      </button>
    </form>
  );
}
