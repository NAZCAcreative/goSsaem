import { Suspense } from 'react';
import { SearchDiscovery } from '@/components/features/TeacherDiscovery';
import { PageLoading } from '@/components/shared/PageLoading';
export default function SearchPage() { return <Suspense fallback={<PageLoading />}><SearchDiscovery /></Suspense>; }
