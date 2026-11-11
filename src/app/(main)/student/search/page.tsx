import { Suspense } from 'react';
import { LessonDiscovery } from '@/components/features/LessonDiscovery';
import { PageLoading } from '@/components/shared/PageLoading';
export default function SearchPage() { return <Suspense fallback={<PageLoading />}><LessonDiscovery /></Suspense>; }
