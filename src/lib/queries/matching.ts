import { createClient } from '@/lib/supabase/client';
import type { CatalogLesson } from './lessonCatalog';
export const languages = {ko:'한국어',en:'영어',zh:'중국어',ja:'일본어',es:'스페인어',vi:'베트남어',th:'태국어',fr:'프랑스어',de:'독일어',ru:'러시아어'};
export const proficiency = {A1:'A1 · 입문',A2:'A2 · 초급',B1:'B1 · 중급',B2:'B2 · 중상급',C1:'C1 · 고급',C2:'C2 · 능숙',native:'모국어'};
export const matchingOptions={interests:['여행','음악','드라마·영화','음식','문화·역사','독서','게임','운동','일·비즈니스','일상생활','예술','기술'],goals:['일상 회화','여행 회화','시험 준비','취업·비즈니스','발음 개선','문법·쓰기','문화 이해'],styles:['대화 중심','체계적인 설명','활동·게임','반복 연습','즉각적인 피드백','천천히 차근차근'],traits:['차분한','활기찬','꼼꼼한','유연한','공감하는','목표 지향적인'],teaching_levels:['입문','초급','중급','고급']} as const;
export type MatchingInput={languages:{language:keyof typeof languages;level:keyof typeof proficiency}[];communication_language:string;interests:string[];goals:string[];styles:string[];traits:string[];teaching_levels:string[];mbti:string;matching_enabled:boolean};
export type MatchingProfile=MatchingInput & {profile_id:string;updated_at:string};
export const emptyMatching:MatchingInput={languages:[],communication_language:'',interests:[],goals:[],styles:[],traits:[],teaching_levels:[],mbti:'',matching_enabled:false};
export async function getMatchingProfile(id:string):Promise<MatchingProfile|null>{const {data,error}=await createClient().from('matching_profiles').select('*').eq('profile_id',id).maybeSingle();if(error)throw new Error('매칭 프로필을 불러오지 못했습니다.');return data;}
export async function saveMatchingProfile(id:string,input:MatchingInput,previous:MatchingProfile|null):Promise<MatchingProfile>{
 const table=createClient().from('matching_profiles');
 const request=previous?table.update(input).eq('profile_id',id).eq('updated_at',previous.updated_at):table.insert({...input,profile_id:id});
 const {data,error}=await request.select('*').single();if(error)throw new Error('저장하지 못했거나 다른 화면에서 프로필이 변경되었습니다. 입력한 내용을 확인하고 다시 시도해주세요.');return data;
}
export type LessonRecommendation={lesson:CatalogLesson;reasons:string[]};
export async function getMyRecommendations():Promise<LessonRecommendation[]>{const {data,error}=await createClient().rpc('my_lesson_recommendations');if(error)throw new Error('맞춤 추천을 불러오지 못했습니다.');return (data||[]).filter((row:LessonRecommendation)=>row.lesson);}
