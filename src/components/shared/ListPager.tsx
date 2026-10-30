'use client';

export function ListPager({ page, count, size = 20, loading, onPage }: { page: number; count: number; size?: number; loading: boolean; onPage: (page: number) => void }) {
  if (page <= 1 && (loading || count < size)) return null;

  return <nav aria-label="목록 페이지" className="my-5 flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-white p-3 text-sm"><button type="button" className="min-h-11 rounded-lg px-4 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>이전</button><span>{page}페이지 · {size}개씩</span><button type="button" className="min-h-11 rounded-lg px-4 disabled:opacity-40" disabled={loading || count < size} onClick={() => onPage(page + 1)}>다음</button></nav>;
}
