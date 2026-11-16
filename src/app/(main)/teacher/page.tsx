import type { Metadata } from 'next';
import { TeacherEntry } from '@/components/features/teacher/TeacherEntry';

export const metadata: Metadata = {
  title: '선생님 워크스페이스 대시보드 | Go Ssaem Teacher Workspace',
  description:
    'Teach Korean Through What You Love. 한국어를 가르치는 선생님의 전문성과 가능성이 더 크게 빛나는 공간',
};

export default function TeacherEntryPage() {
  return <TeacherEntry />;
}
