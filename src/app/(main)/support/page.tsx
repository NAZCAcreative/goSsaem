'use client';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { adminDisplay, STATUS_LABELS, type AdminList } from '@/lib/admin';

const field = 'mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const button = 'min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40';
const statuses = ['ticket_open', 'ticket_processing', 'ticket_resolved'];

export default function SupportPage() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.isHydrated);
  const accountRole = useAuthStore((s) => s.user?.role);
  const userId = user?.id;
  const [kind, setKind] = useState('inquiry');
  const [category, setCategory] = useState('booking');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const [list, setList] = useState<AdminList | null>(null);
  const [listOwner, setListOwner] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const request = useRef<{ signature: string; id: string }>();
  const submitting = useRef(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  useEffect(() => {
    setTitle(''); setBody(''); setSuccess(''); setSaveError(''); setPage(1); setStatus(''); request.current = undefined;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setList(null); setLoadError('');
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const load = async () => {
      try {
        const result = await createClient().rpc('my_support_tickets', { p_page: page, p_status: status });
        if (result.error) throw result.error;
        if (!cancelled) { setList(result.data as AdminList); setListOwner(userId); }
      } catch { if (!cancelled) setLoadError('접수 내역을 불러오지 못했습니다. 다시 시도해주세요.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [userId, page, status, refresh]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || submitting.current || title.trim().length < 2 || body.trim().length < 10) return;
    submitting.current = true; setSaving(true); setSaveError(''); setSuccess('');
    const signature = JSON.stringify([userId, kind, category, title.trim(), body.trim()]);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const result = await createClient().rpc('create_support_ticket', {
        p_kind: kind, p_category: category, p_title: title.trim(), p_body: body.trim(), p_request_id: request.current.id,
      });
      if (result.error) throw result.error;
      if (currentUser.current !== userId) return;
      setTitle(''); setBody(''); request.current = undefined;
      setSuccess('접수되었습니다. 답변은 아래 내 접수 내역에서 확인해주세요.');
      setStatus(''); setPage(1); setRefresh((value) => value + 1);
    } catch (error) {
      if (currentUser.current === userId) setSaveError(error && typeof error === 'object' && 'code' in error && error.code === 'P0001'
        ? '최근 접수 건수가 많습니다. 잠시 후 다시 시도해주세요.'
        : '접수를 확인하지 못했습니다. 로그인과 연결 상태를 확인하고 다시 시도해주세요.');
    } finally { submitting.current = false; setSaving(false); }
  };
  const visibleList = listOwner === userId ? list : null;
  const pages = Math.max(1, Math.ceil((visibleList?.total || 0) / 10));

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-8 pb-28 text-slate-800 sm:px-6">
    <div><Link href={accountRole === 'teacher' ? '/teacher/profile' : '/student/profile'} className="inline-flex min-h-11 items-center text-sm text-slate-500">← 마이로 돌아가기</Link><h1 className="mt-2 text-3xl font-extrabold">고객센터</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">수업 이용 중 궁금한 점이나 신고할 내용을 남겨주세요. 접수 상태와 운영자 답변을 여기에서 확인할 수 있습니다.</p></div>
    {!hydrated ? <p role="status">로그인 상태를 확인하고 있습니다...</p> : !userId ? <div className="rounded-2xl border bg-white p-6"><p>문의·신고 접수와 내역 확인은 로그인 후 이용할 수 있습니다.</p><Link href="/login?next=%2Fsupport" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">로그인하기</Link></div> : <>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold">문의·신고 접수</h2>
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <div className="grid grid-cols-2 gap-4"><label className="text-sm font-semibold">접수 유형<select className={field} value={kind} onChange={(e) => setKind(e.target.value)}><option value="inquiry">문의</option><option value="report">신고</option></select></label><label className="text-sm font-semibold">분야<select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>{['booking', 'payment', 'account', 'lesson', 'other'].map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label></div>
          <label className="block text-sm font-semibold">제목<input required minLength={2} maxLength={120} className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="어떤 도움이 필요한가요?" /></label>
          <label className="block text-sm font-semibold">내용<textarea required minLength={10} maxLength={5000} rows={6} className={field} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'report' ? '신고 대상의 이름 또는 페이지 주소, 발생 시간과 상황을 구체적으로 알려주세요.' : '수업명, 이용 날짜, 궁금한 내용을 10자 이상 알려주세요.'} /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{body.length.toLocaleString()} / 5,000자</span></label>
          <p className="text-xs text-slate-500">접수 내용은 본인과 운영자만 확인할 수 있습니다.</p>
          <button disabled={saving || title.trim().length < 2 || body.trim().length < 10} className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-40">{saving ? '접수 중...' : kind === 'report' ? '신고 접수하기' : '문의 접수하기'}</button>
        </fieldset>
        {saveError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      </form>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">내 접수 내역</h2><button className={button} disabled={loading} onClick={() => setRefresh((value) => value + 1)}>새로고침</button></div>
        <label className="block max-w-xs text-sm font-medium">처리 상태<select className={field} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">전체 상태</option>{statuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label>
        {loading && <p role="status" className="py-8 text-center text-sm text-slate-500">접수 내역을 불러오는 중...</p>}
        {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
        {!loading && visibleList && <>
          <p className="text-sm text-slate-500">총 {visibleList.total}건 · 페이지당 10건</p>
          {!visibleList.rows.length && <p className="py-10 text-center text-sm text-slate-500">{status ? '해당 상태의 접수 내역이 없습니다.' : '아직 접수한 문의·신고가 없습니다.'}</p>}
          <div className="space-y-3">{visibleList.rows.map((ticket) => <details key={ticket.id} className="group rounded-xl border border-slate-200 open:border-primary/30">
            <summary className="cursor-pointer list-none p-4"><span className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">{adminDisplay('status', ticket.status)}</span><span className="px-1 py-1 text-slate-500">{adminDisplay('kind', ticket.kind)} · {adminDisplay('category', ticket.category)}</span></span><span className="mt-2 block break-words font-semibold">{String(ticket.title)}</span><span className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400"><span>{adminDisplay('created_at', ticket.created_at)}</span><span className="group-open:hidden">내용·답변 보기 ＋</span><span className="hidden group-open:inline">접기 −</span></span></summary>
            <div className="space-y-4 border-t p-4 text-sm"><div><h3 className="mb-2 font-bold">접수 내용</h3><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{String(ticket.body)}</p></div><div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold">운영자 답변</h3><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{String(ticket.response || '운영자가 내용을 확인하고 있습니다. 답변이 등록되면 여기에 표시됩니다.')}</p>{ticket.response ? <p className="mt-3 text-xs text-slate-400">최종 갱신 {adminDisplay('updated_at', ticket.updated_at)}</p> : null}</div><p className="break-all text-xs text-slate-400">접수번호: {ticket.id}</p></div>
          </details>)}</div>
          <nav aria-label="내 접수 내역 페이지" className="flex items-center justify-between gap-2 border-t pt-4"><button className={button} disabled={visibleList.page <= 1} onClick={() => setPage(visibleList.page - 1)}>이전</button><span className="text-sm">{visibleList.page} / {pages} 페이지</span><button className={button} disabled={visibleList.page >= pages} onClick={() => setPage(visibleList.page + 1)}>다음</button></nav>
        </>}
      </section>
    </>}
  </main>
    </PageContent>
  );
}
