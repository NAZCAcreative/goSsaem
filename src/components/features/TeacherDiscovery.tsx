'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listTeachers } from '@/lib/queries/teachers';
import { TeacherImage } from '@/components/shared/LearningImage';
import { LessonDiscovery } from './LessonDiscovery';

export function SearchDiscovery() {
  const params = useSearchParams();
  const teachers = params.get('view') === 'teachers';
  return <>
    <nav aria-label="검색 대상" className="mx-auto flex max-w-7xl gap-3 px-container-margin pt-6">
      <Link href="/student/search" aria-current={!teachers ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${!teachers ? 'bg-primary text-on-primary' : 'border border-outline-variant/30'}`}>수업 검색</Link>
      <Link href="/student/search?view=teachers" aria-current={teachers ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${teachers ? 'bg-primary text-on-primary' : 'border border-outline-variant/30'}`}>선생님 검색</Link>
    </nav>
    {teachers ? <TeacherDiscovery /> : <LessonDiscovery />}
  </>;
}

export function TeacherDiscovery() {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get('q') || '').trim().slice(0, 200);
  const { data: teachers = [], isPending, error, refetch } = useQuery({ queryKey: ['teachers'], queryFn: listTeachers });
  const normalized = query.toLocaleLowerCase();
  const matches = teachers.filter(teacher => [teacher.name, teacher.headline, ...teacher.specialties, ...(teacher.lessonTitles || [])].join(' ').toLocaleLowerCase().includes(normalized));
  return <main className="mx-auto max-w-7xl space-y-6 px-container-margin py-8 pb-28 text-on-surface">
    <section className="rounded-3xl bg-primary/10 p-6 sm:p-9">
      <h1 className="text-2xl font-bold sm:text-3xl">나에게 맞는 선생님을 찾아보세요</h1>
      <p className="mt-3 text-sm text-on-surface-variant">선생님의 소개와 전문 분야를 살펴보고 함께 배울 선생님을 만나보세요.</p>
      <form role="search" className="mt-6 flex gap-2" onSubmit={event => {
        event.preventDefault();
        const next = new URLSearchParams({ view: 'teachers' });
        const value = String(new FormData(event.currentTarget).get('q') || '').trim().slice(0, 200);
        if (value) next.set('q', value);
        router.push(`/student/search?${next}`, { scroll: false });
      }}>
        <input key={query} name="q" type="search" defaultValue={query} maxLength={200} aria-label="선생님 이름 또는 전문 분야 검색" placeholder="선생님 이름, 회화, 여행" className="min-h-12 min-w-0 flex-1 rounded-xl border border-outline-variant/30 bg-white px-4 text-sm" />
        <button className="min-h-12 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary">선생님 검색</button>
      </form>
    </section>
    {isPending ? <p role="status">선생님 목록을 불러오고 있어요…</p> : error ? <div role="alert" className="rounded-xl bg-error-container/30 p-5"><p>선생님 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p><button onClick={() => void refetch()} className="mt-3 min-h-11 font-semibold text-primary">다시 시도</button></div> : <>
      <p role="status" className="text-sm font-semibold">{matches.length}명의 선생님</p>
      {matches.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{matches.map(teacher => <article key={teacher.id} className="rounded-2xl border border-outline-variant/30 bg-white p-5">
        <Link href={`/teachers/${teacher.id}`} className="block space-y-3" aria-label={`${teacher.name} 선생님 상세 소개 보기`}>
          <TeacherImage name={teacher.name} avatarUrl={teacher.avatarUrl} avatarIsGenerated={teacher.avatarIsGenerated} specialties={teacher.specialties} className="h-40 w-full rounded-xl" />
          <h2 className="text-lg font-bold">{teacher.name}</h2>
          {teacher.headline && <p className="text-sm text-on-surface-variant">{teacher.headline}</p>}
          <p className="text-sm">평점 {teacher.ratingAvg.toFixed(1)} · 후기 {teacher.ratingCount}개</p>
          <div className="flex flex-wrap gap-2">{teacher.specialties.map(tag => <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{tag}</span>)}</div>
          <span className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">상세 소개 보기 →</span>
        </Link>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-outline-variant/30 p-8 text-center"><p>{query ? '검색 조건에 맞는 선생님이 없습니다.' : '등록된 선생님이 아직 없습니다.'}</p>{query && <Link href="/student/search?view=teachers" className="mt-3 inline-flex min-h-11 items-center text-primary">전체 선생님 보기</Link>}</div>}
    </>}
  </main>;
}
