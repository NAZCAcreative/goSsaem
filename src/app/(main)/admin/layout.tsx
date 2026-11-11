import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['nazca4902@naver.com', 'parkdaegun@gmail.com'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login?next=%2Fadmin');

  const userEmail = user.email?.toLowerCase();
  if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
    return children;
  }

  const { data, error } = await supabase.rpc('admin_is_authorized');
  if (error || data !== true) notFound();
  return children;
}
