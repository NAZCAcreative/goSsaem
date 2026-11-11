'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ListChecks, Check, RotateCcw } from 'lucide-react';
import { showConfirm } from '@/components/shared/AlertDialog';
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
  const [filter, setFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [notice, setNotice] = useState('');
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
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : '요청하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const visible = tasks.filter(task => filter === 'all' || (filter === 'done' ? task.is_done : !task.is_done));
  return <section aria-label="할 일 관리" className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks size={21} />나의 할 일</h2><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">미완료 {tasks.filter(task => !task.is_done).length}개</span></div>
    <div aria-label="할 일 상태 필터" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(['pending', 'done', 'all'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${filter === value ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-violet-700'}`}>{value === 'pending' ? '진행 중' : value === 'done' ? '완료' : '전체'} {tasks.filter(task => value === 'all' || (value === 'done' ? task.is_done : !task.is_done)).length}</button>)}</div>
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (user) void run(async () => { const task = await createTeacherTask(user.id, title, dueDate); setTasks(rows => [task, ...rows]); setTitle(''); setDueDate(''); }); }}>
      <div className="flex gap-2"><input aria-label="새 할 일" maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} placeholder="수업 준비, 학생 피드백…" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm" /><button aria-label="할 일 추가" disabled={busy || loading || !user} className="min-h-11 rounded-lg bg-violet-600 px-3 text-white disabled:opacity-40"><Plus size={20} /></button></div>
      {!compact && <label className="flex flex-wrap items-center gap-3 text-sm text-slate-500">목표 날짜 <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3" /></label>}
    </form>
    {error && <div role="alert" className="text-sm text-error"><p>{error}</p><button disabled={busy} onClick={() => setRevision(value => value + 1)} className="min-h-11 font-semibold underline">다시 불러오기</button></div>}
    {loading ? <p role="status" className="py-6 text-sm text-slate-500">할 일을 불러오는 중…</p> : <>
      {!visible.length && !error && <p className="py-5 text-sm text-slate-500">{filter === 'done' ? '아직 완료한 일이 없습니다.' : tasks.length ? '할 일을 모두 마쳤습니다.' : '이번 수업에서 준비할 일을 적어보세요.'}</p>}
      <ul className={compact ? "space-y-3" : "grid grid-cols-1 items-start gap-3 lg:grid-cols-2"}>{(compact ? visible.slice(0, 4) : visible).map(task => <li key={task.id} className={`rounded-xl border p-4 ${task.is_done ? 'border-slate-100 bg-slate-50' : 'border-violet-100 bg-white'}`}>
        <div className="min-w-0"><p className={`break-words text-sm leading-relaxed ${task.is_done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>{task.title}</p>{task.due_date && <p className="mt-1 text-xs text-slate-500">목표 날짜 · {task.due_date}</p>}</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.is_done ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>{task.is_done ? '완료됨' : '진행 중'}</span>
          <div className="flex gap-2"><button type="button" disabled={busy} aria-label={`${task.title} ${task.is_done ? '완료 취소' : '완료'}`} onClick={() => user && void run(async () => { const updated = await toggleTeacherTask(user.id, task); setTasks(rows => rows.map(row => row.id === task.id ? updated : row)); setNotice(updated.is_done ? '완료했습니다. 완료 목록에서 확인할 수 있습니다.' : '진행 중인 할 일로 옮겼습니다.'); })} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-40 ${task.is_done ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>{task.is_done ? <RotateCcw size={15} /> : <Check size={15} />}{task.is_done ? '완료 취소' : '완료'}</button>
          <button type="button" disabled={busy} aria-label={`${task.title} 삭제`} onClick={() => user && void run(async () => { if (!(await showConfirm('이 할 일을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.'))) return; await deleteTeacherTask(user.id, task); setTasks(rows => rows.filter(row => row.id !== task.id)); setNotice('할 일을 삭제했습니다.'); })} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={15} />삭제</button></div>
        </div>
      </li>)}</ul>
    </>}
    {notice && <p role="status" className="text-xs leading-relaxed text-violet-700">{notice}</p>}
    {compact && <Link href="/teacher/tasks" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-600">모두 보기 →</Link>}
  </section>;
}
