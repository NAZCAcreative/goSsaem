import { create } from 'zustand';

export type LessonDraftType = '1on1' | 'group' | 'live';

type LessonDraftFields = {
  schedulingMode: 'fixed' | 'request';
  weekdays: number[];
  duration: string;
  language: string;
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
  type: LessonDraftType | null;
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
  title: '',
  level: '초급',
  category: '',
  price: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
};

export const useLessonDraftStore = create<LessonDraftState>((set) => ({
  ...initialFields,
  type: null,
  freeTrial: false,
  setType: (type) => set({ type }),
  setField: (key, value) => set({ [key]: value } as Partial<LessonDraftState>),
  setFreeTrial: (freeTrial) => set({ freeTrial }),
  reset: () => set({ ...initialFields, type: null, freeTrial: false }),
}));
