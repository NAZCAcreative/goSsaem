'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { accountRoleNotice, requestedAccountRole, type AccountRole } from '@/lib/account-role';

export function AccountRoleGuard() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requested = requestedAccountRole(pathname, params.get('next'));
  const actual = user?.role === 'student' || user?.role === 'teacher' ? user.role : null;
  const mismatch = Boolean(actual && requested && actual !== requested);
  const noticeKey = `${user?.id}:${pathname}:${requested}`;
  const open = mismatch && noticeKey !== dismissed;
  const notice = accountRoleNotice(actual ?? 'student');

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const handleAnotherAccount = async () => {
    setBusy(true); setError('');
    try {
      await logout();
      router.replace(`/login?next=${encodeURIComponent(`/${requested ?? 'teacher'}/home`)}`);
    } catch {
      setError('로그아웃하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setBusy(false); }
  };

  return (
    <dialog ref={dialog} aria-labelledby="account-role-title" aria-describedby="account-role-description" className="account-role-dialog" onCancel={event => { event.preventDefault(); setDismissed(noticeKey); }}>
      <div className="p-7 sm:p-8">
        <span className="material-symbols-outlined mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary" aria-hidden="true">account_circle</span>
        <h2 id="account-role-title" className="break-keep text-xl font-bold leading-snug text-on-surface">{notice.title}</h2>
        <p id="account-role-description" className="mt-3 text-sm leading-relaxed text-on-surface-variant">{notice.description}</p>
        {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
        <div className="mt-7 grid gap-3">
          <button type="button" autoFocus disabled={busy} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-on-primary disabled:opacity-50" onClick={() => { setDismissed(noticeKey); router.replace(`/${actual as AccountRole}/home`); }}>{notice.action}</button>
          <button type="button" disabled={busy} className="min-h-12 rounded-xl border border-outline-variant px-5 font-semibold text-on-surface disabled:opacity-50" onClick={() => void handleAnotherAccount()}>{busy ? '처리 중...' : '다른 계정으로 로그인'}</button>
          <button type="button" disabled={busy} className="min-h-11 text-sm text-on-surface-variant" onClick={() => setDismissed(noticeKey)}>닫기</button>
        </div>
      </div>
    </dialog>
  );
}
