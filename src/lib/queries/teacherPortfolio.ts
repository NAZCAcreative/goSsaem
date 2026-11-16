import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

export const portfolioLabels = { career: '경력', qualification: '자격·교육', work: '대표 작업' } as const;
export const portfolioSchema = z.object({
  kind: z.enum(['career', 'qualification', 'work']),
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(120),
  organization: z.string().trim().max(120),
  period: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  url: z.string().trim().max(2000).refine(value => {
    if (!value) return true;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
  }, 'http 또는 https로 시작하는 올바른 링크를 입력해주세요.'),
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
  const parsed = portfolioSchema.parse(input);
  const table = createClient().from('teacher_portfolio_entries');
  const query = id ? table.update(parsed).eq('id', id).eq('teacher_id', teacherId) : table.insert({ ...parsed, teacher_id: teacherId });
  const { data, error } = await query.select('*').single();
  if (error) throw new Error('저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.');
  return data as PortfolioEntry;
}

export async function deletePortfolio(teacherId: string, id: string): Promise<void> {
  const { data, error } = await createClient().from('teacher_portfolio_entries').delete().eq('id', id).eq('teacher_id', teacherId).select('id').single();
  if (error || !data) throw new Error('삭제하지 못했습니다. 다시 시도해주세요.');
}
