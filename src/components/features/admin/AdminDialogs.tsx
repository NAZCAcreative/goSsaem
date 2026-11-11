'use client';

import { useAlertState } from '@/components/shared/AlertDialog';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminDisplay, DETAIL_LABELS, STATUS_LABELS, type AdminAction, type AdminMember, type AdminRow, type AdminSection } from '@/lib/admin';

export function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-0 text-on-surface shadow-2xl backdrop:bg-black/40">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <button autoFocus type="button" onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
      </div>
      <div className="space-y-6 p-6">{children}</div>
    </dialog>
  );
}

function RecordFields({ row }: { row: Record<string, unknown> }) {
  return <dl className="divide-y divide-slate-100">{Object.entries(row).filter(([key, value]) => DETAIL_LABELS[key] && value !== null && key !== 'avatar_url').map(([key, value]) => (
    <div key={key} className="grid gap-1 py-2 text-sm sm:grid-cols-[140px_1fr]">
      <dt className="font-medium text-slate-500">{DETAIL_LABELS[key]}</dt><dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{adminDisplay(key, value, row)}</dd>
    </div>
  ))}</dl>;
}

export function AdminDetail({ row, section, rowAction, onClose, onAction, onRelated }: {
  row: AdminRow; section: AdminSection; rowAction: AdminAction | null; onClose: () => void; onAction: (action: AdminAction) => void;
  onRelated: (section: AdminSection, memberId: string, name: string) => void;
}) {
  const memberMode = section === 'members' || section === 'students' || section === 'teachers';
  const [member, setMember] = useState<AdminMember | null>(null);
  const [error, setError] = useAlertState<string>('');
  useEffect(() => {
    let cancelled = false;
    if (!memberMode) return;
    createClient().rpc('admin_member', { p_id: row.id }).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError('회원 정보를 불러오지 못했습니다. 다시 열어주세요.');
      else setMember(data as AdminMember);
    });
    return () => { cancelled = true; };
  }, [memberMode, row.id, setError]);
  const button = 'min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50';
  return (
    <AdminModal title={memberMode ? `${String(row.name)} 회원 상세` : '상세 정보'} onClose={onClose}>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {memberMode && !member && !error && <p role="status">회원 정보를 불러오는 중...</p>}
      {member && <>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-bold">{String(member.profile.name)}</p><p className="mt-1 break-all text-sm text-slate-500">{member.email}</p>
          <p className="mt-2 text-xs text-slate-500">최근 로그인: {adminDisplay('last_sign_in_at', member.lastSignInAt)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={button} onClick={() => onAction({ kind: 'profile', id: row.id, title: '회원 정보 수정', description: String(member.profile.name), data: { name: member.profile.name, native_language: member.profile.native_language || '', korean_level: member.profile.korean_level }, expected: { updated_at: member.profile.updated_at } })}>회원 정보 수정</button>
            <button className={button} onClick={() => onAction({ kind: 'note', id: row.id, title: '관리 메모 수정', description: `${String(member.profile.name)} · 관리자만 볼 수 있는 메모`, data: { note: member.note }, expected: { updated_at: member.noteUpdatedAt } })}>관리 메모 작성</button>
          </div>
        </div>
        <section><h3 className="mb-2 font-bold">관리 메모</h3><p className="whitespace-pre-wrap rounded-xl border p-4 text-sm">{member.note || '등록된 관리 메모가 없습니다.'}</p></section>
        <section><h3 className="mb-2 font-bold">관련 활동</h3>
          <div className="flex flex-wrap gap-2">{([
            ['bookings', `예약 내역 · ${member.bookings}건 (학생)`], ['payments', '결제 내역'], ['reviews', `리뷰 · ${member.reviews}건`],
            ...(member.teacher ? [['lessons', `수업 상품 · ${member.lessons}개`], ['sessions', `수업 일정 · ${member.sessions}건`], ['settlements', '정산 내역'], ['withdrawals', '출금 요청']] : []), ['tickets', '신고·문의 내역'], ['audit', '관리 변경 이력'],
          ] as [AdminSection, string][]).map(([target, label]) => <button key={target} className={button} onClick={() => onRelated(target, row.id, String(member.profile.name))}>{label}</button>)}</div>
        </section>
        <section><h3 className="font-bold">기본 정보</h3><RecordFields row={member.profile} /></section>
        {member.application && <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><h3 className="font-bold">선생님 심사 · {adminDisplay('status', member.application.status)}</h3><RecordFields row={member.application} /><button className={button} onClick={() => onAction({ kind: 'teacher_review', id: row.id, title: '선생님 심사', description: String(member.profile.name) + ' · 승인 시 인증 배지가 표시됩니다.', data: { status: member.application!.status, feedback: member.application!.feedback, internal_note: member.application!.internal_note }, expected: { updated_at: member.application!.updated_at } })}>심사 결과 작성</button></section>}
        {member.teacher && <section><h3 className="font-bold">선생님 정보</h3><RecordFields row={member.teacher} /><button className={button} onClick={() => onAction({ kind: 'teacher_featured', id: row.id, title: '메인 화면 노출 설정', description: `${String(member.profile.name)} 선생님을 학생 홈 화면의 "오늘의 추천 선생님"에 노출할지 설정합니다.`, data: { featured_rank: (member.teacher as { featured_rank: number | null }).featured_rank }, expected: { featured_rank: (member.teacher as { featured_rank: number | null }).featured_rank } })}>메인 노출 설정</button></section>}
      </>}
      {!memberMode && <>
        <RecordFields row={row} />
        {rowAction && <button className={button} onClick={() => onAction(rowAction)}>{rowAction.title}</button>}
        {section === 'tickets' && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => onAction({ kind: 'support_ticket', id: row.id, title: '신고·문의 처리', description: String(row.title), data: { status: row.status, response: row.response, internal_note: row.internal_note }, expected: { updated_at: row.updated_at } })}>답변·처리 상태 변경</button><button className={button} onClick={() => onRelated('members', String(row.requester_id), String(row.requester_name))}>접수자 정보</button></div>}
        {section !== 'audit' && <div className="flex flex-wrap gap-2">
          {row.student_id ? <button className={button} onClick={() => onRelated('students', String(row.student_id), String(row.student_name || '학생'))}>학생 정보 확인</button> : null}
          {row.teacher_id ? <button className={button} onClick={() => onRelated('teachers', String(row.teacher_id), String(row.teacher_name || '선생님'))}>선생님 정보 확인</button> : null}
        </div>}
        {section === 'audit' && <div className="grid gap-6 sm:grid-cols-2"><section><h3 className="font-bold">변경 전</h3><RecordFields row={(row.before_data || {}) as Record<string, unknown>} /></section><section><h3 className="font-bold">변경 후</h3><RecordFields row={(row.after_data || {}) as Record<string, unknown>} /></section></div>}
      </>}
    </AdminModal>
  );
}

export function AdminActionDialog({ action, onClose, onSaved }: { action: AdminAction; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState(action.data);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useAlertState<string>('');
  const input = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || reason.trim().length < 3) return;
    setSaving(true); setError('');
    try {
      const { error: saveError } = await createClient().rpc('admin_mutate', { p_action: action.kind, p_id: action.id, p_data: data, p_reason: reason.trim(), p_expected: action.expected });
      if (saveError) {
        setError(saveError.code === '40001' ? '다른 작업에서 변경된 정보입니다. 창을 닫고 새로고침 후 다시 시도해주세요.' : saveError.code === '42501' ? '관리자 권한을 확인할 수 없습니다. 다시 로그인해주세요.' : '저장하지 못했습니다. 입력값을 확인하고 다시 시도해주세요.');
        return;
      }
      onSaved();
    } catch { setError('연결에 실패했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setSaving(false); }
  };
  return <AdminModal title={action.title} onClose={() => { if (!saving) onClose(); }}>
    <form onSubmit={save} className="space-y-5">
      <p className="rounded-xl bg-slate-50 p-4 text-sm">{action.description}</p>
      {action.kind === 'profile' && <>
        <label className="block text-sm font-semibold">이름<input required maxLength={80} className={input} value={String(data.name)} onChange={(e) => setData({ ...data, name: e.target.value })} /></label>
        <label className="block text-sm font-semibold">모국어<input maxLength={80} className={input} value={String(data.native_language)} onChange={(e) => setData({ ...data, native_language: e.target.value })} /></label>
        <label className="block text-sm font-semibold">한국어 수준<select className={input} value={String(data.korean_level)} onChange={(e) => setData({ ...data, korean_level: e.target.value })}>{['beginner', 'elementary', 'intermediate', 'advanced', 'topik1', 'topik2'].map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
      </>}
      {(action.kind === 'teacher_review' || action.kind === 'support_ticket') && <>
        <label className="block text-sm font-semibold">처리 상태<select required className={input} value={String(data.status)} onChange={(e) => setData({ ...data, status: e.target.value })}>{(action.kind === 'teacher_review' ? ['review_pending', 'needs_changes', 'approved', 'review_rejected'] : ['ticket_open', 'ticket_processing', 'ticket_resolved']).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
        {action.kind === 'teacher_review' ? <label className="block text-sm font-semibold">선생님에게 공개되는 심사 안내<textarea className={input} rows={4} maxLength={2000} required={['needs_changes', 'review_rejected'].includes(String(data.status))} minLength={['needs_changes', 'review_rejected'].includes(String(data.status)) ? 3 : undefined} value={String(data.feedback || '')} onChange={(e) => setData({ ...data, feedback: e.target.value })} /><span className="text-xs text-slate-500">보완 요청·반려 시 사유와 수정할 내용을 3자 이상 안내해주세요.</span></label> : <label className="block text-sm font-semibold">회원에게 공개되는 답변<textarea className={input} rows={6} maxLength={5000} required={data.status === 'ticket_resolved'} minLength={data.status === 'ticket_resolved' ? 3 : undefined} value={String(data.response || '')} onChange={(e) => setData({ ...data, response: e.target.value })} /><span className="text-xs text-slate-500">저장 즉시 고객센터 내 접수 내역에 표시됩니다. 처리 완료 시 답변은 필수입니다.</span></label>}
        <label className="block text-sm font-semibold">관리자 내부 메모<textarea className={input} rows={3} maxLength={2000} value={String(data.internal_note || '')} onChange={(e) => setData({ ...data, internal_note: e.target.value })} /><span className="text-xs text-slate-500">회원에게 공개되지 않습니다.</span></label>
      </>}
      {action.kind === 'note' && <label className="block text-sm font-semibold">관리 메모<textarea rows={6} maxLength={2000} className={input} value={String(data.note)} onChange={(e) => setData({ ...data, note: e.target.value })} /><span className="text-xs text-slate-500">{String(data.note).length}/2,000자 · 학생과 선생님에게 공개되지 않습니다.</span></label>}
      {action.kind === 'teacher_featured' && <>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={data.featured_rank != null} onChange={(e) => setData({ ...data, featured_rank: e.target.checked ? Number(data.featured_rank) || 1 : null })} />
          메인 화면 &quot;오늘의 추천 선생님&quot;에 노출
        </label>
        {data.featured_rank != null && <label className="block text-sm font-semibold">노출 순서 (작을수록 먼저 표시)<input type="number" min={1} max={999} required className={input} value={String(data.featured_rank)} onChange={(e) => setData({ ...data, featured_rank: Number(e.target.value) })} /></label>}
      </>}
      {action.kind === 'home_banner' && <>
        <label className="block text-sm font-semibold">태그 문구 (예: LIVE)<input maxLength={20} className={input} value={String(data.tag || '')} onChange={(e) => setData({ ...data, tag: e.target.value })} /></label>
        <label className="block text-sm font-semibold">제목<textarea required rows={2} maxLength={100} className={input} value={String(data.title)} onChange={(e) => setData({ ...data, title: e.target.value })} /><span className="text-xs text-slate-500">줄바꿈하면 화면에서 두 줄로 표시됩니다.</span></label>
        <label className="block text-sm font-semibold">버튼 문구<input required maxLength={30} className={input} value={String(data.cta_label)} onChange={(e) => setData({ ...data, cta_label: e.target.value })} /></label>
        <label className="block text-sm font-semibold">버튼 이동 경로<input required maxLength={200} className={input} value={String(data.cta_href)} onChange={(e) => setData({ ...data, cta_href: e.target.value })} placeholder="/student/search" /></label>
        <label className="block text-sm font-semibold">배경 이미지<select className={input} value={String(data.image_scene)} onChange={(e) => setData({ ...data, image_scene: e.target.value })}>{(['seoul', 'cafe', 'desk'] as const).map((scene) => <option key={scene} value={scene}>{STATUS_LABELS[scene]}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(data.is_active)} onChange={(e) => setData({ ...data, is_active: e.target.checked })} />메인 화면에 배너 노출</label>
      </>}
      <label className="block text-sm font-semibold">변경 사유<textarea required minLength={3} maxLength={500} rows={3} className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="변경 이유를 3자 이상 입력해주세요." /></label>
      <p className="text-xs text-slate-500">저장하면 변경 전후 내용과 사유가 관리 변경 이력에 기록됩니다.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-lg border px-5 text-sm disabled:opacity-50">취소</button><button type="submit" disabled={saving || reason.trim().length < 3} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? '저장 중...' : '변경 저장'}</button></div>
    </form>
  </AdminModal>;
}
