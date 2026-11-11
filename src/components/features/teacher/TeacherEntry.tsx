'use client';
import { useAuthStore } from '@/stores/auth-store';
import { TeacherLanding } from '@/components/features/TeacherLanding';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/shared/PageLoading';
export function TeacherEntry() {
  const user = useAuthStore(s => s.user);
  const ready = useAuthStore(s => s.isHydrated);
  const router = useRouter();
  useEffect(() => {
    if (ready && user?.role === 'teacher') router.replace('/teacher/home');
  }, [ready, user?.role, router]);
  if (!ready) return <PageLoading />;
  return user?.role === 'teacher' ? <PageLoading /> : <TeacherLanding />;
}
