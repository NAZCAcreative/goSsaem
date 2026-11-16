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

export type CapacityPolicyOption = {
  capacity: number;
  label: string;
  isDefault: boolean;
  requiresApproval: boolean;
  isApproved: boolean;
};

export const DEFAULT_LANGUAGES: LessonLanguage[] = [
  { id: 'ko', label: '한국어', isActive: true, isDefault: true },
  { id: 'en', label: '영어', isActive: true },
  { id: 'ja', label: '일본어', isActive: true },
  { id: 'zh', label: '중국어', isActive: true },
  { id: 'es', label: '스페인어', isActive: true },
  { id: 'vi', label: '베트남어', isActive: true },
];

export const DEFAULT_SUPPORTED_LANGUAGES: LessonLanguage[] = [
  { id: 'slang-ko', label: '한국어', isActive: true, isDefault: true },
  { id: 'slang-en', label: '영어', isActive: true },
  { id: 'slang-ja', label: '일본어', isActive: true },
  { id: 'slang-zh', label: '중국어', isActive: true },
  { id: 'slang-es', label: '스페인어', isActive: true },
  { id: 'slang-vi', label: '베트남어', isActive: true },
];

export const DEFAULT_DURATIONS: LessonDurationOption[] = [
  { id: 'd-50', label: '50분 수업', minutes: 50, isActive: true, isDefault: true },
  { id: 'd-70', label: '70분 수업', minutes: 70, isActive: true },
  { id: 'd-30', label: '30분 체험', minutes: 30, isActive: false },
  { id: 'd-90', label: '90분 심화', minutes: 90, isActive: false },
];

export const DEFAULT_LEVELS: LessonLevelOption[] = [
  { id: 'lv-all', label: '누구나', isActive: true },
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

export const DEFAULT_CAPACITY_POLICIES: CapacityPolicyOption[] = [
  { capacity: 2, label: '2명 (기본 정원)', isDefault: true, requiresApproval: false, isApproved: true },
  { capacity: 3, label: '3명', isDefault: false, requiresApproval: true, isApproved: false },
  { capacity: 4, label: '4명', isDefault: false, requiresApproval: true, isApproved: false },
];

type LessonConfigState = {
  languages: LessonLanguage[];
  supportedLanguages: LessonLanguage[];
  durations: LessonDurationOption[];
  levels: LessonLevelOption[];
  categories: LessonCategoryOption[];
  allow1on1Approval: boolean;
  capacityPolicies: CapacityPolicyOption[];
  isLevelFieldEnabled: boolean;

  // Capacity & 1:1 Approval Actions
  toggle1on1Approval: () => void;
  toggleCapacityApproval: (capacity: number) => void;

  // Target Audience Master Switch
  toggleLevelFieldEnabled: () => void;

  // Language Actions (진행 언어)
  addLanguage: (label: string) => void;
  updateLanguage: (id: string, newLabel: string) => void;
  toggleLanguageActive: (id: string) => void;
  setDefaultLanguage: (id: string) => void;
  removeLanguage: (id: string) => void;

  // Supported Language Actions (선생님 가능 언어 / 대응 언어)
  addSupportedLanguage: (label: string) => void;
  updateSupportedLanguage: (id: string, newLabel: string) => void;
  toggleSupportedLanguageActive: (id: string) => void;
  removeSupportedLanguage: (id: string) => void;

  // Duration Actions
  addDuration: (label: string, minutes: number) => void;
  updateDuration: (id: string, newLabel: string, newMinutes?: number) => void;
  toggleDurationActive: (id: string) => void;
  setDefaultDuration: (id: string) => void;
  removeDuration: (id: string) => void;

  // Level & Category Actions
  addLevel: (label: string) => void;
  updateLevel: (id: string, newLabel: string) => void;
  toggleLevelActive: (id: string) => void;
  removeLevel: (id: string) => void;

  addCategory: (label: string) => void;
  updateCategory: (id: string, newLabel: string) => void;
  toggleCategoryActive: (id: string) => void;
  removeCategory: (id: string) => void;

  // Reset
  resetToDefault: () => void;
};

export const useLessonConfigStore = create<LessonConfigState>()(
  persist(
    (set) => ({
      languages: DEFAULT_LANGUAGES,
      supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES,
      durations: DEFAULT_DURATIONS,
      levels: DEFAULT_LEVELS,
      categories: DEFAULT_CATEGORIES,
      allow1on1Approval: false,
      capacityPolicies: DEFAULT_CAPACITY_POLICIES,
      isLevelFieldEnabled: true,

      // Capacity & 1:1 Actions
      toggle1on1Approval: () =>
        set((state) => ({ allow1on1Approval: !state.allow1on1Approval })),

      toggleCapacityApproval: (cap: number) =>
        set((state) => ({
          capacityPolicies: state.capacityPolicies.map((cp) =>
            cp.capacity === cap ? { ...cp, isApproved: !cp.isApproved } : cp
          ),
        })),

      // Target Audience Master Switch
      toggleLevelFieldEnabled: () =>
        set((state) => ({ isLevelFieldEnabled: !state.isLevelFieldEnabled })),

      // Languages (진행 언어)
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

      updateLanguage: (id: string, newLabel: string) =>
        set((state) => {
          const trimmed = newLabel.trim();
          if (!trimmed) return state;
          return {
            languages: state.languages.map((l) =>
              l.id === id ? { ...l, label: trimmed } : l
            ),
          };
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

      // Supported Languages (지원 언어 / 대응 언어)
      addSupportedLanguage: (label: string) =>
        set((state) => {
          const trimmed = label.trim();
          const list = state.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
          if (!trimmed || list.some((l) => l.label === trimmed)) return state;
          const newLang: LessonLanguage = {
            id: `slang-${Date.now()}`,
            label: trimmed,
            isActive: true,
          };
          return { supportedLanguages: [...list, newLang] };
        }),

      updateSupportedLanguage: (id: string, newLabel: string) =>
        set((state) => {
          const trimmed = newLabel.trim();
          if (!trimmed) return state;
          const list = state.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
          return {
            supportedLanguages: list.map((l) =>
              l.id === id ? { ...l, label: trimmed } : l
            ),
          };
        }),

      toggleSupportedLanguageActive: (id: string) =>
        set((state) => {
          const list = state.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
          return {
            supportedLanguages: list.map((l) =>
              l.id === id ? { ...l, isActive: !l.isActive } : l
            ),
          };
        }),

      removeSupportedLanguage: (id: string) =>
        set((state) => {
          const list = state.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
          if (list.length <= 1) return state;
          return { supportedLanguages: list.filter((l) => l.id !== id) };
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
          return { durations: [...state.durations, newDur] };
        }),

      updateDuration: (id: string, newLabel: string, newMinutes?: number) =>
        set((state) => {
          const trimmed = newLabel.trim();
          if (!trimmed) return state;
          return {
            durations: state.durations.map((d) =>
              d.id === id
                ? { ...d, label: trimmed, minutes: newMinutes && newMinutes > 0 ? newMinutes : d.minutes }
                : d
            ),
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

      updateLevel: (id: string, newLabel: string) =>
        set((state) => {
          const trimmed = newLabel.trim();
          if (!trimmed) return state;
          return {
            levels: state.levels.map((l) =>
              l.id === id ? { ...l, label: trimmed } : l
            ),
          };
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

      updateCategory: (id: string, newLabel: string) =>
        set((state) => {
          const trimmed = newLabel.trim();
          if (!trimmed) return state;
          return {
            categories: state.categories.map((c) =>
              c.id === id ? { ...c, label: trimmed } : c
            ),
          };
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
          supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES,
          durations: DEFAULT_DURATIONS,
          levels: DEFAULT_LEVELS,
          categories: DEFAULT_CATEGORIES,
          allow1on1Approval: false,
          capacityPolicies: DEFAULT_CAPACITY_POLICIES,
          isLevelFieldEnabled: true,
        }),
    }),
    {
      name: 'gossaem-lesson-config-storage',
    }
  )
);
