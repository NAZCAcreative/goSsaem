import { Suspense } from 'react';
import { AdminConsole } from '@/components/features/admin/AdminConsole';

export default function AdminPage() {
  return <Suspense fallback={<p className="p-8">관리자 화면을 불러오는 중...</p>}><AdminConsole /></Suspense>;
}
