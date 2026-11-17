import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeAuthNext, loginAuthNext } from '@/lib/auth-redirect';

// 매직링크/OAuth 로그인 후 Supabase가 리다이렉트하는 콜백 엔드포인트.
// ?code=...를 세션 쿠키로 교환한 뒤 원래 목적지(또는 홈)로 보낸다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeAuthNext(searchParams.get('next'));
  const roleHint = searchParams.get('role');
  const rawNext = searchParams.get('next');
  const requestedRole = roleHint === 'teacher' || roleHint === 'student' ? roleHint
    : rawNext?.startsWith('/teacher/') ? 'teacher' : rawNext?.startsWith('/student/') ? 'student' : null;

  if (code && !searchParams.has('error')) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile) {
        let role = profile.role;
        if (profile.oauth_role_pending === true) {
          const result = await supabase.rpc('complete_oauth_registration', { p_role: requestedRole ?? 'student' });
          if (result.error || !result.data) {
            const failure = new URL('/login', origin);
            failure.searchParams.set('next', next);
            failure.searchParams.set('error', 'oauth_registration_unavailable');
            return NextResponse.redirect(failure);
          }
          const registration = result.data as { role?: string };
          if (registration.role !== 'student' && registration.role !== 'teacher') return NextResponse.redirect(new URL('/login?error=oauth_registration_unavailable', origin));
          role = registration.role;
        } else if (profile.oauth_role_pending === undefined && requestedRole === 'teacher' && role !== 'teacher') {
          // Missing migration: never turn a just-created default student into a teacher.
          // Established student accounts still get the mismatch notice below.
          const created = Date.parse(data.user.created_at);
          if (Number.isFinite(created) && Date.now() - created < 120000) {
            const failure = new URL('/login', origin);
            failure.searchParams.set('next', next);
            failure.searchParams.set('error', 'oauth_registration_unavailable');
            return NextResponse.redirect(failure);
          }
        }
        return NextResponse.redirect(`${origin}${loginAuthNext(searchParams.get('next'), role, requestedRole)}`);
      }
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', searchParams.get('error') === 'access_denied' ? 'auth_cancelled' : 'auth_callback_failed');
  loginUrl.searchParams.set('next', next);
  if (requestedRole) loginUrl.searchParams.set('role', requestedRole);
  return NextResponse.redirect(loginUrl);
}
