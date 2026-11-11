'use client';

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
  const [error, setError] = useState('');
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
    Promise.all([getTeacherLesson(params.id), createClient().from('lesson_sessions').select('id, scheduled_at, duration_minutes, enrolled_count, capacity, status').eq('teacher_lesson_id', params.id).eq('teacher_id', user.id).order('scheduled_at')])
      .then(([row, result]) => {
        if (!active) return;
        if (!row || row.teacherId !== user.id) throw new Error('수업을 찾을 수 없습니다.');
        if (result.error) throw result.error;
        setError(''); setLesson(row); setSessions(result.data ?? []);
      }).catch(() => { if (active) setError('수업을 불러오지 못했습니다. 수업관리에서 다시 시도해주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id, user, revision]);
  return <main className="mx-auto max-w-3xl space-y-6 px-container-margin py-8 pb-32">
    <Link href="/teacher/lessons" className="text-primary">← 수업관리</Link>
    {loading ? <p>불러오는 중...</p> : error ? <p role="alert">{error}</p> : lesson && <>
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      <p>{lesson.category} · {lesson.level} · {lesson.schedulingMode === 'fixed' ? '시간 확정형' : '학생 신청형'} · {lesson.isPublished ? '공개 중' : '비공개'}</p>
      <p>{lesson.price.toLocaleString()}원 · 정원 {lesson.capacity}명</p>
      <p className="whitespace-pre-wrap">{lesson.description || '등록된 설명이 없습니다.'}</p>
      {lesson.schedulingMode === 'request' && <section className="rounded-xl border p-5"><h2 className="font-bold">매주 신청 가능한 시간 (한국 시간)</h2>
        {lesson.availability.map((window, i) => <p key={i}>{['일', '월', '화', '수', '목', '금', '토'][window.weekday]}요일 {window.start}–{window.end}</p>)}
        <p>회당 {lesson.durationMinutes}분 · 학생이 시간을 선택하면 수업 일정이 생성됩니다.</p>
      </section>}
      <div className="flex gap-4"><Link className="text-primary" href={`/teacher/lessons/edit?id=${lesson.id}`}>수업 정보 수정</Link><Link className="text-primary" href={`/teachers/${lesson.teacherId}`}>학생에게 보이는 수업 확인</Link></div>
      <section className="space-y-3"><h2 className="text-xl font-bold">수업 일정</h2>
        {!sessions.length && <p>아직 개설된 일정이 없습니다. 학생 신청을 기다리고 있습니다.</p>}
        {sessions.map(session => <article key={session.id} className="rounded-xl border p-4">
          <p>{new Date(session.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간) · {session.duration_minutes}분</p>
          <p>{session.enrolled_count}/{session.capacity}명 예약 · {session.status === 'scheduled' ? '예정' : session.status}</p>
          <Link className="text-primary" href={`/teacher/lessons/attendance?session=${session.id}`}>예약 학생 및 출석 확인</Link>
        </article>)}
      </section>
    </>}
  </main>;
}
