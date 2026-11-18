export type AccountRole = 'student' | 'teacher';

export function requestedAccountRole(pathname: string, next?: string | null): AccountRole | null {
  if (pathname === '/teacher' || pathname.startsWith('/teacher/') || pathname === '/signup/teacher') return 'teacher';
  if (pathname === '/student' || pathname.startsWith('/student/') || pathname === '/signup/student') return 'student';
  if (pathname === '/login' && next) {
    if (next === '/teacher' || next.startsWith('/teacher/')) return 'teacher';
    if (next === '/student' || next.startsWith('/student/')) return 'student';
  }
  return null;
}

export function accountRoleNotice(role: AccountRole) {
  return role === 'student'
    ? { title: '이미 학생으로 가입된 계정입니다', description: '이 계정은 학생 전용 계정이에요. 쌤으로 활동하려면 다른 Google 계정이나 이메일로 가입해주세요.', action: '학생 페이지로 이동' }
    : { title: '이미 쌤으로 가입된 계정입니다', description: '이 계정은 쌤 전용 계정이에요. 학생으로 이용하려면 다른 Google 계정이나 이메일로 가입해주세요.', action: '쌤 페이지로 이동' };
}
