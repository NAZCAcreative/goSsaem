import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '한국어 가르치기 · 선생님 | GoSsaem',
  description: 'GoSsaem 선생님 계정을 만들고 프로필, 수업 일정, 학생과의 대화 및 정산을 관리하세요.',
};

const steps = [
  { icon: 'person', title: '선생님 계정 만들기', description: '선생님 전용 이메일 계정으로 가입하고 소개와 전문 분야를 작성해주세요.' },
  { icon: 'edit_calendar', title: '나만의 수업 개설하기', description: '수업 유형, 일정과 수강료를 정하고 학생을 만날 준비를 해보세요.' },
  { icon: 'forum', title: '학생과 수업 이어가기', description: '채팅으로 소통하고 수업 일정, 리뷰와 정산 내역을 한곳에서 관리하세요.' },
];

export default function TeacherEntryPage() {
  return (
    <main className="min-h-screen bg-background pb-16 text-on-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary px-container-margin py-16 text-white lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold tracking-wide text-white/80">GoSsaem · 선생님을 위한 공간</p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">당신의 한국어가<br />누군가의 시작이 됩니다.</h1>
            <p className="max-w-lg text-lg leading-relaxed text-white/85">나만의 경험과 수업으로 세계의 학생들을 만나보세요. 프로필부터 수업 개설, 일정과 정산까지 함께 관리할 수 있어요.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup/teacher" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-white px-6 font-bold text-primary">선생님으로 가입하기</Link>
              <Link href="/login?next=%2Fteacher%2Fhome" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/50 px-6 font-bold hover:bg-white/10">선생님 로그인</Link>
            </div>
            <p className="text-sm leading-relaxed text-white/75">학생 계정과 선생님 계정은 별도로 운영됩니다.<br />학생으로 가입한 이메일이 있다면 다른 이메일을 사용해주세요.</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl sm:p-8">
            <span className="material-symbols-outlined mb-5 text-5xl" aria-hidden="true">school</span>
            <h2 className="text-2xl font-bold">가르치는 일에 집중할 수 있도록</h2>
            <ul className="mt-6 space-y-4">
              {['소개와 전문 분야를 담는 선생님 프로필', '1:1 수업과 그룹 수업 개설', '수업 일정과 학생 출석 관리', '채팅, 학생 리뷰와 정산 내역 확인'].map(item => (
                <li key={item} className="flex items-start gap-3"><span className="material-symbols-outlined text-xl text-white/80" aria-hidden="true">check_circle</span><span>{item}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-container-margin py-16">
        <h2 className="mb-8 text-2xl font-bold sm:text-3xl">선생님으로 시작하는 세 단계</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6">
              <p className="text-xs font-bold text-on-surface-variant">STEP {index + 1}</p>
              <span className="material-symbols-outlined my-5 text-4xl text-primary" aria-hidden="true">{step.icon}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-on-surface-variant">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-outline-variant/40 px-container-margin pt-8 text-sm text-on-surface-variant">
        <span>GoSsaem · 한국어를 통해 연결되는 세상</span>
        <Link href="/student" className="inline-flex min-h-11 items-center font-semibold text-primary">한국어를 배우고 싶으신가요? 학생 페이지로</Link>
      </footer>
    </main>
  );
}
