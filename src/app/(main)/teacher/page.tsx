import type { Metadata } from 'next';
import { TeacherLanding } from '@/components/features/TeacherLanding';

export const metadata: Metadata = {
  title: '선생님 등록 및 안내 | Teach Korean, Share Korean Culture - Go Ssaem',
  description:
    '한국어로 세상과 소통하는 선생님이 되어주세요. Go Ssaem에서 전 세계 학습자와 함께하는 한국어 온라인 수업을 시작하세요.',
};

export default function TeacherEntryPage() {
  return <TeacherLanding />;
}
