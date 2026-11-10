import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeAuthNext, loginAuthNext } from '@/lib/auth-redirect';

// 매직링크/OAuth 로그인 후 Supabase가 리다이렉트하는 콜백 엔드포인트.
// ?code=...를 세션 쿠키로 교환한 뒤 선생님은 홈, 학생은 원래 목적지로 보낸다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeAuthNext(searchParams.get('next'));

  if (code && !searchParams.has('error')) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile) return NextResponse.redirect(`${origin}${loginAuthNext(searchParams.get('next'), profile.role, searchParams.get('role'))}`);
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', searchParams.get('error') === 'access_denied' ? 'auth_cancelled' : 'auth_callback_failed');
  loginUrl.searchParams.set('next', next);
  const entryRole = searchParams.get('role');
  if (entryRole === 'student' || entryRole === 'teacher') loginUrl.searchParams.set('role', entryRole);
  return NextResponse.redirect(loginUrl);
}
