import { writeFileSync } from 'node:fs';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase URL and service role key are required for the read-only audit.');

async function rows(table, select) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const endpoint = new URL(`/rest/v1/${table}`, url);
    endpoint.searchParams.set('select', select);
    endpoint.searchParams.set('order', table === 'teacher_profiles' ? 'profile_id' : 'id');
    endpoint.searchParams.set('offset', String(offset));
    endpoint.searchParams.set('limit', '1000');
    const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const page = await response.json();
    result.push(...page);
    if (page.length < 1000) return result;
  }
}

const tables = await Promise.all([
  ['profiles', 'id,role,active_role'], ['teacher_profiles', 'profile_id'],
  ['teacher_lessons', 'id,teacher_id'], ['lesson_sessions', 'id,teacher_id'],
  ['enrollments', 'id,student_id'],
].map(async ([table, select]) => [table, await rows(table, select)]));
const data = Object.fromEntries(tables);
const profiles = new Map(data.profiles.map(profile => [profile.id, profile]));
const teachers = new Set(data.teacher_profiles.map(profile => profile.profile_id));
const students = new Set(data.enrollments.map(row => row.student_id));
const report = {
  checkedAt: new Date().toISOString(),
  access: 'read-only REST; aggregate output only; no personal data exported',
  rows: Object.fromEntries(tables.map(([table, values]) => [table, values.length])),
  accountsByRole: Object.fromEntries(['student', 'teacher', 'admin'].map(role => [role, data.profiles.filter(p => p.role === role).length])),
  conflicts: {
    activeRoleDiffers: data.profiles.filter(p => p.active_role !== null && p.active_role !== p.role).length,
    teacherProfileWithOtherRole: data.teacher_profiles.filter(p => profiles.get(p.profile_id)?.role !== 'teacher').length,
    teacherAccountMissingTeacherProfile: data.profiles.filter(p => p.role === 'teacher' && !teachers.has(p.id)).length,
    accountsWithTeachingAndEnrollment: [...teachers].filter(id => students.has(id)).length,
    lessonWithNonTeacherOwner: data.teacher_lessons.filter(p => profiles.get(p.teacher_id)?.role !== 'teacher').length,
    sessionWithNonTeacherOwner: data.lesson_sessions.filter(p => profiles.get(p.teacher_id)?.role !== 'teacher').length,
    enrollmentWithNonStudentOwner: data.enrollments.filter(p => profiles.get(p.student_id)?.role !== 'student').length,
  },
};
writeFileSync('docs/03-build/account-role-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
