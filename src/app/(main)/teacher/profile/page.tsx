/* eslint-disable @next/next/no-img-element -- Existing responsive artwork and user-provided images. */
﻿'use client';
import { TeacherLanguages } from '@/components/features/teacher/TeacherLanguages';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getTeacherDetail, type TeacherDetail } from '@/lib/queries/teachers';
import { listPortfolio, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';
import { PortfolioSections } from '@/components/features/teacher/PortfolioSections';
import { TeacherAccountDates } from '@/components/features/teacher/TeacherAccountDates';
import { PageLoading } from '@/components/shared/PageLoading';
import { showToast } from '@/components/shared/Toast';

export default function TeacherProfilePage() {
  const user = useAuthStore(s => s.user);
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [approved,setApproved]=useState<boolean|null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    Promise.all([getTeacherDetail(user.id), listPortfolio(user.id)]).then(([profile, rows]) => {
      if (!cancelled) { setTeacher(profile); setEntries(rows); }
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, retry]);
  const [activity,setActivity]=useState<{visitors:number;shared:number;clicked:number;booked:number}|null>(null);
  useEffect(()=>{
    if(!user)return;let active=true;
    createClient().rpc('portfolio_teacher_approved',{p_teacher:user.id}).then(({data})=>{if(active)setApproved(data)},()=>{});
    createClient().rpc('my_profile_activity').then(({data})=>{if(active&&data)setActivity(data as unknown as NonNullable<typeof activity>)},()=>{});
    return ()=>{active=false};
  },[user]);
  const share = async () => {
    if (!user || sharing) return;
    let url = window.location.origin + '/teachers/' + user.id;
    setSharing(true);
    try {
      const {data:token}=await createClient().rpc('my_teacher_share_token'); if(token)url+='?via='+token; setShareUrl(url);
      if (navigator.share) await navigator.share({ title: (teacher?.name ?? user.name) + ' 쌤 | GoSsaem', url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); showToast('공개 페이지 링크가 복사되었습니다'); }
    } catch (err) { if (!(err instanceof Error && err.name === 'AbortError')) showToast('아래 링크를 선택해 복사해주세요'); }
    finally { setSharing(false); }
  };
  if (loading) return <PageLoading />;
  if (error || !teacher) return <main className="mx-auto max-w-5xl px-container-margin py-8 pb-32"><p role="alert">내 페이지를 불러오지 못했습니다.</p><button className="min-h-11 text-primary" onClick={() => setRetry(value => value + 1)}>다시 시도</button></main>;
  const publicEntries = entries.filter(entry => entry.is_public);
  const steps = [
    { title: '기본 소개', detail: '한 줄 소개와 전문분야를 정리하세요.', done: !!teacher.headline && !!teacher.bio, href: '/teacher/profile/edit' },
    { title: '취향과 수업 스타일 · 선택', detail: '좋아하는 그룹이나 작품 하나부터 시작해요.', done: entries.some(entry=>['kpop','movie','drama','interest'].includes(entry.kind)), href: '/teacher/profile/portfolio' },
    { title: '수업 판매 준비', detail: '가격·정원·일정을 확인하고 수업을 개설하세요.', done: teacher.minPrice != null, href: '/teacher/lessons' },
  ];
  return <main className="mx-auto max-w-[1200px] space-y-8 px-container-margin pb-32 pt-stack-lg text-on-surface">
      <Link href="/teacher/profile/matching" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"><span><strong className="block text-sm text-on-surface">언어·성향·맞춤 추천 설정</strong><span className="mt-1 block text-xs text-on-surface-variant">언어별 레벨, 관심사, 수업 방식과 MBTI를 설정하세요.</span></span><span className="text-sm font-semibold text-primary">설정하기 →</span></Link>
    <div><p className="text-sm font-semibold text-primary">나의 경험이 다음 기회로</p><h1 className="mt-1 font-headline-lg text-headline-lg">내 페이지</h1><p className="mt-2 text-on-surface-variant">수업을 열기 전에도, 잠시 쉬는 동안에도 나의 전문성을 쌓는 공간입니다.</p></div>
    <TeacherLanguages teacherId={teacher.id} editable />
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        {teacher.avatarUrl ? <img src={teacher.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container text-2xl text-on-primary-container">{teacher.name.slice(0, 1)}</span>}
        <div className="min-w-0"><h2 className="font-headline-lg">{teacher.name} 쌤</h2><p className="mt-1 text-on-surface-variant">{teacher.headline || '어떤 학습자를 어떻게 돕는지 한 줄로 소개해보세요.'}</p><div className="mt-3 flex flex-wrap gap-2">{teacher.specialties.map(item => <span key={item} className="rounded-full bg-secondary-container px-3 py-1 text-xs text-on-secondary-container">{item}</span>)}</div></div>
      </div>
      {user && <TeacherAccountDates key={user.id} joinedAt={user.createdAt} />}
      <div className="mt-6 flex flex-wrap gap-2"><button disabled={sharing} onClick={() => void share()} className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-on-primary disabled:opacity-60">내 페이지 공유</button><Link href={'/teachers/' + teacher.id} className="inline-flex min-h-12 items-center rounded-lg border border-outline-variant/40 px-5 font-semibold">공개 미리보기</Link><Link href="/teacher/profile/edit" className="inline-flex min-h-12 items-center px-4 text-primary">소개 편집</Link></div>
      {shareUrl && <label className="mt-4 block text-sm text-on-surface-variant">공개 페이지 주소<input readOnly value={shareUrl} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-background px-3 py-2" /></label>}
      {approved!==null && <p className="mt-3 text-sm">{approved ? (teacher.minPrice!=null?'승인 완료 · 공개 수업 등록됨':'승인 완료 · 판매할 수업을 등록하세요.') : '심사 승인 전 · 프로필 카드를 미리 준비할 수 있어요.'}</p>}
      <p className="mt-3 text-xs text-on-surface-variant">소개 정보와 공개로 설정한 기록만 공유됩니다. 비공개 기록과 정산 정보는 포함되지 않습니다.</p>
    </section>
    {activity && <section className="rounded-xl border p-5"><h2 className="font-headline-md">최근 30일 학생 유입</h2><p className="mt-2 text-sm">로그인 학생 {activity.visitors}명 · 공유 링크 방문 {activity.shared}명 · 수업 선택 {activity.clicked}명 · 방문 후 예약 확정 {activity.booked}명</p>{activity.visitors>0 && <p className="text-sm">방문 학생 중 예약 비율 {Math.round(activity.booked/activity.visitors*100)}%</p>}</section>}
    <section><h2 className="font-headline-md">내 페이지 채우기</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{steps.map(step => <Link key={step.title} href={step.href} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 transition-colors hover:border-primary"><span className="text-xs font-semibold text-primary">{step.done ? '등록됨 · 업데이트하기' : '시작하기'}</span><h3 className="mt-2 font-semibold">{step.title}</h3><p className="mt-2 text-sm text-on-surface-variant">{step.detail}</p></Link>)}</div></section>
    <div className="space-y-8">
      <section className="min-w-0"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="font-headline-md">공개 중인 나의 기록</h2><Link href="/teacher/profile/portfolio" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">취향·프로필 카드 관리 →</Link></div>{publicEntries.length ? <PortfolioSections entries={publicEntries} /> : <div className="rounded-xl border border-dashed border-outline-variant p-6"><p className="font-semibold">보여주고 싶은 경험부터 시작하세요</p><p className="mt-2 text-sm text-on-surface-variant">좋아하는 그룹·영화·드라마, 수업 스타일과 경험을 저장하고 원하는 카드만 공개하세요.</p><Link href="/teacher/profile/portfolio" className="mt-3 inline-flex min-h-11 items-center text-primary">첫 기록 추가하기 →</Link></div>}<p className="mt-4 text-sm text-on-surface-variant">비공개 기록 {entries.length - publicEntries.length}개는 기록 관리에서 확인할 수 있습니다.</p></section>
    </div>
  </main>;
}
