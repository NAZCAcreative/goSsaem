'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAuthStore} from '@/stores/auth-store';
import {getMyRecommendations,getMatchingProfile,type LessonRecommendation} from '@/lib/queries/matching';
import {LessonCard} from './LessonCard';
export function LessonRecommendations(){
 const id=useAuthStore(s=>s.user?.id);
 return <RecommendationResults key={id || 'guest'} />;
}
function RecommendationResults(){
 const user=useAuthStore(s=>s.user);
 const [rows,setRows]=useState<LessonRecommendation[]>([]),[enabled,setEnabled]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{if(user?.role!=='student')return;let cancelled=false;setLoading(true);setError('');setRows([]);setEnabled(false);Promise.all([getMatchingProfile(user.id),getMyRecommendations()]).then(([profile,data])=>{if(!cancelled){setEnabled(!!profile?.matching_enabled);setRows(data);}}).catch(cause=>{if(!cancelled)setError(cause.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[user,revision]);
 if(user?.role!=='student')return null;
 return <section aria-label="맞춤 수업 추천"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">나에게 맞는 수업</h2><p className="mt-2 text-xs text-on-surface-variant">직접 작성한 관심사와 학습 목표를 바탕으로 추천해요.</p></div><Link href="/student/profile/matching" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">매칭 프로필 설정 →</Link></div>{loading?<p role="status" className="py-5 text-sm">맞춤 추천을 확인하고 있어요…</p>:error?<div role="alert" className="rounded-xl bg-error-container/30 p-5 text-sm">{error}<button className="ml-3 min-h-11 text-primary" onClick={()=>setRevision(x=>x+1)}>추천 다시 불러오기</button></div>:rows.length?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{rows.map(row=><div key={row.lesson.id} className="min-w-0"><div className="mb-3 rounded-xl bg-secondary/10 p-3"><p className="mb-2 text-xs font-bold text-secondary">이런 점이 잘 맞아요</p><ul className="space-y-1 text-xs leading-relaxed text-on-surface-variant">{row.reasons.slice(0,4).map(reason=><li key={reason}>{reason}</li>)}</ul></div><LessonCard lesson={row.lesson}/></div>)}</div>:<div className="rounded-2xl border border-dashed border-primary/20 bg-white p-6"><p className="text-sm leading-relaxed text-on-surface-variant">{enabled?'아직 조건이 맞는 공개 수업이 없습니다. 선생님이 매칭 프로필과 수업을 등록하면 이곳에 추천이 표시됩니다.':'언어 수준과 관심사를 작성하고 맞춤 추천을 켜보세요. 수업을 추천하는 이유도 함께 확인할 수 있습니다.'}</p><Link href={enabled?'/student/search':'/student/profile/matching'} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary">{enabled?'전체 수업 둘러보기 →':'내 취향 설정하기 →'}</Link></div>}</section>;
}
