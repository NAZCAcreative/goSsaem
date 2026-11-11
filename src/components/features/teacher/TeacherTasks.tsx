'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { createTeacherTask, deleteTeacherTask, listTeacherTasks, toggleTeacherTask, type TeacherTask } from '@/lib/queries/teacherTools';

export function TeacherTasks({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore(s => s.user);
  const [tasks, setTasks] = useState<TeacherTask[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showDone, setShowDone] = useState(false);
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(''); setTasks([]);
    listTeacherTasks(user.id).then(rows => { if (!cancelled) setTasks(rows); })
      .catch(cause => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, revision]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : '요청하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const visible = tasks.filter(task => showDone || !task.is_done);
  return <section aria-label="할 일 관리" className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks size={21} />나의 할 일</h2><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">미완료 {tasks.filter(task => !task.is_done).length}개</span></div>
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (user) void run(async () => { const task = await createTeacherTask(user.id, title, dueDate); setTasks(rows => [task, ...rows]); setTitle(''); setDueDate(''); }); }}>
      <div className="flex gap-2"><input aria-label="새 할 일" maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} placeholder="수업 준비, 학생 피드백…" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm" /><button aria-label="할 일 추가" disabled={busy || loading || !user} className="min-h-11 rounded-lg bg-violet-600 px-3 text-white disabled:opacity-40"><Plus size={20} /></button></div>
      {!compact && <label className="flex flex-wrap items-center gap-3 text-sm text-slate-500">목표 날짜 <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3" /></label>}
    </form>
    {error && <div role="alert" className="text-sm text-error"><p>{error}</p><button disabled={busy} onClick={() => setRevision(value => value + 1)} className="min-h-11 font-semibold underline">다시 불러오기</button></div>}
    {loading ? <p role="status" className="py-6 text-sm text-slate-500">할 일을 불러오는 중…</p> : <>
      {!visible.length && !error && <p className="py-5 text-sm text-slate-500">{tasks.length ? '할 일을 모두 마쳤습니다.' : '이번 수업에서 준비할 일을 적어보세요.'}</p>}
      <ul className="divide-y divide-slate-100">{(compact ? visible.slice(0, 4) : visible).map(task => <li key={task.id} className="flex items-center gap-3 py-3"><input type="checkbox" aria-label={`${task.title} 완료`} checked={task.is_done} disabled={busy} onChange={() => user && void run(async () => { const updated = await toggleTeacherTask(user.id, task); setTasks(rows => rows.map(row => row.id === task.id ? updated : row)); })} className="h-5 w-5 shrink-0 accent-violet-600" /><div className="min-w-0 flex-1"><p className={`break-words text-sm ${task.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>{task.due_date && <p className="mt-1 text-xs text-slate-500">{task.due_date}</p>}</div>{!compact && <button disabled={busy} aria-label={`${task.title} 삭제`} onClick={() => user && void run(async () => { await deleteTeacherTask(user.id, task); setTasks(rows => rows.filter(row => row.id !== task.id)); })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button>}</li>)}</ul>
    </>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><label className="flex min-h-11 items-center gap-2 text-slate-500"><input type="checkbox" checked={showDone} onChange={event => setShowDone(event.target.checked)} className="accent-violet-600" />완료한 일 보기</label>{compact && <Link href="/teacher/tasks" className="min-h-11 content-center font-semibold text-violet-600">모두 보기 →</Link>}</div>
  </section>;
}
