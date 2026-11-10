import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, CalendarCheck, Wallet,
  CircleDollarSign, Landmark, MessageSquare, Ticket, History, Settings2, User,
  RefreshCw, Download, SearchX, ClipboardCheck, ChevronRight, ShieldCheck, Megaphone,
} from 'lucide-react';

const icons = {
  dashboard: LayoutDashboard, groups: Users, school: GraduationCap, menu_book: BookOpen,
  event: Calendar, event_available: CalendarCheck, payments: CircleDollarSign,
  account_balance: Landmark, account_balance_wallet: Wallet, rate_review: MessageSquare,
  confirmation_number: Ticket, history: History, manage_accounts: Settings2, person: User,
  refresh: RefreshCw, download: Download, search_off: SearchX, task_alt: ClipboardCheck,
  chevron_right: ChevronRight, admin_panel_settings: ShieldCheck, campaign: Megaphone,
};

export function AdminIcon({ name, className = '' }: { name: string; className?: string }) {
  const Icon = icons[name as keyof typeof icons] || LayoutDashboard;
  return <Icon aria-hidden="true" size={20} strokeWidth={1.8} className={`shrink-0 ${className}`} />;
}
