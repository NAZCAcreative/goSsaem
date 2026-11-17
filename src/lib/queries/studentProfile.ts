import { createClient } from '@/lib/supabase/client';
import type { LanguageLevel } from '@/types';
import { listMyCoupons } from './coupons';

export type StudentProfile = {
  name: string;
  avatarUrl: string | null;
  koreanLevel: LanguageLevel;
  nativeLanguage: string | null;
};

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('name, avatar_url, korean_level, native_language')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { name: data.name, avatarUrl: data.avatar_url, koreanLevel: data.korean_level, nativeLanguage: data.native_language };
}

export async function updateStudentProfile(
  userId: string,
  input: { name: string; koreanLevel: LanguageLevel; nativeLanguage: string | null },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ name: input.name, korean_level: input.koreanLevel, native_language: input.nativeLanguage })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export type StudentStats = {
  bookingsCount: number;
  wishlistCount: number;
  reviewsCount: number;
  availableCouponsCount: number;
};

async function countRows(table: 'enrollments' | 'wishlists' | 'reviews', column: 'student_id', userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq(column, userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getStudentStats(userId: string): Promise<StudentStats> {
  const [bookingsCount, wishlistCount, reviewsCount, couponsResult] = await Promise.all([
    countRows('enrollments', 'student_id', userId),
    countRows('wishlists', 'student_id', userId),
    countRows('reviews', 'student_id', userId),
    listMyCoupons(userId),
  ]);

  return {
    bookingsCount,
    wishlistCount,
    reviewsCount,
    availableCouponsCount: couponsResult.length,
  };
}
