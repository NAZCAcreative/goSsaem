'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getBalanceSummary, type BalanceSummary } from '@/lib/queries/settlement';

const money = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('ko-KR')}원` : '—';

export function TeacherEarningsSummary() {
  const teacherId = useAuthStore(state => state.user?.id);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBalance(null); setError(false); setLoading(true);
    if (!teacherId) { setLoading(false); return; }
    getBalanceSummary(teacherId).then(result => {
      if (!cancelled) { if (!result) setError(true); else setBalance(result); }
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teacherId, revision]);
  return <section aria-label="수익·정산 요약" className="mb-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold"><Wallet size={20} className="text-violet-600" />나의 수익·정산</h2><Link href="/teacher/settlement" className="inline-flex min-h-11 items-center text-xs font-semibold text-violet-600">정산 내역·출금 관리 →</Link></div>
    <dl className="mt-3 grid gap-3 sm:grid-cols-3">{[
      { label: '이번 달 정산 적립', value: balance?.thisMonthSettled, description: '이번 달 정산분 · 수수료 차감 후' },
      { label: '출금 가능 금액', value: balance?.availableBalance, description: '출금 신청·처리·완료 금액 제외' },
      { label: '누적 정산 적립', value: balance?.totalSettled, description: '지금까지 적립된 수수료 차감 후 금액' },
    ].map((item, index) => <div key={item.label} className={`min-w-0 rounded-xl p-4 ${index === 1 ? 'bg-violet-50' : 'bg-slate-50/70'}`}><dt className="text-xs text-slate-500">{item.label}</dt><dd className={`mt-2 break-words text-2xl font-bold tabular-nums ${index === 1 ? 'text-violet-700' : 'text-slate-800'}`}>{loading ? <span className="text-sm font-normal text-slate-400">불러오는 중…</span> : money(item.value)}</dd><p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p></div>)}</dl>
    {error ? <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-error"><p>금액을 불러오지 못했습니다.</p><button onClick={() => setRevision(value => value + 1)} className="min-h-11 font-semibold underline">금액 다시 불러오기</button></div> : <p className="mt-3 text-xs leading-relaxed text-slate-500">검증된 원화 결제와 완료된 수업의 정산 기준입니다. 적립 금액은 실제 송금 완료 금액과 다릅니다.</p>}
  </section>;
}
