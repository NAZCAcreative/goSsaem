import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: '회원가입 안내 | GoSsaem' };

export default function SignupPage({ searchParams }: { searchParams: { role?: string } }) {
  if (searchParams.role === 'teacher' || searchParams.role === 'student') redirect(`/signup/${searchParams.role}`);
  return (
    <main className="mx-auto max-w-lg space-y-6 px-container-margin py-12 pb-28">
      <div className="flex justify-center mb-6">
        <Link href="/student" aria-label="GoSsaem 홈으로 이동" className="transition-opacity hover:opacity-85">
          <Image src="/img/gossaem_logo01.png" alt="GoSsaem" width={2172} height={724} className="h-10 w-auto object-contain sm:h-12" priority />
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-on-surface text-center">GoSsaem 회원가입</h1>
      <p className="text-on-surface-variant text-center">이용 목적에 맞는 계정을 만들어주세요. 학생과 선생님 계정은 서로 다른 이메일로 가입합니다.</p>
      
      {/* Teacher guidance banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="선생님">👩‍🏫</span>
          <div>
            <p className="text-sm font-bold text-secondary">선생님이신가요?</p>
            <p className="text-xs text-on-surface-variant">한국어 선생님 소개 및 등록 안내를 확인해보세요.</p>
          </div>
        </div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-secondary/90 shrink-0"
        >
          <span>선생님 페이지 둘러보기</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

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
