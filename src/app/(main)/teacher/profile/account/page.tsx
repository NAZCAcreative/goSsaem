'use client';

import { showError, showWarning } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { getSettlementAccount, saveSettlementAccount, type SettlementAccount } from '@/lib/queries/settlement';
import { useAuthStore } from '@/stores/auth-store';

const BANKS = ['은행을 선택해주세요', '국민은행 (KB)', '신한은행', '우리은행', '하나은행', '카카오뱅크', '토스뱅크'];

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

export default function TeacherAccountPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [savedAccount, setSavedAccount] = useState<SettlementAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState(BANKS[0]);
  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getSettlementAccount(user.id)
      .then((account) => {
        if (cancelled) return;
        setSavedAccount(account);
        if (account) {
          setBank(account.bankName);
          setHolder(account.accountHolder);
          setAccountNumber(account.accountNumber);
        }
      })
      .catch(() => {
        if (!cancelled) showError('계좌 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const handleUpdate = async () => {
    if (!user) {
      showWarning('로그인이 필요합니다');
      return;
    }
    if (bank === BANKS[0] || !holder.trim() || !accountNumber.trim()) {
      showWarning('은행, 예금주, 계좌번호를 모두 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const account: SettlementAccount = { bankName: bank, accountHolder: holder.trim(), accountNumber: accountNumber.trim() };
      await saveSettlementAccount(user.id, account);
      setSavedAccount(account);
      showToast('계좌 정보가 저장되었습니다');
    } catch {
      showError('계좌 정보 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-surface px-container-margin pb-28 pt-stack-lg font-body-md text-on-surface">
      <section className="mb-section-gap flex items-center gap-3">
        <Link href="/teacher/profile" className="flex h-10 w-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-surface-container-high" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">정산 계좌 설정</h1>
          <p className="text-sm text-on-surface-variant">수익 정산을 받을 계좌 정보를 관리하세요.</p>
        </div>
      </section>

      <div className="grid gap-section-gap lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-start">
        <div className="space-y-section-gap">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-headline-md text-headline-md font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
              현재 등록된 계좌
            </h2>
            {loading ? (
              <div className="rounded-xl bg-surface-container-high/50 p-6 text-center font-body-md text-on-surface-variant">불러오는 중...</div>
            ) : savedAccount ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-container to-primary p-6 text-on-primary-container shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium opacity-80">{savedAccount.bankName}</p>
                    <p className="break-all font-headline-md text-xl font-bold tracking-widest">{maskAccountNumber(savedAccount.accountNumber)}</p>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-3xl opacity-80">verified_user</span>
                </div>
                <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs opacity-70">예금주</p>
                    <p className="text-lg font-semibold">{savedAccount.accountHolder}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">기본 계좌</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center font-body-md text-on-surface-variant">
                등록된 계좌가 없습니다. 오른쪽에서 계좌를 등록해주세요.
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl bg-surface-container-high/50 p-5">
            <h3 className="flex items-center gap-2 font-headline-md text-sm font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-base">info</span>
              정산 안내 및 유의사항
            </h3>
            <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-on-surface-variant opacity-80">
              <li>정산은 매주 월요일에 진행되며, 전주 결제 완료 건을 기준으로 계산됩니다.</li>
              <li>본인 명의의 계좌만 등록 가능하며, 타인 명의 사용 시 정산이 거절될 수 있습니다.</li>
              <li>계좌 정보 변경 시 다음 정산 주기부터 적용됩니다.</li>
              <li>오입력된 계좌 정보로 인한 송금 오류는 GoSsaem에서 책임지지 않습니다.</li>
            </ul>
          </section>
        </div>

        <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-stack-lg flex items-center gap-2 font-headline-md text-headline-md font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-secondary">edit_note</span>
            계좌 정보 변경 및 등록
          </h2>
          <div className="space-y-4">
            <Field label="은행 선택">
              <div className="group relative">
                <select
                  className="h-14 w-full appearance-none rounded-xl border-none bg-surface-container-low px-4 pr-12 font-body-md text-on-surface transition-all focus:ring-2 focus:ring-primary/20"
                  value={bank}
                  onChange={(event) => setBank(event.target.value)}
                >
                  {BANKS.map((bankName) => (
                    <option key={bankName}>{bankName}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-hover:text-primary">expand_more</span>
              </div>
            </Field>
            <Field label="예금주">
              <input
                className="h-14 w-full rounded-xl border-none bg-surface-container-low px-4 font-body-md transition-all focus:ring-2 focus:ring-primary/20"
                placeholder="실명을 입력하세요"
                type="text"
                value={holder}
                onChange={(event) => setHolder(event.target.value)}
              />
            </Field>
            <Field label="계좌번호">
              <input
                className="h-14 w-full rounded-xl border-none bg-surface-container-low px-4 font-body-md transition-all focus:ring-2 focus:ring-primary/20"
                placeholder="'-' 제외 숫자만 입력"
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/[^0-9]/g, ''))}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={saving}
            className="mt-stack-lg flex w-full items-center justify-center gap-2 rounded-xl primary-gradient-btn py-4 font-headline-md text-lg font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? '저장 중...' : '계좌 정보 업데이트'}
            <span className="material-symbols-outlined">sync</span>
          </button>
        </section>
      </div>
    </main>
    </PageContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="px-1 font-label-lg text-label-lg font-semibold text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
