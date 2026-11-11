'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UserRound, BookOpen, FolderOpen, NotebookPen, ListChecks, Sprout, MessageCircle, Bell, ShieldCheck, Wallet } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { SettingsDialog } from './SettingsDialog';

const links = [
  { href: '/teacher/home', label: '홈', icon: Home },
  { href: '/teacher/profile', label: '내 페이지', icon: UserRound },
  { href: '/teacher/lessons', label: '수업 관리', icon: BookOpen },
  { href: '/teacher/students', label: '학생 노트', icon: NotebookPen },
  { href: '/teacher/tasks', label: '할 일', icon: ListChecks },
  { href: '/teacher/materials', label: '자료실', icon: FolderOpen },
  { href: '/teacher/growth', label: '성장 기록', icon: Sprout },
  { href: '/teacher/settlement', label: '수익·정산', icon: Wallet },
];
export function TeacherWorkspaceNavigation({ onNotifications, unreadCount, isAdmin }: { onNotifications: () => void; unreadCount: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  return <>
    <aside className="fixed inset-y-0 left-0 z-[75] hidden w-56 flex-col bg-gradient-to-b from-[#20263e] to-[#171d37] text-white lg:flex" aria-label="선생님 작업 공간">
      <Link href="/teacher/home" className="px-7 pb-7 pt-8"><span className="text-2xl font-extrabold tracking-tight">고쌤<span className="ml-1 text-violet-300">.</span></span><span className="mt-2 block text-xs text-slate-300">선생님의 배움과 성장을 함께</span></Link>
      <nav aria-label="선생님 작업 메뉴" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">{links.map(item => { const active = pathname === item.href || pathname.startsWith(item.href + '/'); return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors ${active ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-indigo-950/20' : 'text-slate-200 hover:bg-white/10'}`}><item.icon size={20} />{item.label}</Link>; })}</nav>
      <div className="space-y-1 border-t border-white/10 p-4"><button onClick={onNotifications} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10"><Bell size={19} />알림{unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-fuchsia-400" />}</button><Link href="/teacher/chat" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10"><MessageCircle size={19} />메시지</Link>{isAdmin && <Link href="/admin" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-violet-200"><ShieldCheck size={19} />관리자</Link>}<Link href="/teacher/profile" className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 pt-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/20 font-bold text-violet-200">{user?.name?.slice(0, 1)}</span><span className="min-w-0 truncate text-sm">{user?.name} 선생님</span></Link></div>
    </aside>
    <header className="global-top-nav sticky top-0 z-[70] flex min-h-16 items-center justify-between border-b border-slate-200/60 bg-white/90 px-5 backdrop-blur lg:ml-56 lg:px-8"><Link href="/teacher/home" className="text-sm font-semibold text-slate-600"><span className="hidden sm:inline">나의 선생님 작업 공간</span><span className="sm:hidden">고쌤</span></Link><div className="flex items-center gap-1"><SettingsDialog /><button aria-label="알림" onClick={onNotifications} className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-violet-50"><Bell size={20} />{unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-fuchsia-500" />}</button><Link href="/teacher/chat" aria-label="메시지" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-violet-50"><MessageCircle size={20} /></Link></div></header><nav aria-label="선생님 추가 메뉴" className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 lg:hidden">{links.filter(item => ["/teacher/students", "/teacher/tasks", "/teacher/growth", "/teacher/settlement"].includes(item.href)).map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs ${pathname === item.href ? "bg-violet-50 font-bold text-violet-700" : "text-slate-500"}`}><item.icon size={15} />{item.label}</Link>)}</nav>
  </>;
}
