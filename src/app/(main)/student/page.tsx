import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '한국어 배우기 · 학생 | GoSsaem',
  description: '나에게 맞는 한국어 선생님을 찾고, 1:1 수업과 그룹 수업으로 한국어를 배워보세요.',
};

export default function StudentEntryPage() {
  redirect('/student/home');
}
