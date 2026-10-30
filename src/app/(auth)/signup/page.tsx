import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: '회원가입 안내 | GoSsaem' };

export default function SignupPage({ searchParams }: { searchParams: { role?: string } }) {
  if (searchParams.role === 'teacher' || searchParams.role === 'student') redirect(`/signup/${searchParams.role}`);
  return (
    <main className="mx-auto max-w-lg space-y-6 px-container-margin py-12 pb-28">
      <h1 className="text-3xl font-bold text-on-surface">GoSsaem 회원가입</h1>
      <p className="text-on-surface-variant">이용 목적에 맞는 계정을 만들어주세요. 학생과 선생님 계정은 서로 다른 이메일로 가입합니다.</p>
      <div className="grid gap-4">
        <Link href="/signup/student" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 hover:border-primary">
          <h2 className="text-xl font-bold text-primary">학생 회원가입</h2>
          <p className="mt-2 text-on-surface-variant">나에게 맞는 선생님을 찾고 한국어를 배워보세요.</p>
        </Link>
        <Link href="/signup/teacher" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 hover:border-primary">
          <h2 className="text-xl font-bold text-primary">선생님 회원가입</h2>
          <p className="mt-2 text-on-surface-variant">선생님 프로필을 만들고 한국어 수업을 개설하세요.</p>
        </Link>
      </div>
      <p className="text-sm text-on-surface-variant">이미 가입하셨나요? <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-primary">로그인</Link></p>
    </main>
  );
}
