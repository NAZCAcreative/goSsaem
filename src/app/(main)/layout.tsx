'use client';

import { useAuthStore } from '@/stores/auth-store';
import { PageLoading } from '@/components/shared/PageLoading';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const pathname = usePathname();
  const isPublicPage = pathname === '/student' || pathname === '/teacher' || pathname.startsWith('/teachers/') || pathname === '/student/search';
  return isPublicPage || isHydrated ? children : <PageLoading />;
}
