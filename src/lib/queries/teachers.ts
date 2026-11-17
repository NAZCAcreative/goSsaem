import { createClient } from '@/lib/supabase/client';
import { periodsForTimeRange } from '@/lib/time';
import { collectPages } from './paging';
import { getLessonCatalog, readCatalogFilters, type CatalogLesson } from './lessonCatalog';

export type TeacherCard = {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarIsGenerated: boolean;
  headline: string | null;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
  specialties: string[];
  minPrice: number | null;
  lessonTitles?: string[];
};

type TeacherProfileRow = {
  profile_id: string;
  headline: string | null;
  specialties: string[];
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  profiles: { name: string; avatar_url: string | null; avatar_is_generated: boolean } | null;
  teacher_lessons: { title: string; category: string; price: number; is_published: boolean }[] | null;
};

function toTeacherCard(row: TeacherProfileRow): TeacherCard {
  const publishedPrices = (row.teacher_lessons ?? [])
    .filter((lesson) => lesson.is_published)
    .map((lesson) => lesson.price);

  return {
    id: row.profile_id,
    name: row.profiles?.name ?? '이름 없음',
    avatarUrl: row.profiles?.avatar_url ?? null,
    avatarIsGenerated: row.profiles?.avatar_is_generated ?? false,
    headline: row.headline,
    ratingAvg: Number(row.rating_avg) || 0,
    ratingCount: row.rating_count,
    isVerified: row.is_verified,
    specialties: Array.from(new Set([...(row.specialties ?? []), ...(row.teacher_lessons ?? []).filter(lesson => lesson.is_published).map(lesson => lesson.category)])),
    lessonTitles: (row.teacher_lessons ?? []).filter((lesson) => lesson.is_published).map((lesson) => lesson.title),
    minPrice: publishedPrices.length > 0 ? Math.min(...publishedPrices) : null,
  };
}

const TEACHER_CARD_SELECT =
  'profile_id, headline, specialties, is_verified, rating_avg, rating_count, profiles(name, avatar_url, avatar_is_generated), teacher_lessons(title, category, price, is_published)';

export async function listTeachers(): Promise<TeacherCard[]> {
  const supabase = createClient();
  const data = await collectPages((from, to) => supabase
    .from('teacher_profiles')
    .select(TEACHER_CARD_SELECT)
    .order('rating_avg', { ascending: false }).order('profile_id').range(from, to));
  return ((data ?? []) as unknown as TeacherProfileRow[]).map(toTeacherCard);
}

export async function listFeaturedTeachers(limit = 4): Promise<TeacherCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(TEACHER_CARD_SELECT)
    .not('featured_rank', 'is', null)
    .order('featured_rank', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TeacherProfileRow[]).map(toTeacherCard);
}

export async function getTeacherById(id: string): Promise<TeacherCard | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(TEACHER_CARD_SELECT)
    .eq('profile_id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toTeacherCard(data as unknown as TeacherProfileRow);
}

export type CategoryRatings = {
  kindness: number;
  clarity: number;
  improvement: number;
  preparation: number;
};

export type TeacherDetail = TeacherCard & {
  bio: string | null;
  yearsExperience: number | null;
  country: string | null;
  introVideoUrl: string | null;
  categoryRatings: CategoryRatings;
};

export async function getTeacherDetail(id: string): Promise<TeacherDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(
      `${TEACHER_CARD_SELECT}, bio, years_experience, country, intro_video_url, kindness_avg, clarity_avg, improvement_avg, preparation_avg`,
    )
    .eq('profile_id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as TeacherProfileRow & {
    bio: string | null;
    years_experience: number | null;
    country: string | null;
    intro_video_url: string | null;
    kindness_avg: number;
    clarity_avg: number;
    improvement_avg: number;
    preparation_avg: number;
  };

  return {
    ...toTeacherCard(row),
    bio: row.bio,
    yearsExperience: row.years_experience,
    country: row.country,
    introVideoUrl: row.intro_video_url,
    categoryRatings: {
      kindness: Number(row.kindness_avg) || 0,
      clarity: Number(row.clarity_avg) || 0,
      improvement: Number(row.improvement_avg) || 0,
      preparation: Number(row.preparation_avg) || 0,
    },
  };
}

export async function getRecentBookingCount(teacherId: string, days = 30): Promise<number> {
  const { data, error } = await createClient().rpc('public_booking_counts', { p_days: days, p_teacher: teacherId });
  if (error) throw new Error(error.message);
  const rows = data as { teacherId: string; count: number }[] | null;
  return Number(rows?.[0]?.count ?? 0);
}

export async function listRecentBookingCounts(days = 30): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc('public_booking_counts', { p_days: days });

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { teacherId: string; count: number }[]) {
    counts.set(row.teacherId, Number(row.count));
  }
  return counts;
}

export type AvailabilityPeriod = 'morning' | 'afternoon' | 'evening';

export async function listTeacherAvailabilityPeriods(): Promise<Map<string, Set<AvailabilityPeriod>>> {
  const supabase = createClient();
  const { data, error } = await supabase.from('teacher_availability').select('teacher_id, start_time, end_time');
  if (error) throw new Error(error.message);

  const map = new Map<string, Set<AvailabilityPeriod>>();
  for (const row of data ?? []) {
    const periods = map.get(row.teacher_id) ?? new Set<AvailabilityPeriod>();
    for (const period of periodsForTimeRange(row.start_time, row.end_time)) periods.add(period);
    map.set(row.teacher_id, periods);
  }
  return map;
}

type TeacherSearchInput = { query: string; specialty: string | null; price: string; periods: string[]; sort: string; page: number; size: number };
type TeacherSearchResult = { items: (TeacherCard & { recentBookings: number })[]; total: number; popularityAvailable?: boolean };

// Older deployed databases have the public catalogue but not search_teachers.
// Use its published/approved teacher IDs as the visibility boundary, never all profiles.
async function searchCatalogTeachers(input: TeacherSearchInput): Promise<TeacherSearchResult> {
  const lessons: CatalogLesson[] = [];
  for (let page = 1; ; page++) {
    const catalog = await getLessonCatalog(readCatalogFilters(new URLSearchParams({ type: 'all', page: String(page) })));
    lessons.push(...catalog.items);
    if (lessons.length >= catalog.total) break;
    if (!catalog.items.length) throw new Error('수업 목록을 모두 확인하지 못했습니다. 다시 시도해주세요.');
  }
  if (!lessons.length) return { items: [], total: 0, popularityAvailable: false };
  const byTeacher = new Map<string, CatalogLesson[]>();
  for (const lesson of lessons) byTeacher.set(lesson.teacher_id, [...(byTeacher.get(lesson.teacher_id) || []), lesson]);
  const profiles = await listTeachers();
  const availability = input.periods.length ? await listTeacherAvailabilityPeriods() : new Map<string, Set<AvailabilityPeriod>>();
  if (input.periods.length) {
    const { data, error } = await createClient().from('teacher_lessons').select('teacher_id, availability').eq('is_published', true).eq('scheduling_mode', 'request');
    if (error) throw error;
    for (const row of data ?? []) {
      if (!byTeacher.has(row.teacher_id) || !Array.isArray(row.availability)) continue;
      const periods = availability.get(row.teacher_id) ?? new Set<AvailabilityPeriod>();
      for (const slot of row.availability) {
        if (slot && typeof slot === 'object' && 'start' in slot && 'end' in slot && typeof slot.start === 'string' && typeof slot.end === 'string') {
          for (const period of periodsForTimeRange(slot.start, slot.end)) periods.add(period);
        }
      }
      availability.set(row.teacher_id, periods);
    }
    for (const lesson of lessons) {
      const periods = availability.get(lesson.teacher_id) ?? new Set<AvailabilityPeriod>();
      for (const session of lesson.sessions) {
        const start = new Date(Date.parse(session.start) + 9 * 3600000);
        const end = new Date(start.getTime() + session.duration * 60000);
        for (const period of periodsForTimeRange(start.toISOString().slice(11,16), end.toISOString().slice(0,10) === start.toISOString().slice(0,10) ? end.toISOString().slice(11,16) : '24:00')) periods.add(period);
      }
      availability.set(lesson.teacher_id, periods);
    }
  }
  const terms = input.query.normalize('NFKC').trim().slice(0, 200).toLocaleLowerCase().split(/\s+/).filter(Boolean);
  let items = profiles.filter(teacher => byTeacher.has(teacher.id)).map(teacher => {
    const published = byTeacher.get(teacher.id)!;
    return { ...teacher, minPrice: Math.min(...published.map(lesson => lesson.price)), lessonTitles: published.map(lesson => lesson.title), recentBookings: 0 };
  }).filter(teacher => {
    const text = [teacher.name, teacher.headline, ...teacher.specialties, ...teacher.lessonTitles].join(' ').normalize('NFKC').toLocaleLowerCase();
    return terms.every(term => text.includes(term)) && (!input.specialty || teacher.specialties.includes(input.specialty)) &&
      (input.price === 'all' || (input.price === 'low' && teacher.minPrice <= 20000) || (input.price === 'mid' && teacher.minPrice > 20000 && teacher.minPrice <= 40000) || (input.price === 'high' && teacher.minPrice > 40000)) &&
      (!input.periods.length || input.periods.some(period => availability.get(teacher.id)?.has(period as AvailabilityPeriod)));
  });
  // Older databases do not expose aggregate booking counts; keep the rating tie-breaker.
  items = items.sort((a, b) => (input.sort === 'price' ? a.minPrice - b.minPrice : 0) || b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount || a.id.localeCompare(b.id));
  const size = Math.max(1, Math.min(input.size, 50));
  const offset = (Math.max(1, input.page) - 1) * size;
  return { items: items.slice(offset, offset + size), total: items.length, popularityAvailable: false };
}

export async function searchTeachers(input: TeacherSearchInput): Promise<TeacherSearchResult> {
  const { data, error } = await createClient().rpc('search_teachers', {
    p_query: input.query.normalize('NFKC'), p_specialty: input.specialty, p_price: input.price,
    p_periods: input.periods, p_sort: input.sort, p_page: input.page, p_size: input.size,
  });
  if (error?.code === 'PGRST202') return searchCatalogTeachers(input);
  if (error || !data) throw new Error('선생님 검색을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  return data as { items: (TeacherCard & { recentBookings: number })[]; total: number };
}

export async function listWishlistedTeacherIds(studentId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase.from('wishlists').select('teacher_id').eq('student_id', studentId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.teacher_id as string));
}

export async function addWishlist(studentId: string, teacherId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('wishlists').insert({ student_id: studentId, teacher_id: teacherId });
  if (error) throw new Error(error.message);
}

export async function removeWishlist(studentId: string, teacherId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
}

export async function listWishlistedTeachers(studentId: string): Promise<TeacherCard[]> {
  const ids = Array.from(await listWishlistedTeacherIds(studentId));
  if (ids.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase.from('teacher_profiles').select(TEACHER_CARD_SELECT).in('profile_id', ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TeacherProfileRow[]).map(toTeacherCard);
}

export type UpdateTeacherProfileInput = {
  name: string;
  headline: string;
  bio: string;
  specialties: string[];
};

export async function updateTeacherProfileForm(profileId: string, input: UpdateTeacherProfileInput): Promise<void> {
  const supabase = createClient();
  const { error: profileError } = await supabase.from('profiles').update({ name: input.name }).eq('id', profileId);
  if (profileError) throw new Error(profileError.message);

  const { error: teacherError } = await supabase
    .from('teacher_profiles')
    .update({ headline: input.headline, bio: input.bio, specialties: input.specialties })
    .eq('profile_id', profileId);
  if (teacherError) throw new Error(teacherError.message);
}
