'use client';
import { useAuthStore } from '@/stores/auth-store';
import { TeacherLanding } from '@/components/features/TeacherLanding';
import { TeacherWorkspaceDashboard } from './TeacherWorkspaceDashboard';
import { PageLoading } from '@/components/shared/PageLoading';
export function TeacherEntry() {
  const user = useAuthStore(s => s.user);
  const ready = useAuthStore(s => s.isHydrated);
  if (!ready) return <PageLoading />;
  return user?.role === 'teacher' ? <TeacherWorkspaceDashboard /> : <TeacherLanding />;
}
