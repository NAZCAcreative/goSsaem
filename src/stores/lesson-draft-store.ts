import { create } from 'zustand';

export type LessonDraftType = 'group' | '1on1' | 'live';

type LessonDraftFields = {
  schedulingMode: 'fixed' | 'request';
  weekdays: number[];
  duration: string;
  language: string;
  supportedLanguages: string[];
  capacity: number;
  hasTargetAudience: boolean;
  imageUrl: string;
  videoUrl: string;
  title: string;
  level: string;
  category: string;
  price: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
};

type LessonDraftState = LessonDraftFields & {
  type: LessonDraftType;
  freeTrial: boolean;
  setType: (type: LessonDraftType) => void;
  setField: <K extends keyof LessonDraftFields>(key: K, value: LessonDraftFields[K]) => void;
  setFreeTrial: (value: boolean) => void;
  reset: () => void;
};

const initialFields: LessonDraftFields = {
  schedulingMode: 'fixed',
  weekdays: [],
  duration: '50',
  language: '한국어',
  supportedLanguages: ['한국어'],
  capacity: 2,
  hasTargetAudience: true,
  imageUrl: '',
  videoUrl: '',
  title: '',
  level: '누구나',
  category: '',
  price: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
};

export const useLessonDraftStore = create<LessonDraftState>((set) => ({
  ...initialFields,
  type: 'group',
  freeTrial: false,
  setType: (type) => set({ type }),
  setField: (key, value) => set({ [key]: value } as Partial<LessonDraftState>),
  setFreeTrial: (freeTrial) => set({ freeTrial }),
  reset: () => set({ ...initialFields, type: 'group', freeTrial: false }),
}));
