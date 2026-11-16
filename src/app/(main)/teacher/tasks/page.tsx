import { TeacherTasks } from '@/components/features/teacher/TeacherTasks';
export default function TeacherTasksPage() {
  return <main className="mx-auto max-w-6xl space-y-6 px-container-margin py-8 pb-28"><div><p className="text-sm font-semibold text-violet-600">수업 준비와 성장 계획</p><h1 className="mt-2 text-3xl font-bold">할 일 관리</h1><p className="mt-3 text-sm text-slate-500">작은 준비부터 장기 목표까지, 나의 속도에 맞춰 기록하세요.</p></div><div className="rounded-xl border border-slate-200/70 bg-white p-5 sm:p-8"><TeacherTasks /></div></main>;
}
