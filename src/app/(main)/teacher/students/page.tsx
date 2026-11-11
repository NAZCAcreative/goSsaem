'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NotebookPen, LockKeyhole, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getStudentNote, listTeacherStudents, saveStudentNote, type StudentNote, type TeacherStudent } from '@/lib/queries/teacherTools';

function NoteEditor({ student, onDirty }: { student: TeacherStudent; onDirty: (dirty: boolean) => void }) {
  const user = useAuthStore(s => s.user);
  const [note, setNote] = useState<StudentNote | null>(null);
  const [values, setValues] = useState({ goals: '', learning_notes: '', next_steps: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const saveLock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true); setError(''); setLoaded(false);
    getStudentNote(user.id, student.id).then(row => {
      if (cancelled) return;
      setNote(row); setValues({ goals: row?.goals || '', learning_notes: row?.learning_notes || '', next_steps: row?.next_steps || '' }); setLoaded(true);
    }).catch(cause => { if (!cancelled) setError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [student.id, user, revision]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!user || saveLock.current || !loaded) return;
    saveLock.current = true;
    setSaving(true); setError(''); setSaved(false);
    try { const result = await saveStudentNote(user.id, student.id, values, note); if (mounted.current) { setNote(result); onDirty(false); setSaved(true); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.'); }
    finally { saveLock.current = false; if (mounted.current) setSaving(false); }
  };
  return <section className="rounded-xl border border-slate-200/70 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{student.name} 학생 노트</h2><span className="flex items-center gap-1.5 text-xs text-violet-600"><LockKeyhole size={14} />나만 볼 수 있는 기록</span></div><p className="mt-2 text-sm text-slate-500">수업 예약 {student.lessons}회 · 학습 목표와 다음 수업 준비를 이어가세요.</p>
    {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
    {loading ? <p role="status" className="py-8 text-sm text-slate-500">노트를 불러오는 중…</p> : !loaded ? <button onClick={() => setRevision(value => value + 1)} className="mt-4 min-h-11 text-violet-600">다시 불러오기</button> : <form onSubmit={event => void save(event)} className="mt-6 space-y-5">
      {([{ key: 'goals', label: '학습 목표·관심사', max: 2000, placeholder: '한국어를 배우는 이유, 관심 분야, 원하는 수업 방식' }, { key: 'learning_notes', label: '수업 관찰·피드백', max: 5000, placeholder: '잘한 점, 어려워한 표현, 반복해서 연습할 내용' }, { key: 'next_steps', label: '다음 수업 준비', max: 2000, placeholder: '다음에 다룰 주제와 준비할 자료' }] as const).map(field => <label key={field.key} className="block text-sm font-semibold">{field.label}<textarea disabled={saving} rows={field.key === 'learning_notes' ? 7 : 3} maxLength={field.max} value={values[field.key]} placeholder={field.placeholder} onChange={event => { setValues(previous => ({ ...previous, [field.key]: event.target.value })); onDirty(true); setSaved(false); }} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm font-normal leading-relaxed focus:border-violet-400 focus:outline-none" /></label>)}
      <div className="flex flex-wrap items-center gap-4"><button disabled={saving} className="min-h-12 rounded-lg bg-violet-600 px-6 font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : '학생 노트 저장'}</button>{saved && <p role="status" className="text-sm text-emerald-700">저장되었습니다.</p>}{note && <p className="text-xs text-slate-500">최근 저장 {new Date(note.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>}</div>
    </form>}
  </section>;
}

export default function TeacherStudentsPage() {
  const user = useAuthStore(s => s.user);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [selected, setSelected] = useState<TeacherStudent | null>(null);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(''); setStudents([]); setSelected(null);
    listTeacherStudents().then(rows => { if (!cancelled) { setStudents(rows); setSelected(rows[0] || null); } }).catch(cause => { if (!cancelled) setError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, revision]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    const guardNavigation = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      if (!window.confirm('저장하지 않은 노트가 있습니다. 다른 화면으로 이동할까요?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', guardNavigation, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardNavigation, true); };
  }, [dirty]);
  return <main className="mx-auto max-w-6xl space-y-6 px-container-margin py-8 pb-28"><div><p className="flex items-center gap-2 text-sm font-semibold text-violet-600"><NotebookPen size={18} />학생과 이어가는 배움</p><h1 className="mt-2 text-3xl font-bold">학생 노트</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">수업이 확정된 학생의 학습 목표와 피드백을 기록하세요. 학생과 다른 선생님에게는 공개되지 않습니다.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-error">{error}<button onClick={() => setRevision(value => value + 1)} className="ml-3 min-h-11 underline">다시 시도</button></div>}
    {loading ? <p role="status">학생을 불러오는 중…</p> : !students.length && !error ? <div className="rounded-xl border border-dashed border-violet-200 bg-white p-10 text-center"><Users className="mx-auto text-violet-400" size={36} /><h2 className="mt-4 text-lg font-semibold">아직 연결된 학생이 없습니다</h2><p className="mt-2 text-sm text-slate-500">수업 예약이 확정되면 이곳에서 학생별 노트를 작성할 수 있습니다.</p><Link href="/teacher/lessons" className="mt-5 inline-flex min-h-11 items-center font-semibold text-violet-600">수업 관리로 이동 →</Link></div> : <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="rounded-xl border border-slate-200/70 bg-white p-4"><input value={search} onChange={event => setSearch(event.target.value)} aria-label="학생 이름 검색" placeholder="학생 이름 검색" className="min-h-11 w-full rounded-lg bg-slate-50 px-3 text-sm" />{students.length > 0 && !students.some(student => student.name.includes(search.trim())) && <p className="py-5 text-sm text-slate-500">검색 결과가 없습니다.</p>}<ul className="mt-3 space-y-1">{students.filter(student => student.name.includes(search.trim())).map(student => <li key={student.id}><button onClick={() => { if (student.id === selected?.id) return; if (dirty && !window.confirm('저장하지 않은 노트가 있습니다. 학생을 변경할까요?')) return; setDirty(false); setSelected(student); }} aria-pressed={student.id === selected?.id} className={`min-h-14 w-full rounded-lg px-3 py-3 text-left ${student.id === selected?.id ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50'}`}><span className="block font-semibold">{student.name}</span><span className="text-xs text-slate-500">수업 예약 {student.lessons}회</span></button></li>)}</ul></aside>{selected && <NoteEditor key={selected.id} student={selected} onDirty={setDirty} />}</div>}
  </main>;
}
