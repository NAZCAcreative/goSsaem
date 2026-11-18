import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

export const portfolioLabels = { career: '경력', qualification: '자격·교육', work: '대표 작업', kpop: '좋아하는 K-pop 그룹', movie: '좋아하는 영화', drama: '좋아하는 드라마', interest: '다른 관심사', structure: '수업 구조', correction: '오류 교정', mood: '수업 분위기', pace: '수업 속도', activity: '학습 활동', intro: '자기소개 영상', demo: '시범 수업 영상', translation: '다른 언어로 소개' } as const;
export const styleAxes: Partial<Record<keyof typeof portfolioLabels, readonly [string,string]>> = {
  structure:['자유 대화','체계적인 커리큘럼'], correction:['자연스럽게 교정','즉각적인 교정'], mood:['편안하고 친근하게','진지하고 집중해서'], pace:['천천히 반복','빠르게 도전'], activity:['대화·역할극','문법·연습문제'],
};
export const portfolioSchema = z.object({
  kind: z.enum(['career', 'qualification', 'work','kpop','movie','drama','interest','structure','correction','mood','pace','activity','intro','demo','translation']),
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(120),
  organization: z.string().trim().max(120),
  period: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  url: z.string().trim().max(2000).refine(value => {
    if (!value) return true;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
  }, 'http 또는 https로 시작하는 올바른 링크를 입력해주세요.'),
  media_consent: z.boolean().optional(),
  media_path: z.string().nullable().optional(),
  style_level: z.number().int().min(1).max(5).nullable().optional(),
  is_public: z.boolean(),
});
export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type PortfolioEntry = PortfolioInput & { id: string; teacher_id: string; created_at: string };

export async function listPortfolio(teacherId: string, publicOnly = false): Promise<PortfolioEntry[]> {
  let query = createClient().from('teacher_portfolio_entries').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  // Owners see exactly what visitors see when previewing their public page.
  if (publicOnly) query = query.eq('is_public', true);
  const { data, error } = await query;
  if (error) throw new Error('경력과 대표 작업을 불러오지 못했습니다. 다시 시도해주세요.');
  return (data ?? []) as PortfolioEntry[];
}

export async function savePortfolio(teacherId: string, input: PortfolioInput, id?: string): Promise<PortfolioEntry> {
  const parsed = portfolioSchema.parse({...input,style_level:styleAxes[input.kind]?input.style_level:null,media_path:['intro','demo'].includes(input.kind)?input.media_path??null:null});
  const table = createClient().from('teacher_portfolio_entries');
  const query = id ? table.update(parsed).eq('id', id).eq('teacher_id', teacherId) : table.insert({ ...parsed, teacher_id: teacherId });
  const { data, error } = await query.select('*').single();
  if (error?.code === '23505') throw new Error('이미 등록한 수업 스타일입니다. 내 기록에서 수정해주세요.');
  if (error) throw new Error('저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.');
  return data as PortfolioEntry;
}

export async function deletePortfolio(teacherId: string, id: string): Promise<void> {
  const { data, error } = await createClient().from('teacher_portfolio_entries').delete().eq('id', id).eq('teacher_id', teacherId).select('id').single();
  if (error || !data) throw new Error('삭제하지 못했습니다. 다시 시도해주세요.');
}
