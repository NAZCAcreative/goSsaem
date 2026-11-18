'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminDisplay, type AdminAction } from '@/lib/admin';

const fields = {title:'수업명',description:'소개',category:'카테고리',level:'난이도',price:'가격',capacity:'정원'} as const;
type Field = keyof typeof fields;
type Lesson = Record<Field,string | number> & {id:string;teacher_id:string;updated_at:string;is_published:boolean;scheduling_mode:string;currency:string};
type Entry = {action:string;reason:string;actor:string;time:string;before:Record<string,unknown>|null;after:Record<string,unknown>|null};
type Detail = {lesson:Lesson;available:boolean;visible:boolean;sessions:{id:string;time:string;capacity:number;students:{name:string;status:string}[]}[];history:Entry[]};
const actions:Record<string,string> = {lesson_request:'수정 요청',lesson_submitted:'수정 제출',lesson_reviewed:'확인 완료',lesson_edit:'수업 정보 수정',lesson_published:'공개 상태 변경'};
const button='inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50';
const primary='min-h-11 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50';

export function AdminLessonDetail({id,publish,onPublish,onSaved}:{id:string;publish:AdminAction|null;onPublish:(a:AdminAction)=>void;onSaved:()=>void}) {
  const [detail,setDetail]=useState<Detail|null>(null);
  const [revision,reload]=useState(0);
  const [mode,setMode]=useState('');
  const [reason,setReason]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    let active=true;
    createClient().rpc('admin_lesson_detail',{p_id:id}).then(({data,error})=>{
      if(!active)return;
      if(error)setError('수업 정보를 불러오지 못했습니다.');
      else setDetail(data as unknown as Detail);
    });
    return ()=>{active=false};
  },[id,revision]);
  if(!detail)return error?<p role="alert">{error} <button className={button} onClick={()=>{setError('');reload(v=>v+1)}}>다시 시도</button></p>:<p role="status">수업 정보를 불러오는 중…</p>;
  const {lesson:l,sessions,history}=detail;
  const workflow=history.find(h=>['lesson_request','lesson_submitted','lesson_reviewed'].includes(h.action))?.action;
  const confirmed=sessions.reduce((n,s)=>n+s.students.filter(p=>p.status==='confirmed').length,0);
  const status=!l.is_published?'비공개':!detail.visible?'선생님 비노출':detail.available?(l.scheduling_mode==='request'?'신청 접수 중':'예약 가능'):'예약 가능한 시간 없음';
  const selectMode=(value:string)=>{setMode(value);setReason('');setError('')};
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(saving)return;
    const data=Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);setError('');
    try {
      const result=await createClient().rpc('admin_lesson_change',{p_id:id,p_expected:l.updated_at,p_action:mode,p_reason:reason,p_data:JSON.parse(JSON.stringify(data))});
      if(result.error){setError(result.error.code==='40001'?'수업 정보가 변경됐습니다. 창을 다시 열어주세요.':result.error.code==='P0002'?'결제 대기 중인 예약이 있어 가격을 변경할 수 없습니다.':'저장하지 못했습니다. 입력값과 현재 처리 상태를 확인해주세요.');return}
      onSaved();
    }catch{setError('연결에 실패했습니다. 다시 시도해주세요.')}finally{setSaving(false)}
  }
  return <>
    <section className="space-y-2 rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold">{status} · 오늘부터 14일 기준</p>
      <h3 className="break-words text-xl font-bold">{l.title}</h3>
      <p>{l.category} · {l.level} · {l.scheduling_mode==='request'?'학생 신청형':'시간 확정형'}</p>
      <p>{adminDisplay('price',l.price,l)} · 정원 {l.capacity}명</p>
      <p className="whitespace-pre-wrap break-words">{l.description}</p>
      {l.is_published && detail.visible && <a className={button} target="_blank" rel="noreferrer" href={'/teachers/'+l.teacher_id+'#lesson-'+id}>학생 화면 보기 ↗</a>}
    </section>
    <section><h3 className="mb-2 font-bold">예정 회차 {sessions.length}개 · 확정 예약 {confirmed}건</h3>
      {sessions.length===0 && <p>예정된 회차가 없습니다.</p>}
      {sessions.map(s=><details key={s.id} className="rounded-lg border p-3"><summary className="cursor-pointer">{adminDisplay('created_at',s.time)} · {s.students.length}/{s.capacity}명 {s.students.length>=s.capacity?'· 정원 마감':''}</summary>
        <ul className="mt-2 text-sm">{s.students.map((p,i)=><li key={i}>{p.name} · {adminDisplay('status',p.status)}</li>)}</ul>{!s.students.length && <p>예약자가 없습니다.</p>}</details>)}
    </section>
    <details><summary className="cursor-pointer font-bold">변경 이력 {history.length}건</summary>
      {history.map((h,i)=><div key={i} className="border-b py-2 text-sm"><strong>{actions[h.action]||h.action}</strong> · {h.actor} · {adminDisplay('created_at',h.time)}<p>{h.reason}</p>
        {Object.entries({...fields,is_published:'공개 상태'}).filter(([key])=>h.before?.[key]!==h.after?.[key]).map(([key,label])=><p key={key} className="break-words">{label} · {adminDisplay(key,h.before?.[key])} → {adminDisplay(key,h.after?.[key])}</p>)}</div>)}
    </details>
    {workflow && <p>최근 수정 요청 상태 · {actions[workflow]}</p>}
    {!mode?<div className="grid gap-2 border-t pt-4 sm:flex sm:flex-wrap sm:justify-end">
      {publish && <button className={button} onClick={()=>onPublish({...publish,description:publish.description+' 예정 회차 '+sessions.length+'개 · 확정 예약 '+confirmed+'건.'})}>{publish.title}</button>}
      {workflow!=='lesson_request' && <button className={button} onClick={()=>selectMode('lesson_request')}>선생님에게 수정 요청</button>}
      {workflow==='lesson_submitted' && <button className={button} onClick={()=>selectMode('lesson_reviewed')}>수정 확인 완료</button>}
      <button className={primary} onClick={()=>selectMode('lesson_edit')}>수업 정보 수정</button>
    </div>:<form onSubmit={save} className="space-y-3 border-t pt-4"><h3 className="font-bold">{actions[mode]}</h3>
      {mode==='lesson_edit' && <>{Object.entries(fields).map(([key,label])=><label key={key} className="block text-sm">{label}{key==='description'?<textarea name={key} defaultValue={l.description||''} className="block w-full rounded-lg border p-2"/>:<input name={key} defaultValue={l[key as Field]??''} required={key!=='level'} type={['price','capacity'].includes(key)?'number':'text'} min={key==='capacity'?1:0} className="block min-h-11 w-full rounded-lg border px-3"/>}</label>)}<p className="text-sm">정원은 새 회차에 적용됩니다. 이미 결제된 금액은 유지됩니다.</p></>}
      <label className="block text-sm">{mode==='lesson_request'?'선생님에게 전달할 수정 항목과 사유':'처리 사유'}<textarea required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="block w-full rounded-lg border p-2"/></label>
      {error && <p role="alert">{error}</p>}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end"><button type="button" disabled={saving} className={button} onClick={()=>selectMode('')}>취소</button><button disabled={saving||reason.trim().length<3} className={primary}>{saving?'저장 중…':'저장'}</button></div>
    </form>}
  </>;
}
