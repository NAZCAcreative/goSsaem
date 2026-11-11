import { createClient } from '@/lib/supabase/client';

export type TeacherLessonRow = {
  id: string;
  teacherId: string;
  type: 'group' | '1on1' | 'free_trial';
  category: string;
  language: string;
  supportedLanguages: string[];
  imageUrl: string | null;
  videoUrl: string | null;
  title: string;
  level: string | null;
  price: number;
  currency: string;
  capacity: number;
  description: string | null;
  isPublished: boolean;
  schedulingMode: 'fixed' | 'request';
  durationMinutes: number;
  availability: { weekday: number; start: string; end: string }[];
};

const LESSON_SELECT = 'id, teacher_id, type, category, language, supported_languages, image_url, video_url, title, level, price, currency, capacity, description, is_published, scheduling_mode, duration_minutes, availability';

function toLessonRow(row: {
  id: string;
  teacher_id: string;
  type: 'group' | '1on1' | 'free_trial';
  category: string;
  language?: string | null;
  supported_languages?: string[] | null;
  image_url?: string | null;
  video_url?: string | null;
  title: string;
  level: string | null;
  price: number;
  currency: string;
  capacity: number;
  description: string | null;
  is_published: boolean;
  scheduling_mode: 'fixed' | 'request';
  duration_minutes: number;
  availability: { weekday: number; start: string; end: string }[];
}): TeacherLessonRow {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    type: row.type,
    category: row.category,
    language: row.language ?? '한국어',
    supportedLanguages: Array.isArray(row.supported_languages) && row.supported_languages.length > 0 ? row.supported_languages : ['한국어'],
    imageUrl: row.image_url ?? null,
    videoUrl: row.video_url ?? null,
    title: row.title,
    level: row.level,
    price: row.price,
    currency: row.currency,
    capacity: row.capacity,
    description: row.description,
    isPublished: row.is_published,
    schedulingMode: row.scheduling_mode,
    durationMinutes: row.duration_minutes,
    availability: row.availability,
  };
}

export async function getTeacherLesson(id: string): Promise<TeacherLessonRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('teacher_lessons').select(LESSON_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLessonRow(data) : null;
}

export async function listMyLessons(teacherId: string, page = 1, type = ''): Promise<TeacherLessonRow[]> {
  const { data, error } = await createClient().from('teacher_lessons').select(LESSON_SELECT)
    .eq('teacher_id', teacherId).in('type', type ? [type] : ['group', '1on1', 'free_trial'])
    .order('created_at', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLessonRow);
}

export type CreateTeacherLessonInput = {
  teacherId: string;
  type: 'group' | '1on1' | 'free_trial';
  category: string;
  language?: string;
  supportedLanguages?: string[];
  imageUrl?: string | null;
  videoUrl?: string | null;
  title: string;
  level: string | null;
  price: number;
  capacity: number;
  description: string | null;
  scheduledAt: string | null;
  schedulingMode: 'fixed' | 'request';
  availability: { weekday: number; start: string; end: string }[];
  durationMinutes: number;
};

export async function createTeacherLessonWithSession(input: CreateTeacherLessonInput): Promise<{ lessonId: string; sessionId: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_teacher_lesson', { p_data: input });
  if (error) throw new Error(error.code === '23P01' ? '기존 수업과 시간이 겹칩니다.' : '수업을 저장하지 못했습니다. 날짜·가격·정원을 확인해주세요.');
  return data as { lessonId: string; sessionId: string | null };
}

export type UpdateTeacherLessonInput = {
  title: string;
  level: string | null;
  category: string;
  language?: string;
  supportedLanguages?: string[];
  imageUrl?: string | null;
  videoUrl?: string | null;
  price: number;
  description: string | null;
};

export async function updateTeacherLesson(id: string, input: UpdateTeacherLessonInput): Promise<void> {
  const supabase = createClient();
  const updatePayload: Record<string, unknown> = {
    title: input.title,
    level: input.level,
    category: input.category,
    price: input.price,
    description: input.description,
  };
  if (input.language) updatePayload.language = input.language;
  if (input.supportedLanguages) updatePayload.supported_languages = input.supportedLanguages;
  if (input.imageUrl !== undefined) updatePayload.image_url = input.imageUrl;
  if (input.videoUrl !== undefined) updatePayload.video_url = input.videoUrl;

  const { error } = await supabase
    .from('teacher_lessons')
    .update(updatePayload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTeacherLesson(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_teacher_lesson', { p_lesson_id: id });
  if (error) throw new Error(error.message);
}


export type MySessionRow = {
  id: string;
  teacherLessonId: string | null;
  title: string;
  type: 'group' | '1on1' | 'free_trial';
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  enrolledCount: number;
  category?: string | null;
  level?: string | null;
  status: string;
};

export async function listMySessions(
  teacherId: string,
  page = 1,
  type = '',
  onlyUpcoming = false
): Promise<MySessionRow[]> {
  const supabase = createClient();
  let query = supabase
    .from('lesson_sessions')
    .select('id, teacher_lesson_id, title, type, scheduled_at, duration_minutes, capacity, enrolled_count, status, teacher_lessons(category, level)')
    .eq('teacher_id', teacherId);

  if (type) {
    query = query.eq('type', type);
  }
  if (onlyUpcoming) {
    query = query.gte('scheduled_at', new Date().toISOString());
  }

  const { data, error } = await query
    .order('scheduled_at', { ascending: true })
    .range((page - 1) * 20, page * 20 - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    teacherLessonId: row.teacher_lesson_id,
    title: row.title,
    type: row.type,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    enrolledCount: row.enrolled_count,
    category: row.teacher_lessons?.category ?? null,
    level: row.teacher_lessons?.level ?? null,
    status: row.status,
  }));
}
