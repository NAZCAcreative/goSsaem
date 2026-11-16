'use client';

import { useLayoutEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { requestedAccountRole } from '@/lib/account-role';

export function AudienceTheme() {
  const pathname = usePathname();
  const params = useSearchParams();
  const role = useAuthStore(state => state.user?.role);
  const audience = pathname.startsWith('/admin') ? 'student' : requestedAccountRole(pathname, params.get('next')) ?? (role === 'teacher' ? 'teacher' : 'student');
  useLayoutEffect(() => { document.documentElement.dataset.audience = audience; }, [audience]);
  return null;
}
