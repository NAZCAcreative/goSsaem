'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { isTeacherWorkspace } from '@/lib/teacher-navigation';
export function TeacherWorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const teacher = useAuthStore(s => s.user?.role === 'teacher');
  return <div className={teacher && isTeacherWorkspace(pathname) ? 'min-h-screen bg-[#f7f7fc] text-[#20243c] lg:pl-56' : undefined}>{children}</div>;
}
