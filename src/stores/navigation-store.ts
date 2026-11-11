import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NavItem = {
  id: string;
  icon: string;
  label: string;
  href: string;
  match: string[];
  isActive: boolean;
  order: number;
  role: 'student' | 'teacher';
};

export const DEFAULT_STUDENT_ITEMS: NavItem[] = [
  {
    id: 's-home',
    icon: 'home',
    label: '홈',
    href: '/student',
    match: ['/student', '/student/home', '/'],
    isActive: true,
    order: 1,
    role: 'student',
  },
  {
    id: 's-search',
    icon: 'search',
    label: '선생님 찾기',
    href: '/student/search',
    match: ['/student/search', '/teachers'],
    isActive: true,
    order: 2,
    role: 'student',
  },
  {
    id: 's-bookings',
    icon: 'calendar_today',
    label: '수업 예약',
    href: '/student/bookings',
    match: ['/student/bookings', '/student/booking/confirm', '/student/payment', '/student/confirmation'],
    isActive: true,
    order: 3,
    role: 'student',
  },
  {
    id: 's-chat',
    icon: 'chat_bubble',
    label: '채팅',
    href: '/student/chat',
    match: ['/student/chat'],
    isActive: true,
    order: 4,
    role: 'student',
  },
  {
    id: 's-profile',
    icon: 'person',
    label: '마이페이지',
    href: '/student/profile',
    match: [
      '/student/profile',
      '/student/coupons',
      '/student/wishlist',
      '/student/reviews',
      '/student/payment-history',
      '/notification-settings',
      '/notifications',
      '/support',
    ],
    isActive: true,
    order: 5,
    role: 'student',
  },
];

export const DEFAULT_TEACHER_ITEMS: NavItem[] = [
  {
    id: 't-home',
    icon: 'home',
    label: '선생님 홈',
    href: '/teacher',
    match: ['/teacher', '/teacher/home'],
    isActive: true,
    order: 1,
    role: 'teacher',
  },
  {
    id: 't-lessons',
    icon: 'menu_book',
    label: '수업 관리',
    href: '/teacher/lessons',
    match: ['/teacher/lessons'],
    isActive: true,
    order: 2,
    role: 'teacher',
  },
  {
    id: 't-new-lesson',
    icon: 'add_circle',
    label: '수업 개설',
    href: '/teacher/lessons/new',
    match: ['/teacher/lessons/new'],
    isActive: true,
    order: 3,
    role: 'teacher',
  },
  {
    id: 't-chat',
    icon: 'chat_bubble',
    label: '채팅',
    href: '/teacher/chat',
    match: ['/teacher/chat'],
    isActive: true,
    order: 4,
    role: 'teacher',
  },
  {
    id: 't-profile',
    icon: 'person',
    label: '마이페이지',
    href: '/teacher/profile',
    match: ['/teacher/profile'],
    isActive: true,
    order: 5,
    role: 'teacher',
  },
];

interface NavigationState {
  studentItems: NavItem[];
  teacherItems: NavItem[];
  getItems: (role: 'student' | 'teacher') => NavItem[];
  updateItem: (role: 'student' | 'teacher', id: string, updates: Partial<NavItem>) => void;
  addItem: (role: 'student' | 'teacher', item: { label: string; href: string; icon: string; match?: string[] }) => void;
  removeItem: (role: 'student' | 'teacher', id: string) => void;
  toggleItemActive: (role: 'student' | 'teacher', id: string) => void;
  moveItem: (role: 'student' | 'teacher', id: string, direction: 'up' | 'down') => void;
  resetToDefault: (role?: 'student' | 'teacher') => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      studentItems: DEFAULT_STUDENT_ITEMS,
      teacherItems: DEFAULT_TEACHER_ITEMS,

      getItems: (role: 'student' | 'teacher') => {
        const items = role === 'teacher' ? get().teacherItems : get().studentItems;
        return [...items].sort((a, b) => a.order - b.order);
      },

      updateItem: (role, id, updates) => {
        const key = role === 'teacher' ? 'teacherItems' : 'studentItems';
        set((state) => ({
          [key]: state[key].map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));
      },

      addItem: (role, { label, href, icon, match }) => {
        const key = role === 'teacher' ? 'teacherItems' : 'studentItems';
        const currentItems = get()[key];
        const newOrder = currentItems.length ? Math.max(...currentItems.map((i) => i.order)) + 1 : 1;
        const newItem: NavItem = {
          id: `${role[0]}-custom-${Date.now()}`,
          icon: icon || 'link',
          label,
          href,
          match: match && match.length ? match : [href],
          isActive: true,
          order: newOrder,
          role,
        };
        set({
          [key]: [...currentItems, newItem],
        });
      },

      removeItem: (role, id) => {
        const key = role === 'teacher' ? 'teacherItems' : 'studentItems';
        set((state) => ({
          [key]: state[key].filter((item) => item.id !== id),
        }));
      },

      toggleItemActive: (role, id) => {
        const key = role === 'teacher' ? 'teacherItems' : 'studentItems';
        set((state) => ({
          [key]: state[key].map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)),
        }));
      },

      moveItem: (role, id, direction) => {
        const key = role === 'teacher' ? 'teacherItems' : 'studentItems';
        const list = [...get()[key]].sort((a, b) => a.order - b.order);
        const index = list.findIndex((i) => i.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === list.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
        set({ [key]: reordered });
      },

      resetToDefault: (role) => {
        if (!role) {
          set({ studentItems: DEFAULT_STUDENT_ITEMS, teacherItems: DEFAULT_TEACHER_ITEMS });
        } else if (role === 'student') {
          set({ studentItems: DEFAULT_STUDENT_ITEMS });
        } else {
          set({ teacherItems: DEFAULT_TEACHER_ITEMS });
        }
      },
    }),
    {
      name: 'gossaem-navigation-menu-storage-v1',
    }
  )
);
