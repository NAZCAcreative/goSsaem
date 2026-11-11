import { createClient } from '@/lib/supabase/client';

export type CatalogSession = { id: string; start: string; duration: number; capacity: number; remaining: number };
export type CatalogLesson = {
  id: string; teacher_id: string; teacher_name: string; title: string; description: string | null;
  category: string; level: string | null; type: 'group' | '1on1' | 'free_trial'; price: number; currency: string;
  duration_minutes: number; capacity: number; image_url: string | null; scheduling_mode: 'fixed' | 'request';
  supported_languages: string[]; sessions: CatalogSession[]; next_start: string | null;
};
export type CatalogFilters = { q: string; type: string; category: string; level: string; price: string; day: string; scheduled: boolean; sort: string; page: number };
export type CatalogResult = { items: CatalogLesson[]; total: number; categories: string[]; levels: string[] };
export function readCatalogFilters(params: URLSearchParams): CatalogFilters {
  const pick = (key: string, values: string[], fallback: string) => values.includes(params.get(key) || '') ? params.get(key)! : fallback;
  return { q: (params.get('q') || '').trim().slice(0, 200), type: pick('type', ['group','1on1','free_trial','all'], 'group'), category: params.get('category') || '', level: params.get('level') || '',
    price: pick('price', ['all','free','low','mid','high'], 'all'), day: /^\d{4}-\d{2}-\d{2}$/.test(params.get('day') || '') ? params.get('day')! : '',
    scheduled: params.get('scheduled') === 'true', sort: pick('sort', ['upcoming','price','recent'], 'upcoming'), page: Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1))) };
}
export async function getLessonCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  const { data, error } = await createClient().rpc('public_lesson_catalog', { p_filters: filters });
  if (error || !data) throw new Error('수업을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  return data;
}
export async function getPublicLesson(id: string): Promise<CatalogLesson | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await createClient().rpc('public_lesson_catalog', { p_lesson: id });
  if (error || !data) throw new Error('수업 정보를 불러오지 못했습니다.');
  return data.items[0] ?? null;
}
export const lessonTypeLabels = { group: '그룹수업', '1on1': '1:1 수업', free_trial: '무료 체험' };
export const lessonPrice = (lesson: CatalogLesson) => lesson.price === 0 ? '무료' : new Intl.NumberFormat('ko-KR', { style: 'currency', currency: lesson.currency }).format(lesson.price);
export const lessonTime = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
export function matchingSession(lesson: CatalogLesson, day = '') {
  return lesson.sessions.find(session => session.remaining > 0 && (!day || new Date(new Date(session.start).getTime()+9*3600000).toISOString().slice(0,10) === day));
}
export function lessonBookingHref(lesson: CatalogLesson, session?: CatalogSession) {
  const params = new URLSearchParams({ teacher: lesson.teacher_id, lesson: lesson.id });
  if (session) params.set('start', session.start);
  return `/student/booking/confirm?${params}`;
}
