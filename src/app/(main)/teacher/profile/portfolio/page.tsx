'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { showConfirm } from '@/components/shared/AlertDialog';
import { showToast } from '@/components/shared/Toast';
import { listPortfolio, savePortfolio, deletePortfolio, portfolioLabels, portfolioSchema, type PortfolioEntry, type PortfolioInput } from '@/lib/queries/teacherPortfolio';

const empty: PortfolioInput = { kind: 'career', title: '', organization: '', period: '', description: '', url: '', is_public: false };
const fieldClass = 'mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-3 text-on-surface';

export default function PortfolioEditorPage() {
  const user = useAuthStore(state => state.user);
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [form, setForm] = useState<PortfolioInput>({ ...empty });
  const [editing, setEditing] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setLoadError('');
    listPortfolio(user.id).then(rows => { if (!cancelled) setEntries(rows); })
      .catch(err => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, retry]);
  const reset = () => { setEditing(undefined); setForm({ ...empty }); setError(''); };
  const update = <K extends keyof PortfolioInput>(key: K, value: PortfolioInput[K]) => setForm(old => ({ ...old, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || lock.current) return;
    const parsed = portfolioSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const row = await savePortfolio(user.id, parsed.data, editing);
      setEntries(old => editing ? old.map(item => item.id === editing ? row : item) : [row, ...old]);
      reset(); showToast('저장되었습니다');
    } catch (err) { setError(err instanceof Error ? err.message : '저장하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const remove = async (entry: PortfolioEntry) => {
    if (!user || lock.current || !(await showConfirm(`'${entry.title}' 항목을 삭제하시겠습니까?`))) return;
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await deletePortfolio(user.id, entry.id); setEntries(old => old.filter(item => item.id !== entry.id)); if (editing === entry.id) reset(); showToast('삭제되었습니다'); }
    catch (err) { setError(err instanceof Error ? err.message : '삭제하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <main className="mx-auto max-w-5xl px-container-margin pb-32 pt-stack-lg text-on-surface">
    <Link href="/teacher/profile" className="inline-flex min-h-11 items-center text-sm text-primary">← 내 페이지</Link>
    <h1 className="font-headline-lg text-headline-lg">경력과 대표 작업</h1>
    <p className="mt-2 text-on-surface-variant">수업 개설 여부와 관계없이 나의 경험과 전문성을 차곡차곡 남겨보세요.</p>
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
      <form onSubmit={event => void save(event)} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
        <h2 className="font-headline-md">{editing ? '항목 수정' : '새 기록 추가'}</h2>
        {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
        <fieldset disabled={busy || loading || !!loadError} className="mt-4 space-y-4 disabled:opacity-60">
          <label className="block text-sm font-semibold">분류<select value={form.kind} onChange={e => update('kind', e.target.value as PortfolioInput['kind'])} className={fieldClass}>{Object.entries(portfolioLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block text-sm font-semibold">제목 · 필수<input ref={titleRef} required maxLength={120} value={form.title} onChange={e => update('title', e.target.value)} placeholder="예: 비즈니스 한국어 강사 / 한국어교원 자격 / 면접 활동지" className={fieldClass} /></label>
          <label className="block text-sm font-semibold">기관 또는 프로젝트<input maxLength={120} value={form.organization} onChange={e => update('organization', e.target.value)} className={fieldClass} /></label>
          <label className="block text-sm font-semibold">기간 또는 취득일<input maxLength={80} value={form.period} onChange={e => update('period', e.target.value)} placeholder="예: 2024.03 – 현재" className={fieldClass} /></label>
          <label className="block text-sm font-semibold">설명<textarea rows={4} maxLength={2000} value={form.description} onChange={e => update('description', e.target.value)} placeholder="교육 대상, 맡은 역할, 작업 내용을 소개해주세요." className={fieldClass} /></label>
          <label className="block text-sm font-semibold">관련 링크<input type="url" maxLength={2000} value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://" className={fieldClass} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.is_public} onChange={e => update('is_public', e.target.checked)} className="h-5 w-5 accent-primary" />개인페이지에 공개</label>
          <p className="text-xs leading-relaxed text-on-surface-variant">새 기록은 비공개로 저장됩니다. 공개한 내용과 링크는 누구나 볼 수 있으며 ‘본인 작성’으로 표시됩니다. 증빙 원본이나 학생 개인정보는 올리지 마세요.</p>
          <div className="flex flex-wrap gap-2"><button className="min-h-12 flex-1 rounded-lg bg-primary px-5 font-semibold text-on-primary" type="submit">{busy ? '저장 중...' : editing ? '수정 저장' : '기록 저장'}</button>{editing && <button type="button" onClick={reset} className="min-h-12 rounded-lg border border-outline-variant px-4">취소</button>}</div>
        </fieldset>
      </form>
      <section aria-labelledby="records-heading"><h2 id="records-heading" className="font-headline-md">내 기록</h2>
        {loading ? <p role="status" className="mt-4">불러오는 중...</p> : loadError ? <div role="alert" className="mt-4"><p>{loadError}</p><button className="min-h-11 text-primary" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : !entries.length ? <p className="mt-4 rounded-xl bg-surface-container-low p-5 text-on-surface-variant">첫 경력이나 대표 작업을 추가해보세요. 플랫폼 밖의 경험도 함께 기록할 수 있습니다.</p> : <ul className="mt-4 space-y-3">{entries.map(entry => <li key={entry.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
          <div className="flex flex-wrap gap-2 text-xs"><span className="text-primary">{portfolioLabels[entry.kind]}</span><span className="text-on-surface-variant">{entry.is_public ? '공개' : '비공개'} · 본인 작성</span></div>
          <h3 className="mt-2 break-words font-semibold">{entry.title}</h3><p className="mt-1 text-sm text-on-surface-variant">{[entry.organization, entry.period].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex gap-4"><button disabled={busy} className="min-h-11 text-sm text-primary" onClick={() => { setEditing(entry.id); setForm({ kind: entry.kind, title: entry.title, organization: entry.organization, period: entry.period, description: entry.description, url: entry.url, is_public: entry.is_public }); setError(''); titleRef.current?.focus(); }}>수정<span className="sr-only">: {entry.title}</span></button><button disabled={busy} className="min-h-11 text-sm text-error" onClick={() => void remove(entry)}>삭제<span className="sr-only">: {entry.title}</span></button></div>
        </li>)}</ul>}
      </section>
    </div>
  </main>;
}
