import { Suspense } from 'react';
import Link from 'next/link';
import { AdminConsole } from '@/components/features/admin/AdminConsole';

export default function AdminPage() {
  return <><div className="mx-auto max-w-7xl px-container-margin pt-5"><Link href="/admin/operations" className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 font-semibold text-on-primary">예약 요청·환불·지급 운영</Link></div><Suspense fallback={<p className="p-8">관리자 화면을 불러오는 중...</p>}><AdminConsole /></Suspense></>;
}
