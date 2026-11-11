'use client';
import { TeacherLanguages } from '@/components/features/teacher/TeacherLanguages';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPublicLesson, lessonBookingHref, lessonPrice, lessonTime, lessonTypeLabels, type CatalogLesson } from '@/lib/queries/lessonCatalog';
import { LessonCover } from '@/components/features/LessonDiscovery';
import { PageLoading } from '@/components/shared/PageLoading';

function LessonDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const preferred = params.get('start');
  const [lesson, setLesson] = useState<CatalogLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision,setRevision] = useState(0);
  useEffect(() => { let cancelled=false; setLoading(true); setLesson(null); setError(''); getPublicLesson(id).then(value=>{if(!cancelled)setLesson(value);}).catch(cause=>{if(!cancelled)setError(cause.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;}; },[id,revision]);
  if(loading) return <PageLoading />;
  if(!lesson) return <main className="mx-auto max-w-4xl px-container-margin py-16 pb-28"><h1 className="text-xl font-bold">{error || '현재 공개된 수업이 아닙니다'}</h1>{error && <button className="mt-4 min-h-11 text-primary" onClick={()=>setRevision(x=>x+1)}>다시 시도</button>}<Link href="/student/search" className="mt-4 block min-h-11 text-primary">수업 찾기로 돌아가기 →</Link></main>;
  const sessions=lesson.sessions;
  return <main className="mx-auto max-w-6xl px-container-margin py-7 pb-28 text-on-surface"><Link href="/student/search" className="mb-5 inline-flex min-h-11 items-center text-sm text-primary">← 수업 찾기</Link><div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div className="min-w-0 space-y-6"><div className="overflow-hidden rounded-2xl"><LessonCover lesson={lesson} /></div><section><p className="text-sm font-semibold text-secondary">{lesson.category} · {lessonTypeLabels[lesson.type]} · {lesson.level || '누구나'}</p><h1 className="mt-3 break-words text-3xl font-bold leading-snug">{lesson.title}</h1><div className="mt-4 flex flex-wrap gap-2 text-xs">{[`${lesson.duration_minutes}분`, `최대 ${lesson.capacity}명`, ...(lesson.supported_languages || [])].map(label=><span key={label} className="rounded-full bg-surface-container px-3 py-2">{label}</span>)}</div></section><section className="rounded-2xl border border-outline-variant/25 bg-white p-6"><h2 className="text-lg font-bold">이 수업에서 배우는 것</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-on-surface-variant">{lesson.description || '등록된 수업 소개가 없습니다.'}</p></section><section className="rounded-2xl border border-outline-variant/25 bg-white p-6"><h2 className="text-lg font-bold">함께할 선생님</h2><p className="mt-3 font-semibold">{lesson.teacher_name} 선생님</p><Link href={`/teachers/${lesson.teacher_id}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary">선생님 소개·경력·후기 보기 →</Link></section><TeacherLanguages teacherId={lesson.teacher_id} /></div>
    <aside className="min-w-0 rounded-2xl border border-outline-variant/25 bg-white p-6 shadow-sm"><p className="text-sm text-on-surface-variant">1인·1회 수업료</p><p className="mt-2 text-3xl font-bold text-primary">{lessonPrice(lesson)}</p><h2 className="mt-7 text-lg font-bold">참여할 일정 선택</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">한국 시간 기준입니다. 잔여 자리는 예약 단계에서 다시 확인합니다.</p>
      {sessions.length ? <ul className="mt-4 space-y-3">{sessions.map(session=><li key={session.id} className={`rounded-xl border p-4 ${session.start===preferred ? 'border-primary bg-primary/5' : 'border-outline-variant/25'}`}><p className="text-sm font-semibold">{lessonTime(session.start)}</p><p className="mt-2 text-xs text-on-surface-variant">{session.duration}분 · 최대 {session.capacity}명 · {session.remaining>0 ? `${session.remaining}자리 남음` : '마감'}</p>{session.remaining>0 && <Link href={lessonBookingHref(lesson,session)} className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary">이 일정으로 예약</Link>}</li>)}</ul> : <p className="my-6 text-sm leading-relaxed text-on-surface-variant">{lesson.scheduling_mode==='request' ? '예약 화면에서 가능한 날짜와 시간을 선택해주세요.' : '새 일정을 준비하고 있습니다. 다른 수업도 둘러보세요.'}</p>}
      {lesson.scheduling_mode==='request' && <Link href={lessonBookingHref(lesson)} className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-primary px-4 text-sm font-semibold text-primary">다른 날짜·시간 확인</Link>}
    </aside></div></main>;
}
export default function LessonDetailPage({ params }: { params: { id: string } }) { return <Suspense fallback={<PageLoading />}><LessonDetail id={params.id} /></Suspense>; }
