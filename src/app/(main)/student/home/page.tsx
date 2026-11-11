import { Suspense } from 'react';
import { StudentCourseHome } from '@/components/features/LessonDiscovery';
import { PageLoading } from '@/components/shared/PageLoading';
export default function StudentHomePage() { return <Suspense fallback={<PageLoading />}><StudentCourseHome /></Suspense>; }
