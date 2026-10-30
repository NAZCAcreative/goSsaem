'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';
import { AdminActionDialog, AdminDetail } from './AdminDialogs';
import { AdminIcon } from './AdminIcon';
import {
  ADMIN_COLUMNS, ADMIN_FILTERS, ADMIN_SECTIONS, ADMIN_NAVIGATION, STATUS_LABELS, adminDisplay,
  type AdminAction, type AdminDashboard, type AdminList, type AdminRow, type AdminSection,
} from '@/lib/admin';

const fieldClass = 'min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

function rowAction(section: AdminSection, row: AdminRow): AdminAction | null {
  if (section === 'lessons') return { kind: 'lesson_published', id: row.id, title: row.is_published ? '수업 비공개 전환' : '수업 공개', description: `「${String(row.title)}」 수업을 ${row.is_published ? '비공개로 전환' : '공개'}합니다. 기존 예약 내역은 유지됩니다.`, data: { is_published: !row.is_published }, expected: { is_published: row.is_published } };
  if (section === 'coupons') return { kind: 'coupon_active', id: row.id, title: row.is_active ? '쿠폰 사용 중지' : '쿠폰 사용 허용', description: `「${String(row.title)}」 쿠폰의 사용을 ${row.is_active ? '중지' : '허용'}합니다. 만료일 조건은 그대로 적용됩니다.`, data: { is_active: !row.is_active }, expected: { is_active: row.is_active } };
  return null;
}

function Badge({ children, positive = false }: { children: React.ReactNode; positive?: boolean }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{children}</span>;
}

function Cell({ row, column }: { row: AdminRow; column: string }) {
  const value = row[column];
  if (['review_status', 'status', 'is_verified', 'is_published', 'is_active'].includes(column)) return <Badge positive={value === true || ['approved', 'ticket_resolved', 'confirmed', 'succeeded', 'paid', 'completed'].includes(String(value))}>{adminDisplay(column, value, row)}</Badge>;
  if (column === 'name') return <div className="flex items-center gap-3">
    {row.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(row.avatar_url)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full bg-slate-100 object-cover object-top" />
    ) : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{String(value).slice(0, 1)}</span>}
    <span className="font-bold text-slate-900">{String(value)}</span>
  </div>;
  return <span title={adminDisplay(column, value, row)} className={`block ${['text', 'teacher_reply', 'specialties', 'title', 'reason', 'email'].includes(column) ? 'max-w-[240px] truncate' : ''}`}>{adminDisplay(column, value, row)}</span>;
}

function Overview({ data, navigate }: { data: AdminDashboard; navigate: (section: AdminSection, status?: string) => void }) {
  const metrics: { label: string; value: number; caption: string; section: AdminSection; icon: string; tone: string }[] = [
    { label: '전체 회원', value: data.members, caption: `최근 7일 신규 ${data.newMembers}명`, section: 'members', icon: 'groups', tone: 'bg-blue-50 text-blue-600' },
    { label: '학생 계정', value: data.students, caption: '학생으로 가입한 회원', section: 'students', icon: 'person', tone: 'bg-violet-50 text-violet-600' },
    { label: '선생님 계정', value: data.teachers, caption: `심사 대기 ${data.unverifiedTeachers}명`, section: 'teachers', icon: 'school', tone: 'bg-emerald-50 text-emerald-600' },
    { label: '수업 상품', value: data.lessons, caption: `비공개 ${data.unpublishedLessons}개`, section: 'lessons', icon: 'menu_book', tone: 'bg-orange-50 text-orange-600' },
  ];
  const tasks: { label: string; value: number; section: AdminSection; status: string; description: string }[] = [
    { label: '선생님 심사 대기', value: data.unverifiedTeachers, section: 'teachers', status: 'review_pending', description: '프로필과 소개를 확인하고 인증을 승인하세요.' },
    { label: '새 신고·문의', value: data.openTickets, section: 'tickets', status: 'ticket_open', description: '접수 내용을 확인하고 답변을 작성하세요.' },
    { label: '처리 중인 신고·문의', value: data.processingTickets, section: 'tickets', status: 'ticket_processing', description: '진행 중인 상담과 후속 조치를 확인하세요.' },
    { label: '결제 대기 예약', value: data.pendingBookings, section: 'bookings', status: 'pending_payment', description: '결제가 아직 완료되지 않은 예약입니다.' },
    { label: '결제 확인', value: data.pendingPayments, section: 'payments', status: 'pending', description: '결제사 확인이 필요한 대기 내역입니다.' },
    { label: '정산 대기', value: data.pendingSettlements, section: 'settlements', status: 'pending', description: '정산 기간과 금액을 확인하세요.' },
    { label: '출금 확인', value: data.pendingWithdrawals, section: 'withdrawals', status: '', description: '요청 또는 처리 중인 출금 내역을 확인하세요.' },
    { label: '낮은 평점 리뷰', value: data.lowReviews, section: 'reviews', status: 'low', description: '별점 2점 이하 리뷰와 답변을 확인하세요.' },
  ];
  return <div className="space-y-6">
    {data.systemJobs && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 font-bold">자동 처리 작업</h2><div className="space-y-2">{data.systemJobs.map(job => <p key={job.jobname} className={`text-sm ${job.status === 'failed' || !job.active ? 'text-red-700' : 'text-slate-600'}`}>{job.jobname === 'weekly-settlement' ? '주간 정산' : '예약 만료·수업 알림'} · {job.active ? '실행 예약됨' : '중지됨'} · 최근 기록: {job.status === 'succeeded' ? '성공' : job.status === 'failed' ? '실패 — 점검 필요' : job.status || '아직 없음'} {job.start_time && adminDisplay('created_at', job.start_time)}</p>)}</div></section>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((item) => <button key={item.label} onClick={() => navigate(item.section)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md">
      <span className={`mb-4 inline-flex rounded-xl p-2.5 ${item.tone}`}><AdminIcon name={item.icon} /></span>
      <span className="block text-sm font-medium text-slate-500">{item.label}</span><span className="mt-1 block text-3xl font-extrabold tracking-tight text-slate-900">{item.value.toLocaleString()}</span><span className="mt-2 block text-xs text-slate-500">{item.caption}</span>
    </button>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2"><AdminIcon name="task_alt" className="text-primary" /><h2 className="text-lg font-bold">확인이 필요한 항목</h2></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tasks.map((item) => <button key={item.label} onClick={() => navigate(item.section, item.status)} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5">
        <span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span><span className={`rounded-lg px-2.5 py-1 text-lg font-bold ${item.value ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}>{item.value}</span></span><span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.description}</span>
      </button>)}</div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-bold">검증된 결제 현황 · 전체 기간</h2>{data.revenue.length ? data.revenue.map((item) => <div key={item.currency} className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 py-3"><div><p className="text-xs text-slate-500">결제 완료 · {item.currency}</p><p className="mt-1 text-2xl font-bold">{item.succeeded.toLocaleString()} <span className="text-sm font-normal">{item.currency}</span></p></div><p className="text-sm text-slate-500">환불 {item.refunded.toLocaleString()} {item.currency}</p></div>) : <p className="text-sm text-slate-500">아직 결제 내역이 없습니다.</p>}<button className={`${buttonClass} mt-4`} onClick={() => navigate('payments')}>결제 내역 보기</button></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-bold">운영 점검</h2><dl className="space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">앞으로 7일 예정 수업</dt><dd className="font-bold">{data.upcomingSessions}건</dd></div><div className="flex justify-between"><dt className="text-slate-500">사진 미등록 선생님</dt><dd className="font-bold">{data.missingPortraits}명</dd></div><div className="flex justify-between"><dt className="text-slate-500">관리자</dt><dd className="font-bold">박대건</dd></div></dl><p className="mt-5 text-xs leading-relaxed text-slate-500">학생과 선생님은 가입한 계정 유형으로 구분합니다. 계정 유형은 변경할 수 없습니다. 결제·정산 금액은 저장된 처리 상태를 기준으로 집계합니다.</p><p className="mt-2 text-xs text-slate-400">갱신: {adminDisplay('generated_at', data.generatedAt)}</p></section>
    </div>
  </div>;
}

export function AdminConsole() {
  const accountRole = useAuthStore((state) => state.user?.role);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const section = (ADMIN_SECTIONS.some((item) => item.id === params.get('section')) ? params.get('section') : 'dashboard') as AdminSection;
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const memberId = params.get('member') || '';
  const memberName = params.get('memberName') || '';
  const requestedPage = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = [10, 20, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20;
  const [search, setSearch] = useState(q);
  const [list, setList] = useState<AdminList | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminRow | null>(null);
  const [action, setAction] = useState<AdminAction | null>(null);
  const memberSection = ['members', 'students', 'teachers'].includes(section);
  const navSection = memberSection ? 'members' : section;
  const current = ADMIN_SECTIONS.find((item) => item.id === section)!;
  useEffect(() => { setSearch(q); }, [q]);

  const update = (changes: Record<string, string>, reset = false) => {
    const next = reset ? new URLSearchParams() : new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    if (!('page' in changes)) next.delete('page');
    setDetail(null); setAction(null);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const navigate = (target: AdminSection, filter = '') => update({ section: target, status: filter }, true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setList(null); setDashboard(null);
    const load = async () => {
      try {
        if (from && to && from > to) throw new Error('시작일은 종료일보다 이전이어야 합니다.');
        const db = createClient();
        const response = section === 'dashboard' ? await db.rpc('admin_dashboard') : await db.rpc('admin_list', {
          p_section: section, p_page: Math.min(2147483647, Math.floor(requestedPage)), p_page_size: pageSize,
          p_query: q, p_status: status, p_from: from || null, p_to: to || null, p_member_id: memberId || null,
        });
        if (response.error) throw new Error(response.error.code === '42501' ? '관리자 권한을 확인할 수 없습니다. 박대건 계정으로 다시 로그인해주세요.' : '목록을 불러오지 못했습니다. 조건을 확인하거나 다시 시도해주세요.');
        if (cancelled) return;
        if (section === 'dashboard') setDashboard(response.data as AdminDashboard);
        else setList(response.data as AdminList);
      } catch (loadError) { if (!cancelled) setError(loadError instanceof Error ? loadError.message : '조회에 실패했습니다.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [section, requestedPage, pageSize, q, status, from, to, memberId, refresh]);

  const exportPage = () => {
    if (!list || section === 'dashboard') return;
    const columns = ADMIN_COLUMNS[section];
    const escape = (text: string) => `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
    const csv = '\uFEFF' + [columns.map(([, label]) => escape(label)).join(','), ...list.rows.map((row) => columns.map(([key]) => escape(adminDisplay(key, row[key], row))).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `admin-${section}-page-${list.page}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const page = list?.page || 1;
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageButtons = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index);
  const filtered = Boolean(q || status || from || to || memberId);

  return <main className="min-h-screen bg-slate-50 pb-28 text-slate-800">
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[0.16em] text-primary">GoSsaem ADMIN</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">운영 관리</h1><p className="mt-1 text-sm text-slate-500">회원부터 수업까지, 필요한 정보를 한곳에서 확인하세요.</p></div>
        <div className="flex gap-2"><Link className={buttonClass} href={accountRole === 'teacher' ? '/teacher/profile' : '/student/profile'}><AdminIcon name="person" />내 계정으로 돌아가기</Link><button className={buttonClass} disabled={loading} onClick={() => setRefresh((value) => value + 1)}><AdminIcon name="refresh" />새로고침</button></div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <label className="block lg:hidden"><span className="mb-2 block text-sm font-bold">관리 메뉴</span><select className={`${fieldClass} w-full`} value={navSection} onChange={(e) => navigate(e.target.value as AdminSection)}>{ADMIN_NAVIGATION.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <nav aria-label="관리자 메뉴" className="hidden rounded-2xl border border-slate-200 bg-white p-3 lg:block">{ADMIN_NAVIGATION.map((item, index) => <div key={item.id}>
            {(!index || item.group !== ADMIN_NAVIGATION[index - 1].group) && <p className="px-3 pb-2 pt-4 text-[11px] font-bold text-slate-400">{item.group}</p>}
            <button onClick={() => navigate(item.id)} aria-current={navSection === item.id ? 'page' : undefined} className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors ${navSection === item.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}><AdminIcon name={item.icon} />{item.label}</button>
          </div>)}</nav>
        </aside>
        <div className="min-w-0 space-y-5">
          <div><h2 className="text-xl font-bold">{current.label}</h2><p className="mt-1 text-sm text-slate-500">{section === 'dashboard' ? '실시간 DB 기준 운영 현황입니다.' : section === 'students' ? '학생 계정으로 가입한 회원을 관리합니다.' : section === 'teachers' ? '선생님 프로필, 인증 상태와 수업 활동을 관리합니다.' : ['payments', 'settlements', 'withdrawals'].includes(section) ? '저장된 처리 내역을 조회합니다. 이 화면의 조회는 실제 결제·송금을 실행하지 않습니다.' : '검색과 필터로 확인할 항목을 좁혀보세요.'}</p></div>
          {memberSection && <nav aria-label="계정 유형별 목록 필터" className="flex gap-2 rounded-xl border bg-white p-2">{(['members', 'students', 'teachers'] as const).map((tab) => <button key={tab} aria-current={section === tab ? 'page' : undefined} onClick={() => navigate(tab)} className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-bold ${section === tab ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{tab === 'members' ? '전체 회원' : tab === 'students' ? '학생' : '선생님'}</button>)}</nav>}
          {section !== 'dashboard' && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <form onSubmit={(event) => { event.preventDefault(); update({ q: search.trim() }); }} className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">이름, 이메일, 제목 또는 ID 검색</span><input className={`${fieldClass} w-full`} maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={['members', 'students', 'teachers'].includes(section) ? '이름, 이메일, 전문 분야 또는 ID 검색' : '이름, 제목, 내용 또는 ID 검색'} /></label><button className="min-h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-bold text-white" type="submit">검색</button></form>
            <div className="flex flex-wrap items-end gap-3">
              {ADMIN_FILTERS[section] && <label className="text-xs font-medium text-slate-500"><span className="mb-1 block">상태</span><select className={fieldClass} value={status} onChange={(e) => update({ status: e.target.value })}><option value="">전체 상태</option>{ADMIN_FILTERS[section]!.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>}
              <label className="text-xs font-medium text-slate-500"><span className="mb-1 block">등록·생성일 시작 (한국 시간)</span><input aria-label="등록일 시작" type="date" className={fieldClass} value={from} onChange={(e) => update({ from: e.target.value })} /></label>
              <label className="text-xs font-medium text-slate-500"><span className="mb-1 block">종료</span><input aria-label="등록일 종료" type="date" className={fieldClass} value={to} onChange={(e) => update({ to: e.target.value })} /></label>
              <label className="text-xs font-medium text-slate-500"><span className="mb-1 block">페이지당</span><select className={fieldClass} value={pageSize} onChange={(e) => update({ size: e.target.value })}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}개</option>)}</select></label>
              {filtered && <button className={buttonClass} onClick={() => navigate(section)}>필터 초기화</button>}
            </div>
            {memberId && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary"><span>{memberName || memberId} 회원 관련 내역</span><button aria-label="회원 필터 해제" className="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10" onClick={() => update({ member: '', memberName: '' })}>×</button></div>}
          </section>}
          {loading && <div role="status" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6"><p className="mb-4 text-sm text-slate-500">최신 데이터를 불러오는 중...</p>{[0, 1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>}
          {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-6"><p className="text-sm text-red-700">{error}</p><button className={`${buttonClass} mt-4`} onClick={() => setRefresh((value) => value + 1)}>다시 시도</button></div>}
          {!loading && dashboard && <Overview data={dashboard} navigate={navigate} />}
          {!loading && list && section !== 'dashboard' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><p role="status" className="text-sm text-slate-500">총 <strong className="text-slate-900">{list.total.toLocaleString()}</strong>건 · {list.total ? (page - 1) * list.pageSize + 1 : 0}–{Math.min(page * list.pageSize, list.total)} 표시</p><button className={buttonClass} disabled={!list.rows.length} onClick={exportPage}><AdminIcon name="download" />현재 페이지 CSV</button></div>
            {!list.rows.length ? <div className="px-6 py-16 text-center"><AdminIcon name="search_off" className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold">{filtered ? '조건에 맞는 데이터가 없습니다.' : '아직 등록된 데이터가 없습니다.'}</p>{filtered && <button className={`${buttonClass} mt-4`} onClick={() => navigate(section)}>전체 목록 보기</button>}</div> : <>
              <p className="px-5 pt-3 text-xs text-slate-400 lg:hidden">표를 좌우로 움직여 전체 항목을 확인하세요.</p>
              <div tabIndex={0} role="region" aria-label={`${current.label} 목록`} className="overflow-x-auto focus-visible:outline focus-visible:outline-primary">
                <table className="w-full whitespace-nowrap text-left text-sm"><caption className="sr-only">{current.label} · 최신 등록순</caption><thead className="bg-slate-50 text-xs text-slate-500"><tr>{ADMIN_COLUMNS[section].map(([key, label]) => <th key={key} scope="col" className="px-5 py-3.5 font-semibold">{label}</th>)}<th scope="col" className="sticky right-0 bg-slate-50 px-5 py-3.5 font-semibold">관리</th></tr></thead><tbody className="divide-y divide-slate-100">{list.rows.map((row) => {
                  return <tr key={row.id} className="group hover:bg-slate-50/70">{ADMIN_COLUMNS[section].map(([column]) => <td key={column} className="px-5 py-4"><Cell row={row} column={column} /></td>)}<td className="sticky right-0 border-l border-slate-100 bg-white px-3 py-3 group-hover:bg-slate-50"><div className="flex gap-1"><button className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-100" aria-label={`${String(row.name || row.title || row.id)} 상세 보기`} onClick={() => setDetail(row)}>상세·관리</button></div></td></tr>;
                })}</tbody></table>
              </div>
            </>}
            <nav aria-label="목록 페이지 이동" className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-4">
              <p className="text-sm text-slate-500">{page} / {totalPages.toLocaleString()} 페이지</p>
              <div className="flex flex-wrap items-center gap-1"><button className={`${buttonClass} !px-3`} disabled={page === 1} onClick={() => update({ page: '1' })} aria-label="첫 페이지">«</button><button className={`${buttonClass} !px-3`} disabled={page === 1} onClick={() => update({ page: String(page - 1) })} aria-label="이전 페이지">‹</button>{pageButtons.map((number) => <button key={number} aria-current={page === number ? 'page' : undefined} aria-label={`${number} 페이지`} className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-semibold ${page === number ? 'bg-primary text-white' : 'hover:bg-slate-100'}`} onClick={() => update({ page: String(number) })}>{number}</button>)}<button className={`${buttonClass} !px-3`} disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })} aria-label="다음 페이지">›</button><button className={`${buttonClass} !px-3`} disabled={page >= totalPages} onClick={() => update({ page: String(totalPages) })} aria-label="마지막 페이지">»</button></div>
            </nav>
          </section>}
        </div>
      </div>
    </div>
    {detail && <AdminDetail key={`${section}-${detail.id}`} row={detail} section={section} rowAction={rowAction(section, detail)} onClose={() => setDetail(null)} onAction={(next) => { setDetail(null); setAction(next); }} onRelated={(target, id, name) => update({ section: target, member: id, memberName: name }, true)} />}
    {action && <AdminActionDialog key={`${action.kind}-${action.id}`} action={action} onClose={() => setAction(null)} onSaved={() => { setAction(null); setRefresh((value) => value + 1); showToast('변경 사항을 저장하고 관리 이력에 기록했습니다'); }} />}
  </main>;
}
