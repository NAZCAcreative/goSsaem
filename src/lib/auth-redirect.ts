export function safeAuthNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/student/home';
  return value;
}

export function loginAuthNext(value: string | null, role: string, entryRole?: string | null): string {
  if (entryRole === 'student' && role === 'teacher') return '/login?role=student&next=%2Fstudent%2Fhome&error=student_account_required';
  if (entryRole === 'teacher' && role !== 'teacher') return teacherLoginNext(value, true);
  if (role === 'teacher') return '/teacher/home';
  const pathname = safeAuthNext(value).split(/[?#]/)[0];
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) {
    return teacherLoginNext(value, true);
  }
  return roleAuthNext(value, role);
}

export function roleAuthNext(value: string | null, role: string): string {
  const home = role === 'teacher' ? '/teacher/home' : '/student/home';
  if (!value) return home;
  const next = safeAuthNext(value);
  const pathname = next.split(/[?#]/)[0];
  if (role === 'teacher' && (pathname === '/student' || pathname.startsWith('/student/'))) return home;
  if (role !== 'teacher' && (pathname === '/teacher' || pathname.startsWith('/teacher/'))) return teacherLoginNext(next, true);
  if (['/login', '/signup', '/register', '/auth/callback'].includes(pathname) || pathname.startsWith('/signup/')) return home;
  if (pathname === '/teacher/register' || pathname.startsWith('/teacher/register/')) return next.replace('/teacher/register', '/teacher/lessons/new');
  return next;
}
export function teacherLoginNext(value: string | null = '/teacher/home', mismatch = false): string {
  const next = safeAuthNext(value);
  const pathname = next.split(/[?#]/)[0];
  const destination = pathname === '/teacher' || pathname.startsWith('/teacher/') ? next : '/teacher/home';
  return `/login?role=teacher&next=${encodeURIComponent(destination)}${mismatch ? '&error=teacher_account_required' : ''}`;
}
