import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { roleAuthNext } from '@/lib/auth-redirect';

// 로그인 없이 접근 가능한 라우트. 그 외 /student/*, /teacher/*, 알림 등은 전부 로그인이 필요하다.
const PUBLIC_EXACT_PATHS = new Set(['/', '/student', '/student/home', '/teacher', '/login', '/onboarding', '/register', '/signup', '/support', '/student/search']);
const PUBLIC_PREFIXES = ['/auth/callback', '/teachers/', '/signup/'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase 프로젝트 연결 전(.env.local 미설정)에는 세션 갱신/보호 라우트 검사를 건너뛴다.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // 세션 만료 시 액세스 토큰을 자동 갱신하고 쿠키를 다시 써준다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname.startsWith('/student/') || pathname.startsWith('/teacher/'))) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'profile_unavailable');
      const redirect = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
    const destination = roleAuthNext(pathname + request.nextUrl.search, profile.role);
    if (destination !== pathname + request.nextUrl.search) {
      const redirect = NextResponse.redirect(new URL(destination, request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
