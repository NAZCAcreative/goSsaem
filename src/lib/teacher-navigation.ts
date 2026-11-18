const workspaceSections = new Set([
  'teacher', 'teachers', 'lessons', 'sessions', 'account',
  'notifications', 'notification-settings', 'support', 'admin',
]);

export function isTeacherWorkspace(pathname: string) {
  return workspaceSections.has(pathname.split('/')[1]);
}
