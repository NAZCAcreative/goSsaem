import type {Metadata} from 'next';
import {createClient} from '@/lib/supabase/server';

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/i.test(id))return {robots:{index:false}};
  const db=await createClient();
  const {data:approved}=await db.rpc('portfolio_teacher_approved',{p_teacher:id});
  if(!approved)return {title:'쌤 프로필',robots:{index:false}};
  const {data}=await db.from('teacher_profiles').select('headline,profiles(name,avatar_url)').eq('profile_id',id).maybeSingle();
  if(!data)return {title:'쌤 프로필',robots:{index:false}};
  const person=data.profiles as unknown as {name:string;avatar_url:string|null};
  if(!person?.name)return {title:'쌤 프로필',robots:{index:false}};
  const title=person.name+' 쌤 | 고쌤';
  const url='/teachers/'+id;
  return {title,description:data.headline||undefined,alternates:{canonical:url},openGraph:{title,url,description:data.headline||undefined,images:person.avatar_url?[person.avatar_url]:[]}};
}
export default function Layout({children}:{children:React.ReactNode}){return children}