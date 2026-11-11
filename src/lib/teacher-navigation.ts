export function isTeacherWorkspace(pathname: string) {
  return pathname.startsWith('/teacher/') && !['/teacher/apply', '/teacher/profile/edit'].includes(pathname);
}
