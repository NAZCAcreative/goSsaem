'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileClip({path,url,title}:{path?:string|null;url?:string;title:string}) {
  const [source,setSource]=useState('');
  const [failed,setFailed]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    setFailed(false);setSource('');
    if(path)createClient().storage.from('profile-clips').createSignedUrl(path,60).then(({data,error})=>{
      if(active){if(error)setFailed(true);else setSource(data.signedUrl)}
    }).catch(()=>{if(active)setFailed(true)});
    else if(url?.startsWith('https://'))setSource(url);
    return ()=>{active=false};
  },[path,url,retry]);
  return failed?<p role="alert">영상을 재생하지 못했습니다. <button type="button" className="min-h-11 underline" onClick={()=>setRetry(n=>n+1)}>다시 시도</button></p>
    :source?<video controls muted autoPlay playsInline preload="metadata" src={source} aria-label={title} onError={()=>setFailed(true)} className="mt-2 max-h-80 w-full rounded-lg bg-black"/>:null;
}

export async function uploadProfileClip(file:File,teacherId:string,maxSeconds:number,onProgress:(percent:number)=>void){
  if(!['video/mp4','video/webm'].includes(file.type)||file.size<=0||file.size>50*1024*1024)throw new Error('MP4 또는 WebM 영상을 50MB 이하로 선택해주세요.');
  const header=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const validHeader=file.type==='video/mp4'?String.fromCharCode(...header.slice(4,8))==='ftyp':[0x1a,0x45,0xdf,0xa3].every((byte,i)=>header[i]===byte);
  if(!validHeader)throw new Error('영상 형식과 파일 내용이 일치하지 않습니다.');
  const objectUrl=URL.createObjectURL(file);
  try{
    await new Promise<void>((resolve,reject)=>{
      const video=document.createElement('video');video.preload='metadata';
      const finish=(ok:boolean)=>{clearTimeout(timer);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load();if(ok)resolve();else reject(new Error('재생 가능한 '+maxSeconds+'초 이하의 영상을 선택해주세요.'))};
      const timer=setTimeout(()=>finish(false),10000);
      video.onloadedmetadata=()=>finish(Number.isFinite(video.duration)&&video.duration>0&&video.duration<=maxSeconds);
      video.onerror=()=>finish(false);video.src=objectUrl;
    });
  }finally{URL.revokeObjectURL(objectUrl)}
  const {data}=await createClient().auth.getSession();
  if(data.session?.user.id!==teacherId)throw new Error('다시 로그인해주세요.');
  const path=teacherId+'/'+crypto.randomUUID()+(file.type==='video/mp4'?'.mp4':'.webm');
  const token=data.session.access_token;
  await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/profile-clips/'+path);
    xhr.setRequestHeader('Authorization','Bearer '+token);xhr.setRequestHeader('apikey',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);xhr.setRequestHeader('Content-Type',file.type);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(100*e.loaded/e.total))};
    xhr.timeout=120000;
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('업로드하지 못했습니다. 다시 시도해주세요.'));
    xhr.onerror=xhr.ontimeout=()=>reject(new Error('영상 연결이 끊겼습니다. 다시 시도해주세요.'));xhr.send(file);
  });
  return path;
}