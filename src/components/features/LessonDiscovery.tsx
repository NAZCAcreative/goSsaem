'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LessonRecommendations } from './LessonRecommendations';
import { LessonCard } from './LessonCard';
export {LessonCard,LessonCover} from './LessonCard';
import { BookOpen, Search } from 'lucide-react';
import { getLessonCatalog, readCatalogFilters, type CatalogResult } from '@/lib/queries/lessonCatalog';

export function StudentCourseHome() {
  const [result,setResult]=useState<CatalogResult|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');getLessonCatalog(readCatalogFilters(new URLSearchParams())).then(data=>{if(!cancelled)setResult(data);}).catch(cause=>{if(!cancelled)setError(cause.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[revision]);
  return <main className="mx-auto max-w-7xl space-y-8 px-container-margin py-8 pb-28 text-on-surface"><section className="rounded-3xl bg-gradient-to-br from-primary/10 via-orange-50 to-secondary/10 p-6 sm:p-10"><p className="text-sm font-semibold text-primary">나의 관심사가 배움이 되는 곳</p><h1 className="mt-3 text-3xl font-bold leading-snug sm:text-4xl">오늘은 어떤 한국어를<br />배워볼까요?</h1><p className="mt-4 text-sm leading-relaxed text-on-surface-variant">좋아하는 주제로 함께 이야기하고, 새로운 표현을 배워보세요.</p><Link href="/student/search" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"><Search size={18} />수업 찾기</Link></section><nav aria-label="배우는 방법" className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['group','그룹수업','같은 관심사로 함께'],['1on1','1:1 수업','나의 목표에 맞게'],['free_trial','무료 체험','부담 없이 첫 만남'],['all','전체 수업','등록된 수업 둘러보기']].map(([type,label,description])=><Link key={type} href={`/student/search?type=${type}`} className="rounded-2xl border border-outline-variant/25 bg-white p-5"><strong className="text-sm">{label}</strong><span className="mt-2 block text-xs text-on-surface-variant">{description}</span></Link>)}</nav>
    <LessonRecommendations />
    {!!result?.categories.length && <section><h2 className="text-lg font-bold">어떤 주제에 관심 있나요?</h2><div className="mt-4 flex flex-wrap gap-2">{result.categories.map(category=><Link key={category} href={`/student/search?type=all&category=${encodeURIComponent(category)}`} className="inline-flex min-h-11 items-center rounded-full border border-primary/20 bg-white px-5 text-sm text-primary">{category}</Link>)}</div></section>}
    <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">함께 배우는 그룹수업</h2><p className="mt-2 text-xs text-on-surface-variant">예약 가능한 가까운 일정부터 보여드려요.</p></div><Link href="/student/search" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">모두 보기 →</Link></div>{error ? <div role="alert" className="rounded-xl bg-error-container/30 p-5">{error}<button onClick={()=>setRevision(x=>x+1)} className="ml-3 min-h-11 text-primary">다시 시도</button></div> : loading ? <p role="status" className="py-10 text-sm text-on-surface-variant">등록된 수업을 불러오고 있어요…</p> : result?.items.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{result.items.slice(0,6).map(lesson=><LessonCard key={lesson.id} lesson={lesson} />)}</div> : <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-white p-8 text-center"><p>새로운 그룹수업을 준비하고 있어요.</p><Link href="/student/search?type=all" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary">전체 수업 둘러보기 →</Link></div>}</section>
    <Link href="/student/bookings" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/10 p-6"><span><strong>이미 예약한 수업이 있나요?</strong><span className="mt-2 block text-sm text-on-surface-variant">내 수업에서 일정과 참여 정보를 확인하세요.</span></span><span className="text-sm font-semibold text-secondary">내 수업으로 →</span></Link>
  </main>;
}

export function LessonDiscovery({ home = false }: { home?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryString = params.toString();
  const filters = readCatalogFilters(new URLSearchParams(queryString));
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    getLessonCatalog(readCatalogFilters(new URLSearchParams(queryString))).then(data => { if (!cancelled) setResult(data); }).catch(cause => { if (!cancelled) { setError(cause.message); setResult(null); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queryString, revision]);
  const update = (changes: Record<string,string>) => {
    const next = new URLSearchParams(queryString); next.delete('page');
    Object.entries(changes).forEach(([key,value]) => value ? next.set(key,value) : next.delete(key));
    router.push(`/student/search${next.size ? `?${next}` : ''}`, { scroll: !!changes.page });
  };
  const selectClass = 'mt-2 min-h-11 w-full rounded-xl border border-outline-variant/30 bg-white px-3 text-sm text-on-surface';
  return <main className="mx-auto max-w-7xl px-container-margin py-8 pb-28 text-on-surface"><section className="rounded-3xl bg-gradient-to-br from-primary/10 via-orange-50 to-secondary/10 p-6 sm:p-9"><p className="text-xs font-bold tracking-wide text-primary">관심사로 만나는 한국어</p><h1 className="mt-3 text-2xl font-bold leading-snug sm:text-4xl">{home ? '오늘은 어떤 한국어를 배워볼까요?' : '배우고 싶은 주제로 수업을 찾아보세요'}</h1><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">음악·드라마·여행부터 일상 회화까지. 선생님이 직접 등록한 수업을 비교하고 나에게 맞는 배움을 선택하세요.</p>
      <form role="search" action="/student/search" className="mt-6 flex gap-2" onSubmit={event => { event.preventDefault(); update({ q: String(new FormData(event.currentTarget).get('q') || '').trim() }); }}><input key={filters.q} defaultValue={filters.q} name="q" maxLength={200} type="search" aria-label="수업명, 주제 또는 배우고 싶은 내용 검색" placeholder="예: 여행 회화, 노래 가사, 면접 준비" className="min-h-14 min-w-0 flex-1 rounded-xl border border-white bg-white px-4 text-sm shadow-sm" /><button aria-label="수업 검색" className="flex min-h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><Search size={22} /></button></form>
    </section>
    <nav aria-label="수업 유형" className="my-6 flex flex-wrap gap-2">{[['group','그룹수업'],['1on1','1:1 수업'],['free_trial','무료 체험'],['all','전체 수업']].map(([value,label]) => <button key={value} aria-pressed={filters.type===value} onClick={() => update({ type:value })} className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${filters.type===value ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 bg-white text-on-surface-variant'}`}>{label}</button>)}</nav>
    <section aria-label="수업 필터" className="rounded-2xl border border-outline-variant/25 bg-white p-5"><div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <label className="text-xs font-semibold">주제<select aria-label="주제" value={filters.category} onChange={e => update({ category:e.target.value })} className={selectClass}><option value="">모든 주제</option>{Array.from(new Set([...(result?.categories || []),...(filters.category ? [filters.category] : [])])).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold">레벨<select aria-label="레벨" value={filters.level} onChange={e => update({ level:e.target.value })} className={selectClass}><option value="">모든 레벨</option>{Array.from(new Set([...(result?.levels || []),...(filters.level ? [filters.level] : [])])).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold">1인·1회 가격<select aria-label="가격" value={filters.price} onChange={e => update({ price:e.target.value })} className={selectClass}>{[['all','모든 가격'],['free','무료'],['low','2만원 이하'],['mid','2만~4만원'],['high','4만원 초과']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">수업 날짜 · 한국 시간<input aria-label="수업 날짜" type="date" value={filters.day} onChange={e => update({day:e.target.value})} className={selectClass+' min-w-0'} /></label>
      <label className="col-span-2 text-xs font-semibold lg:col-span-1">정렬<select aria-label="정렬" value={filters.sort} onChange={e => update({sort:e.target.value})} className={selectClass}><option value="upcoming">가까운 일정순</option><option value="price">낮은 가격순</option><option value="recent">최근 등록순</option></select></label>
    </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-xs text-on-surface-variant"><input type="checkbox" checked={filters.scheduled} onChange={e => update({scheduled:e.target.checked ? 'true' : ''})} className="accent-primary" />예약 가능한 확정 일정이 있는 수업만</label><button onClick={() => router.push('/student/search')} className="min-h-11 text-xs font-semibold text-primary">검색 조건 초기화</button></div></section>
    <div className="my-6 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm font-semibold">{loading ? '수업을 찾고 있어요…' : error ? '검색 결과를 확인하지 못했습니다' : `${result?.total || 0}개의 수업`}</p><p className="text-xs text-on-surface-variant">일정은 한국 시간 기준 · 잔여 자리는 예약 시 다시 확인됩니다</p></div>
    {error ? <div role="alert" className="rounded-2xl bg-error-container/30 p-6"><p>{error}</p><button onClick={() => setRevision(x=>x+1)} className="mt-3 min-h-11 font-semibold text-primary">다시 시도</button></div> : loading ? <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-80 animate-pulse rounded-2xl bg-surface-container" />)}</div> : result?.items.length ? <><div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">{result.items.map(lesson=><LessonCard key={lesson.id} lesson={lesson} day={filters.day} />)}</div><div className="mt-8 flex items-center justify-center gap-5"><button disabled={filters.page<=1} onClick={()=>update({page:String(filters.page-1)})} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-30">이전</button><span className="text-sm">{filters.page} / {Math.max(1,Math.ceil(result.total/12))}</span><button disabled={filters.page*12>=result.total} onClick={()=>update({page:String(filters.page+1)})} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-30">다음</button></div></> : <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-5 py-14 text-center"><BookOpen size={36} className="mx-auto text-primary/60" /><h2 className="mt-4 text-lg font-bold">조건에 맞는 수업이 아직 없어요</h2><p className="mt-2 text-sm text-on-surface-variant">다른 주제나 날짜를 선택하거나 전체 수업을 둘러보세요.</p><button onClick={()=>router.push('/student/search?type=all')} className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary">전체 수업 보기</button></div>}
  </main>;
}
