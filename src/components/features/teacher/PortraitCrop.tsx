'use client';
import {useEffect,useRef,useState} from 'react';

export function PortraitCrop({file,onCancel,onSave,busy}:{file:File;onCancel:()=>void;onSave:(cropped:File)=>Promise<void>;busy:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [image,setImage]=useState<HTMLImageElement|null>(null);
  const [position,setPosition]=useState(50);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;const url=URL.createObjectURL(file);const img=new Image();
    img.onload=()=>{if(active)setImage(img)};img.onerror=()=>{if(active)setError('사진을 읽지 못했습니다. 다른 파일을 선택해주세요.')};img.src=url;
    return ()=>{active=false;URL.revokeObjectURL(url)};
  },[file]);
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d');if(!image||!ctx)return;
    const size=Math.min(image.naturalHeight,image.naturalWidth);
    ctx.drawImage(image,(image.naturalWidth-size)*position/100,(image.naturalHeight-size)*position/100,size,size,0,0,512,512);
  },[image,position]);
  return <div className="space-y-2"><canvas ref={canvas} width={512} height={512} aria-label="자른 사진 미리보기" className="h-32 w-32 rounded-lg"/>
    <label className="block text-sm">사진 위치 <input type="range" min={0} max={100} value={position} onChange={e=>setPosition(+e.target.value)}/></label>
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-4"><button type="button" disabled={busy} className="min-h-11" onClick={onCancel}>취소</button><button type="button" disabled={!image||busy} className="min-h-11 font-semibold text-primary" onClick={()=>canvas.current?.toBlob(blob=>{if(blob)void onSave(new File([blob],'portrait.webp',{type:blob.type}));else setError('사진을 변환하지 못했습니다.')},'image/webp',0.9)}>사진 적용</button></div>
  </div>
}