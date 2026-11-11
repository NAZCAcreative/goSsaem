'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { languages, proficiency, type MatchingInput } from '@/lib/queries/matching';

export function TeacherLanguages({ teacherId, editable = false }: { teacherId: string; editable?: boolean }) {
  return <LanguageDetails key={teacherId} teacherId={teacherId} editable={editable} />;
}

function LanguageDetails({ teacherId, editable }: { teacherId: string; editable: boolean }) {
  const [rows, setRows] = useState<MatchingInput['languages']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const result = await createClient().rpc('public_teacher_languages', { p_teacher: teacherId });
        if (result.error) throw result.error;
        if (!cancelled) setRows(result.data || []);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [teacherId, revision]);
  return <section aria-label="선생님의 사용 언어" className="rounded-2xl border border-outline-variant/25 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">사용 가능한 언어</h2>
      {editable && <Link href="/teacher/profile/matching" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">언어·수준 수정 →</Link>}
    </div>
    {loading ? <p role="status" className="mt-3 text-sm">언어 정보를 불러오고 있습니다.</p> : error ? <div role="alert" className="mt-3 text-sm"><p>언어 정보를 불러오지 못했습니다.</p><button onClick={() => setRevision(value => value + 1)} className="min-h-11 text-primary">다시 시도</button></div> : rows.length ? <>
      <ul className="mt-4 flex flex-wrap gap-3">{rows.map(row => <li key={row.language} className="rounded-xl bg-primary/5 px-4 py-3 text-sm"><span className="font-semibold">{languages[row.language]}</span><span className="ml-3 text-on-surface-variant">{proficiency[row.level]}</span></li>)}</ul>
      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">선생님이 직접 등록한 수준이며, 공식 인증 결과가 아닙니다. 실제 수업 진행 언어는 각 수업에서 확인해주세요.</p>
    </> : <p className="mt-3 text-sm text-on-surface-variant">{editable ? '사용할 수 있는 언어와 수준을 등록하면 학생에게 공개됩니다.' : '아직 등록된 언어 정보가 없습니다.'}</p>}
  </section>;
}
