import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LessonLanguage = {
  id: string;
  label: string;
  isActive: boolean;
  isDefault?: boolean;
};

export type LessonDurationOption = {
  id: string;
  label: string;
  minutes: number;
  isActive: boolean;
  isDefault?: boolean;
};

export type LessonLevelOption = {
  id: string;
  label: string;
  isActive: boolean;
};

export type LessonCategoryOption = {
  id: string;
  label: string;
  isActive: boolean;
};

export const DEFAULT_LANGUAGES: LessonLanguage[] = [
  { id: 'ko', label: '한국어', isActive: true, isDefault: true },
  { id: 'en', label: '영어', isActive: true },
  { id: 'ja', label: '일본어', isActive: true },
  { id: 'zh', label: '중국어', isActive: true },
  { id: 'es', label: '스페인어', isActive: true },
  { id: 'vi', label: '베트남어', isActive: true },
];

export const DEFAULT_DURATIONS: LessonDurationOption[] = [
  { id: 'd-50', label: '50분 수업', minutes: 50, isActive: true, isDefault: true },
  { id: 'd-70', label: '70분 수업', minutes: 70, isActive: true },
  { id: 'd-30', label: '30분 체험', minutes: 30, isActive: false },
  { id: 'd-90', label: '90분 심화', minutes: 90, isActive: false },
];

export const DEFAULT_LEVELS: LessonLevelOption[] = [
  { id: 'lv-intro', label: '입문', isActive: true },
  { id: 'lv-elem', label: '초급', isActive: true },
  { id: 'lv-inter', label: '중급', isActive: true },
  { id: 'lv-adv', label: '고급', isActive: true },
  { id: 'lv-biz', label: '비즈니스', isActive: true },
];

export const DEFAULT_CATEGORIES: LessonCategoryOption[] = [
  { id: 'cat-topik', label: 'TOPIK', isActive: true },
  { id: 'cat-conv', label: '회화', isActive: true },
  { id: 'cat-biz', label: '비즈니스', isActive: true },
  { id: 'cat-pron', label: '발음 교정', isActive: true },
  { id: 'cat-hobby', label: '취미/문화', isActive: true },
];

type LessonConfigState = {
  languages: LessonLanguage[];
  durations: LessonDurationOption[];
  levels: LessonLevelOption[];
  categories: LessonCategoryOption[];

  // Language Actions
  addLanguage: (label: string) => void;
  toggleLanguageActive: (id: string) => void;
  setDefaultLanguage: (id: string) => void;
  removeLanguage: (id: string) => void;

  // Duration Actions
  addDuration: (label: string, minutes: number) => void;
  toggleDurationActive: (id: string) => void;
  setDefaultDuration: (id: string) => void;
  removeDuration: (id: string) => void;

  // Level & Category Actions
  addLevel: (label: string) => void;
  toggleLevelActive: (id: string) => void;
  removeLevel: (id: string) => void;
  addCategory: (label: string) => void;
  toggleCategoryActive: (id: string) => void;
  removeCategory: (id: string) => void;

  // Reset
  resetToDefault: () => void;
};

export const useLessonConfigStore = create<LessonConfigState>()(
  persist(
    (set) => ({
      languages: DEFAULT_LANGUAGES,
      durations: DEFAULT_DURATIONS,
      levels: DEFAULT_LEVELS,
      categories: DEFAULT_CATEGORIES,

      // Languages
      addLanguage: (label: string) =>
        set((state) => {
          const trimmed = label.trim();
          if (!trimmed || state.languages.some((l) => l.label === trimmed)) return state;
          const newLang: LessonLanguage = {
            id: `lang-${Date.now()}`,
            label: trimmed,
            isActive: true,
          };
          return { languages: [...state.languages, newLang] };
        }),

      toggleLanguageActive: (id: string) =>
        set((state) => ({
          languages: state.languages.map((l) =>
            l.id === id ? { ...l, isActive: !l.isActive } : l
          ),
        })),

      setDefaultLanguage: (id: string) =>
        set((state) => ({
          languages: state.languages.map((l) => ({
            ...l,
            isDefault: l.id === id,
            isActive: l.id === id ? true : l.isActive,
          })),
        })),

      removeLanguage: (id: string) =>
        set((state) => {
          if (state.languages.length <= 1) return state;
          return { languages: state.languages.filter((l) => l.id !== id) };
        }),

      // Durations
      addDuration: (label: string, minutes: number) =>
        set((state) => {
          const trimmed = label.trim();
          if (!trimmed || minutes <= 0 || state.durations.some((d) => d.minutes === minutes)) return state;
          const newDur: LessonDurationOption = {
            id: `dur-${Date.now()}`,
            label: trimmed,
            minutes,
            isActive: true,
          };
          return {
            durations: [...state.durations, newDur].sort((a, b) => a.minutes - b.minutes),
          };
        }),

      toggleDurationActive: (id: string) =>
        set((state) => ({
          durations: state.durations.map((d) =>
            d.id === id ? { ...d, isActive: !d.isActive } : d
          ),
        })),

      setDefaultDuration: (id: string) =>
        set((state) => ({
          durations: state.durations.map((d) => ({
            ...d,
            isDefault: d.id === id,
            isActive: d.id === id ? true : d.isActive,
          })),
        })),

      removeDuration: (id: string) =>
        set((state) => {
          if (state.durations.length <= 1) return state;
          return { durations: state.durations.filter((d) => d.id !== id) };
        }),

      // Levels
      addLevel: (label: string) =>
        set((state) => {
          const trimmed = label.trim();
          if (!trimmed || state.levels.some((l) => l.label === trimmed)) return state;
          return { levels: [...state.levels, { id: `lv-${Date.now()}`, label: trimmed, isActive: true }] };
        }),

      toggleLevelActive: (id: string) =>
        set((state) => ({
          levels: state.levels.map((l) =>
            l.id === id ? { ...l, isActive: !l.isActive } : l
          ),
        })),

      removeLevel: (id: string) =>
        set((state) => {
          if (state.levels.length <= 1) return state;
          return { levels: state.levels.filter((l) => l.id !== id) };
        }),

      // Categories
      addCategory: (label: string) =>
        set((state) => {
          const trimmed = label.trim();
          if (!trimmed || state.categories.some((c) => c.label === trimmed)) return state;
          return { categories: [...state.categories, { id: `cat-${Date.now()}`, label: trimmed, isActive: true }] };
        }),

      toggleCategoryActive: (id: string) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          ),
        })),

      removeCategory: (id: string) =>
        set((state) => {
          if (state.categories.length <= 1) return state;
          return { categories: state.categories.filter((c) => c.id !== id) };
        }),

      // Reset
      resetToDefault: () =>
        set({
          languages: DEFAULT_LANGUAGES,
          durations: DEFAULT_DURATIONS,
          levels: DEFAULT_LEVELS,
          categories: DEFAULT_CATEGORIES,
        }),
    }),
    {
      name: 'gossaem-lesson-config-storage',
    }
  )
);
