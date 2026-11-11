'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export function MeetingLinkEditor({ sessionId, teacherId, initialUrl }: { sessionId: string; teacherId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    const value = url.trim();
    try { if (value) { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error(); } }
    catch { setError('http 또는 https로 시작하는 올바른 수업 링크를 입력해주세요.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const { error } = await createClient().rpc('update_teacher_meeting_link', { p_session_id: sessionId, p_url: value || null });
      if (error) throw error;
      setSavedUrl(value); setMessage('수업 링크가 저장되었습니다.');
    } catch { setError('수업 링크를 저장하지 못했습니다. 다시 시도해주세요.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={event => void save(event)} className="mt-4 border-t border-surface-container-high pt-4">
    <label className="block text-sm font-semibold" htmlFor={'meeting-' + sessionId}>온라인 수업 링크</label>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id={'meeting-' + sessionId} type="url" maxLength={2000} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://meet.google.com/..." className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-background px-3 py-3" /><button disabled={busy} className="min-h-12 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{busy ? '저장 중...' : '링크 저장'}</button></div>
    {savedUrl && /^https?:\/\//i.test(savedUrl) && <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary">저장된 수업 링크 열기 ↗</a>}
    {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}{message && <p role="status" className="mt-2 text-sm text-primary">{message}</p>}
  </form>;
}
