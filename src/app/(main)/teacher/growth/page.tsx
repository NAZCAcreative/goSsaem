'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sprout, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { listPortfolio, portfolioLabels, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';

export default function TeacherGrowthPage() {
  const user = useAuthStore(s => s.user);
  const [rows, setRows] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false; setLoading(true); setError(''); setRows([]);
    listPortfolio(user.id).then(data => { if (!cancelled) setRows(data); }).catch(cause => { if (!cancelled) setError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, revision]);
  return <main className="mx-auto max-w-6xl space-y-7 px-container-margin py-8 pb-28"><div className="rounded-2xl bg-gradient-to-r from-violet-100 to-pink-50 p-6 sm:p-9"><p className="flex items-center gap-2 text-sm font-semibold text-violet-600"><Sprout size={20} />가르치는 경험을 나의 자산으로</p><h1 className="mt-3 text-3xl font-bold">나의 성장 기록</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">수업 밖에서 쌓은 경력, 새롭게 배운 것, 직접 만든 자료까지. 선생님의 다음 기회를 위해 한곳에 정리해보세요.</p><Link href="/teacher/profile/portfolio" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white">경력·작업 기록하기 <ArrowUpRight size={17} /></Link></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-error">{error}<button onClick={() => setRevision(value => value + 1)} className="ml-3 min-h-11 underline">다시 시도</button></div>}
    {loading ? <p role="status">성장 기록을 불러오는 중…</p> : !error && <><div className="grid gap-4 sm:grid-cols-3">{(['career', 'qualification', 'work'] as const).map(kind => <div key={kind} className="rounded-xl border border-violet-100 bg-white p-6"><p className="text-sm text-slate-500">{portfolioLabels[kind]}</p><p className="mt-3 text-3xl font-bold text-violet-700">{rows.filter(row => row.kind === kind).length}<span className="ml-1 text-sm font-normal">건</span></p></div>)}</div><section className="rounded-2xl border border-slate-200/70 bg-white p-6"><h2 className="text-lg font-bold">최근 남긴 기록</h2>{rows.length ? <ul className="mt-3 divide-y divide-slate-100">{rows.map(row => <li key={row.id} className="py-5"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{portfolioLabels[row.kind]}</span><span className="px-2 py-1 text-slate-500">{row.is_public ? '공개 중' : '나만 보기'}</span></div><h3 className="mt-3 break-words font-semibold">{row.title}</h3><p className="mt-1 text-sm text-slate-500">{[row.organization, row.period].filter(Boolean).join(' · ')}</p>{row.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{row.description}</p>}</li>)}</ul> : <p className="py-8 text-sm leading-relaxed text-slate-500">작은 경험도 좋은 출발점입니다. 첫 강의 경험이나 최근 수료한 교육부터 기록해보세요.</p>}<Link href="/teacher/profile/portfolio" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-600">기록 수정·공개 설정 →</Link></section></>}
    <div className="grid gap-4 sm:grid-cols-2"><Link href="/teacher/tasks" className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">다음 성장 목표 세우기 →</h2><p className="mt-2 text-sm text-slate-500">연수 신청이나 자료 제작 계획을 할 일에 남겨보세요.</p></Link><Link href="/teacher/profile" className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">내 페이지 완성하기 →</h2><p className="mt-2 text-sm text-slate-500">소개와 공개 기록을 확인하고 나의 전문성을 보여주세요.</p></Link></div>
  </main>;
}
