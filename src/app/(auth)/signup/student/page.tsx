import type { Metadata } from 'next';
import { SignupForm } from '@/components/features/auth/SignupForm';

export const metadata: Metadata = { title: '학생 회원가입 | GoSsaem' };

export default function StudentSignupPage() {
  return <SignupForm role="student" />;
}
