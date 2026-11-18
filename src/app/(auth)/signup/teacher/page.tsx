import type { Metadata } from 'next';
import { SignupForm } from '@/components/features/auth/SignupForm';

export const metadata: Metadata = { title: '쌤 회원가입 | GoSsaem' };

export default function TeacherSignupPage() {
  return <SignupForm role="teacher" />;
}
