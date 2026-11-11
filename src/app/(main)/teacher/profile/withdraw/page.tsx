'use client';

import { useAlertState, showConfirm } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListPager } from '@/components/shared/ListPager';
import { showToast } from '@/components/shared/Toast';
import { useAuthStore } from '@/stores/auth-store';
import { getBalanceSummary, getSettlementAccount, listSettlements, listWithdrawals, requestWithdrawal, type BalanceSummary, type SettlementRow, type WithdrawalRow } from '@/lib/queries/settlement';

const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const withdrawalLabels = { requested: '신청 접수', processing: '처리 중', completed: '송금 완료', rejected: '반려' };

export default function WithdrawPage() {
  const user = useAuthStore(s => s.user);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [page, setPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useAlertState<string>('');
  const [refresh, setRefresh] = useState(0);
  const request = useRef<{ amount: number; id: string }>();
  const submitting = useRef(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    Promise.all([getBalanceSummary(user.id), listSettlements(user.id, page), listWithdrawals(user.id, withdrawalPage), getSettlementAccount(user.id)]).then(([summary, rows, requests, account]) => {
      if (cancelled) return;
      setBalance(summary); setSettlements(rows); setWithdrawals(requests); setHasAccount(!!account);
    }).catch(() => { if (!cancelled) setError('수익 정보를 불러오지 못했습니다. 다시 시도해주세요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, page, withdrawalPage, refresh, setError]);

  const withdraw = async () => {
    if (!user || !balance || !hasAccount || balance.availableBalance <= 0 || submitting.current) return;
    const amount = balance.availableBalance;
    if (!(await showConfirm(`${money(amount)}을 등록 계좌로 출금 신청하시겠습니까?`))) return;
    submitting.current = true; setSaving(true); setError('');
    if (request.current?.amount !== amount) request.current = { amount, id: crypto.randomUUID() };
    try {
      await requestWithdrawal(user.id, amount, request.current.id);
      request.current = undefined; setWithdrawalPage(1); setRefresh(value => value + 1);
      showToast('출금 신청이 접수되었습니다. 실제 송금 완료 후 상태가 변경됩니다.');
    } catch { setError('출금 신청을 확인하지 못했습니다. 잔액과 연결 상태를 확인하고 다시 시도해주세요.'); }
    finally { submitting.current = false; setSaving(false); }
  };

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-background px-container-margin pt-stack-lg pb-32 font-body-md text-on-surface">
    <Link href="/teacher/profile" className="inline-flex min-h-11 items-center text-sm text-on-surface-variant">← 마이로 돌아가기</Link>
    <div className="flex items-center justify-between"><h1 className="font-headline-lg text-headline-lg text-on-surface">수익·출금 관리</h1><button className="min-h-11 rounded-xl border px-4 text-sm" disabled={loading || saving} onClick={() => setRefresh(value => value + 1)}>새로고침</button></div>
    <p className="rounded-xl bg-primary/5 p-4 text-sm leading-relaxed">검증된 원화 결제와 완료된 수업의 정산 적립액을 기준으로 표시합니다. 적립과 실제 송금은 별개이며, 과거 미검증 결제 기록은 출금 가능 잔액에 포함하지 않습니다.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading && <p role="status">최신 내역을 불러오는 중...</p>}
    {balance && <>
      <div className="grid gap-4 sm:grid-cols-3">{[['이번 달 정산 적립', balance.thisMonthSettled || 0], ['전체 수익', balance.totalGross || 0], ['전체 수수료', balance.totalFee || 0]].map(([label, value]) => <section key={String(label)} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm p-5"><p className="text-sm text-on-surface-variant">{label}</p><p className="mt-2 text-xl font-bold">{money(Number(value))}</p></section>)}</div>
      <section className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm p-6"><p className="text-sm text-on-surface-variant">출금 가능 금액</p><p className="text-3xl font-extrabold text-primary">{money(balance.availableBalance)}</p><p className="text-sm text-on-surface-variant">출금 요청·처리·완료 합계 {money(balance.totalWithdrawn)}</p>{!hasAccount && <Link href="/teacher/profile/account" className="block text-sm text-primary">출금을 위한 계좌 등록하기 →</Link>}<button disabled={loading || saving || !hasAccount || balance.availableBalance <= 0} onClick={() => void withdraw()} className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-40">{saving ? '신청 중...' : '출금 신청'}</button></section>
    </>}
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm p-5"><h2 className="mb-4 text-lg font-bold">정산 적립 내역</h2>{!loading && !settlements.length && <p className="py-6 text-sm text-on-surface-variant">정산 적립 내역이 없습니다.</p>}<div className="divide-y">{settlements.map(row => <div key={row.id} className="flex flex-wrap justify-between gap-2 py-4 text-sm"><span>{row.periodStart} ~ {row.periodEnd}</span><span className="font-bold">{money(row.netAmount)} · {row.status === 'paid' ? '적립 완료' : '정산 대기'}</span></div>)}</div><ListPager page={page} count={settlements.length} loading={loading} onPage={setPage} /></section>
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm p-5"><h2 className="mb-4 text-lg font-bold">출금 신청 내역</h2>{!loading && !withdrawals.length && <p className="py-6 text-sm text-on-surface-variant">출금 신청 내역이 없습니다.</p>}<div className="divide-y">{withdrawals.map(row => <div key={row.id} className="flex flex-wrap justify-between gap-2 py-4 text-sm"><span>{new Date(row.requestedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span><span className="font-bold">{money(row.amount)} · {withdrawalLabels[row.status]}</span></div>)}</div><ListPager page={withdrawalPage} count={withdrawals.length} loading={loading} onPage={setWithdrawalPage} /></section>
  </main>
    </PageContent>
  );
}
