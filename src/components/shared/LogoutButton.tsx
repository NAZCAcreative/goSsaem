'use client';

import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { showError } from './AlertDialog';

export function LogoutButton() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const signOut = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    const destination = user.role === 'teacher' ? '/teacher' : '/student';
    try {
      await logout();
      // Discard cached authenticated routes after the session has been cleared.
      window.location.replace(destination);
    } catch {
      showError('로그아웃하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return <button type="button" disabled={busy} onClick={() => void signOut()} className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 sm:px-3">{busy ? '로그아웃 중…' : '로그아웃'}</button>;
}
