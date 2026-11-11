'use client';

import { useAlertState } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getTeacherLesson, type TeacherLessonRow } from '@/lib/queries/teacherLessons';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

type Session = { id: string; scheduled_at: string; duration_minutes: number; enrolled_count: number; capacity: number; status: string };

export default function LessonDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore(s => s.user);
  const [lesson, setLesson] = useState<TeacherLessonRow | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useAlertState<string>('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = () => setRevision(value => value + 1);
    const supabase = createClient();
    const channel = supabase.channel(`lesson-detail-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_sessions', filter: `teacher_lesson_id=eq.${params.id}` }, refresh).subscribe();
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [params.id, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      getTeacherLesson(params.id),
      createClient().from('lesson_sessions').select('id, scheduled_at, duration_minutes, enrolled_count, capacity, status').eq('teacher_lesson_id', params.id).eq('teacher_id', user.id).order('scheduled_at'),
    ])
      .then(([row, result]) => {
        if (!active) return;
        if (!row || row.teacherId !== user.id) throw new Error('수업을 찾을 수 없습니다.');
        if (result.error) throw result.error;
        setError(''); setLesson(row); setSessions(result.data ?? []);
      }).catch(() => { if (active) setError('수업을 불러오지 못했습니다. 수업관리에서 다시 시도해주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id, user, revision, setError]);

  return <main className="mx-auto max-w-3xl space-y-6 px-container-margin py-8 pb-32 font-body-md">
    <Link href="/teacher/lessons" className="text-primary font-semibold">← 수업관리</Link>
    {loading ? <p>불러오는 중...</p> : error ? <p role="alert">{error}</p> : lesson && <>
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">🗣 수업 언어: {lesson.language || '한국어'}</span>
        <span className="rounded bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">{lesson.category}</span>
        <span className="rounded bg-tertiary/10 px-2.5 py-1 text-xs font-semibold text-tertiary">{lesson.level}</span>
        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{lesson.schedulingMode === 'fixed' ? '시간 확정형' : '학생 신청형'}</span>
        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{lesson.isPublished ? '공개 중' : '비공개'}</span>
      </div>
      <p className="font-semibold text-slate-800">{lesson.price.toLocaleString()}원 · 정원 {lesson.capacity}명</p>
      <p className="whitespace-pre-wrap text-slate-600">{lesson.description || '등록된 설명이 없습니다.'}</p>
      {lesson.schedulingMode === 'request' && <section className="rounded-xl border p-5">
        <h2 className="font-bold">매주 신청 가능한 시간 (한국 시간)</h2>
        {lesson.availability.map((window, i) => <p key={i}>{['일', '월', '화', '수', '목', '금', '토'][window.weekday]}요일 {window.start}–{window.end}</p>)}
        <p className="mt-2 text-primary font-semibold">회당 {lesson.durationMinutes}분 수업 · 학생이 시간을 선택하면 수업 일정이 생성됩니다.</p>
      </section>}
      <div className="flex gap-4"><Link className="text-primary font-bold hover:underline" href={`/teacher/lessons/edit?id=${lesson.id}`}>수업 정보 수정</Link><Link className="text-primary hover:underline" href={`/teachers/${lesson.teacherId}`}>학생에게 보이는 수업 확인</Link></div>
      <section className="space-y-3"><h2 className="text-xl font-bold">수업 일정</h2>
        {!sessions.length && <p className="text-slate-500">아직 개설된 일정이 없습니다. 학생 신청을 기다리고 있습니다.</p>}
        {sessions.map(session => <article key={session.id} className="rounded-xl border p-4 bg-white shadow-xs">
          <p className="font-semibold text-slate-900">{new Date(session.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간) · {session.duration_minutes}분 수업</p>
          <p className="text-sm text-slate-600">{session.enrolled_count}/{session.capacity}명 예약 · {session.status === 'scheduled' ? '예정' : session.status}</p>
          <Link className="mt-2 inline-block text-sm text-primary font-bold hover:underline" href={`/teacher/lessons/attendance?session=${session.id}`}>예약 학생 및 출석 확인</Link>
        </article>)}
      </section>
    </>}
  </main>;
}
