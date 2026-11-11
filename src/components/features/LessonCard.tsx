'use client';
import {useState} from 'react';
import Link from 'next/link';
import {BookOpen,Clock3,Users,CalendarDays,ArrowUpRight} from 'lucide-react';
import {matchingSession,lessonTime,lessonPrice,lessonTypeLabels,type CatalogLesson} from '@/lib/queries/lessonCatalog';

export function LessonCover({ lesson }: { lesson: CatalogLesson }) {
  const [failed, setFailed] = useState(false);
  return <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-orange-50 to-secondary/10">
    {lesson.image_url && !failed ? <img src={lesson.image_url} alt={lesson.title} onError={() => setFailed(true)} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex flex-col items-center gap-3 text-primary"><BookOpen size={42} strokeWidth={1.3} /><span className="text-sm font-semibold">{lesson.category || '한국어 수업'}</span></div>}
    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-on-surface">{lessonTypeLabels[lesson.type]}</span>
  </div>;
}
export function LessonCard({ lesson, day = '' }: { lesson: CatalogLesson; day?: string }) {
  const session = matchingSession(lesson, day);
  const href = `/lessons/${lesson.id}${session ? `?start=${encodeURIComponent(session.start)}` : ''}`;
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/25 bg-white shadow-sm transition-shadow hover:shadow-md"><Link href={href} className="flex h-full flex-col focus-visible:outline-offset-[-3px]">
    <LessonCover lesson={lesson} /><div className="flex flex-1 flex-col p-5"><div className="mb-2 flex flex-wrap gap-2 text-xs text-secondary"><span>{lesson.category}</span><span>·</span><span>{lesson.level || '누구나'}</span></div><h2 className="break-words text-lg font-bold leading-snug text-on-surface">{lesson.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{lesson.description || '수업 상세에서 학습 내용과 일정을 확인해보세요.'}</p>
      <div className="mt-4 space-y-2 text-xs text-on-surface-variant"><p className="flex items-center gap-2"><Clock3 size={15} />{session?.duration || lesson.duration_minutes}분 <Users size={15} className="ml-2" />최대 {session?.capacity || lesson.capacity}명</p><p className="flex items-start gap-2"><CalendarDays size={15} className="shrink-0" /><span>{session ? `${lessonTime(session.start)} · ${session.remaining}자리 남음` : lesson.scheduling_mode === 'request' ? '예약 시 가능한 시간 선택' : '새 일정 준비 중'}</span></p></div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-outline-variant/20 pt-4"><div><p className="text-xs text-on-surface-variant">{lesson.teacher_name} 선생님</p><p className="mt-1 text-lg font-bold text-primary">{lessonPrice(lesson)}<span className="ml-1 text-xs font-normal text-on-surface-variant">/ 1인·1회</span></p></div><span className="flex items-center gap-1 text-xs font-semibold text-primary">수업 보기 <ArrowUpRight size={16} /></span></div>
    </div></Link></article>;
}

