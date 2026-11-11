'use client';

import { showWarning } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, ReactNode, useEffect, useRef } from 'react';
import { useLessonDraftStore } from '@/stores/lesson-draft-store';
import { useLessonConfigStore, DEFAULT_SUPPORTED_LANGUAGES } from '@/stores/lesson-config-store';
import {
  LESSON_CATEGORIES as DEFAULT_CATEGORIES,
  LESSON_LEVELS as DEFAULT_LEVELS,
  LESSON_LANGUAGES as DEFAULT_LANGUAGES,
} from '@/lib/lessonOptions';

function calculateEndTime(startTime: string, minutes: number): string {
  if (!startTime || !startTime.includes(':')) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function getKstDateRange() {
  const now = new Date();
  const kstTime = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  const minDate = kstTime.toISOString().slice(0, 10);
  const maxObj = new Date(kstTime);
  maxObj.setDate(maxObj.getDate() + 92); // 최대 약 3개월
  const maxDate = maxObj.toISOString().slice(0, 10);
  return { minDate, maxDate };
}

// 24시간 48개 30분 슬롯 (00:00 ~ 23:30)
const TIME_SLOTS_30MIN = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${period} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { value: time, label, period, fullLabel: `${period} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} (${time})` };
});

export default function LessonCreationDetailsPage() {
  const router = useRouter();
  const draft = useLessonDraftStore();
  const config = useLessonConfigStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { minDate, maxDate } = getKstDateRange();

  // 수업 진행 언어 옵션
  const activeLanguages = config.languages.filter((l) => l.isActive).map((l) => l.label);
  const languageOptions = activeLanguages.length > 0 ? activeLanguages : DEFAULT_LANGUAGES;

  // 선생님 가능 언어 / 대응 언어 옵션
  const supportedConfig = config.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
  const activeSupported = supportedConfig.filter((l) => l.isActive).map((l) => l.label);
  const supportedLanguageOptions =
    activeSupported.length > 0 ? activeSupported : DEFAULT_SUPPORTED_LANGUAGES.map((l) => l.label);

  const activeDurations = config.durations.filter((d) => d.isActive);
  const durationOptions =
    activeDurations.length > 0
      ? activeDurations
      : [
          { id: 'd-50', label: '50분 수업', minutes: 50, isActive: true },
          { id: 'd-70', label: '70분 수업', minutes: 70, isActive: true },
        ];

  const activeCategories = config.categories.filter((c) => c.isActive).map((c) => c.label);
  const categoryOptions = activeCategories.length > 0 ? activeCategories : DEFAULT_CATEGORIES;

  const activeLevels = config.levels.filter((l) => l.isActive).map((l) => l.label);
  const baseLevels = activeLevels.length > 0 ? activeLevels : DEFAULT_LEVELS;
  // '누구나'가 항상 목록의 맨 앞에 있도록 보장
  const levelOptions = baseLevels.includes('누구나')
    ? ['누구나', ...baseLevels.filter((lvl) => lvl !== '누구나')]
    : ['누구나', ...baseLevels];

  useEffect(() => {
    if (!draft.type) router.replace('/teacher/lessons/new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  // Set default duration, language, capacity, target audience if not set
  useEffect(() => {
    if (!draft.duration) {
      const defaultDur = durationOptions.find((d) => d.isDefault) || durationOptions[0];
      if (defaultDur) draft.setField('duration', String(defaultDur.minutes));
    }
    if (!draft.language) {
      const defaultLang = config.languages.find((l) => l.isDefault)?.label || languageOptions[0] || '한국어';
      draft.setField('language', defaultLang);
    }
    if (!draft.supportedLanguages || draft.supportedLanguages.length === 0) {
      draft.setField('supportedLanguages', ['한국어']);
    }
    if (draft.hasTargetAudience === undefined) {
      draft.setField('hasTargetAudience', true);
    }
    if (draft.hasTargetAudience && !draft.level) {
      draft.setField('level', '누구나');
    }
    // 수업인원은 기본 2명으로 신청
    if (!draft.capacity || draft.capacity !== 2) {
      draft.setField('capacity', 2);
    }
    // 기본 시작 시간 설정 (비어있으면 14:00으로 설정)
    if (!draft.startTime) {
      draft.setField('startTime', '14:00');
      const mins = Number(draft.duration) || 50;
      draft.setField('endTime', calculateEndTime('14:00', mins));
    } else if (draft.startTime && draft.startTime.includes(':')) {
      const [h, m] = draft.startTime.split(':');
      const numM = Number(m);
      if (numM !== 0 && numM !== 30) {
        const normalizedM = numM < 30 ? '00' : '30';
        const normalizedStart = `${h}:${normalizedM}`;
        draft.setField('startTime', normalizedStart);
        const mins = Number(draft.duration) || 50;
        const computedEnd = calculateEndTime(normalizedStart, mins);
        if (computedEnd) draft.setField('endTime', computedEnd);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft.type) return null;

  const handleDurationSelect = (mins: number) => {
    draft.setField('duration', String(mins));
    if (draft.startTime) {
      const computedEnd = calculateEndTime(draft.startTime, mins);
      if (computedEnd) draft.setField('endTime', computedEnd);
    }
  };

  const handleStartTimeChange = (newStartTime: string) => {
    draft.setField('startTime', newStartTime);
    const mins = Number(draft.duration) || 50;
    if (newStartTime && mins > 0) {
      const computedEnd = calculateEndTime(newStartTime, mins);
      if (computedEnd) draft.setField('endTime', computedEnd);
    }
  };

  const toggleSupportedLanguage = (lang: string) => {
    const list = draft.supportedLanguages || ['한국어'];
    if (list.includes(lang)) {
      if (list.length <= 1) {
        showWarning('선생님 대응 언어는 최소 1개 이상 선택해야 합니다.');
        return;
      }
      draft.setField(
        'supportedLanguages',
        list.filter((l) => l !== lang)
      );
    } else {
      draft.setField('supportedLanguages', [...list, lang]);
    }
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showWarning('이미지 파일(JPG, PNG, WebP)만 선택해주세요.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showWarning('이미지 파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        draft.setField('imageUrl', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (!draft.title.trim()) {
      showWarning('수업 제목을 입력해주세요');
      return;
    }
    if (!draft.language) {
      showWarning('수업 진행 언어를 선택해주세요');
      return;
    }
    if (!draft.supportedLanguages || draft.supportedLanguages.length === 0) {
      showWarning('선생님 대응 가능 언어를 1개 이상 선택해주세요');
      return;
    }
    // 수업인원은 기본 2명으로 신청, 3명 4명은 관리자의 승인이 있어야 등록가능
    if (draft.capacity > 2) {
      showWarning('수업 인원은 기본 2명으로 신청됩니다. 3명 및 4명은 관리자의 승인이 있어야 등록 가능합니다.');
      return;
    }
    if ((draft.schedulingMode === 'fixed' && !draft.date) || !draft.startTime || !draft.endTime) {
      showWarning('수업 날짜와 시간을 입력해주세요');
      return;
    }
    if (draft.schedulingMode === 'fixed') {
      if (draft.date < minDate || draft.date > maxDate) {
        showWarning(`수업 날짜는 오늘(${minDate})부터 3개월 이내(${maxDate}까지)로만 설정할 수 있습니다.`);
        return;
      }
    }
    const startM = Number(draft.startTime.split(':')[1]);
    if (Number.isNaN(startM) || (startM !== 0 && startM !== 30)) {
      showWarning('수업 시작 시간은 30분 단위(:00 또는 :30)로 선택해주세요');
      return;
    }
    if (!draft.price || Number(draft.price) <= 0) {
      showWarning('수강료를 입력해주세요');
      return;
    }
    if (!categoryOptions.includes(draft.category)) return showWarning('카테고리를 선택해주세요');
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
    const windowMinutes = minutes(draft.endTime) - minutes(draft.startTime);
    if (windowMinutes <= 0) return showWarning('종료 시간은 시작 시간 이후여야 합니다');
    if (
      draft.schedulingMode === 'fixed' &&
      (windowMinutes < 10 ||
        windowMinutes > 240 ||
        new Date(draft.date + 'T' + draft.startTime + ':00+09:00').getTime() <= Date.now())
    )
      return showWarning('미래의 날짜와 10~240분의 수업 시간을 선택해주세요');

    router.push('/teacher/lessons/new/confirm');
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background px-container-margin pb-32 pt-stack-md font-body-md text-on-background">
      <div className="sticky top-[56px] z-40 -mx-container-margin bg-surface px-container-margin shadow-xs">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/teacher/lessons/new"
            className="text-on-surface-variant transition-opacity hover:opacity-80 active:scale-[0.98]"
            aria-label="이전 단계"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">수업 정보 입력</h1>
          <div className="w-6" />
        </div>
      </div>

      <section className="mt-stack-md flex flex-col gap-stack-sm">
        <div className="flex items-center justify-between px-1">
          <span className="font-label-lg text-label-lg text-on-surface-variant">Step 2 of 3</span>
          <span className="font-label-lg text-label-lg text-primary">상세 정보</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full w-2/3 rounded-full primary-gradient transition-all duration-500" />
        </div>
      </section>

      <form className="mt-section-gap flex flex-col gap-stack-lg" onSubmit={(event) => event.preventDefault()}>
        {/* 1. 수업 대표 이미지 및 소개 영상 등록 (선택 사항 - 처음에 위치) */}
        <FieldCard label="수업 대표 이미지 & 소개 영상">
          <div className="space-y-4">
            {/* 대표 이미지 등록 (선택) */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">image</span>
                  대표 이미지 등록
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  선택 사항
                </span>
              </div>

              {draft.imageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="relative aspect-video w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.imageUrl}
                      alt="수업 대표 이미지 미리보기"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                      이미지 선택됨
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        onClick={() => draft.setField('imageUrl', '')}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-3xl text-primary mb-1">add_photo_alternate</span>
                  <span className="text-sm font-bold text-on-surface">클릭하여 이미지 파일 등록</span>
                  <span className="mt-1 text-xs text-on-surface-variant">
                    JPG, PNG, WebP (최대 5MB) · 미등록 시 기본 커버 적용
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>

            {/* 소개 영상 링크 (선택) */}
            <div className="border-t border-outline-variant/30 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5" htmlFor="lesson-video-url">
                  <span className="material-symbols-outlined text-base text-red-500">smart_display</span>
                  수업 소개 영상 링크
                </label>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  선택 사항
                </span>
              </div>
              <input
                id="lesson-video-url"
                type="url"
                placeholder="예: https://www.youtube.com/watch?v=..."
                value={draft.videoUrl}
                onChange={(e) => draft.setField('videoUrl', e.target.value)}
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-xs text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-[11px] text-on-surface-variant">
                YouTube 또는 영상 링크를 등록하면 수업 상세 페이지에 영상이 연결됩니다.
              </p>
            </div>
          </div>
        </FieldCard>

        {/* 2. 수업 제목 */}
        <FieldCard label="수업 제목" htmlFor="lesson-title">
          <input
            id="lesson-title"
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="예: 기초부터 탄탄하게! 실전 한국어 회화"
            type="text"
            value={draft.title}
            onChange={(event) => draft.setField('title', event.target.value)}
          />
        </FieldCard>

        {/* 3. 수업 진행 언어 (주 언어 - 1개 선택) */}
        <FieldCard label="수업 진행 언어 (주 언어)">
          <ChipGroup
            items={languageOptions}
            selected={draft.language || '한국어'}
            onSelect={(value) => draft.setField('language', value)}
          />
          <p className="mt-2 text-xs text-on-surface-variant">
            수업 진행 시 주로 사용할 메인 언어를 1개 선택해주세요. (현재: {draft.language || '한국어'})
          </p>
        </FieldCard>

        {/* 4. 선생님 가능 언어 · 대응 언어 (다중 선택 가능) */}
        <FieldCard label="선생님 가능 언어 · 대응 언어 (다중 선택)">
          <div className="flex flex-wrap gap-2">
            {supportedLanguageOptions.map((lang) => {
              const isSelected = (draft.supportedLanguages || ['한국어']).includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleSupportedLanguage(lang)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? 'border-2 border-primary bg-primary text-white shadow-xs'
                      : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>{lang}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            선생님이 학생과 의사소통 및 질의응답이 가능한 언어를 모두 선택해주세요. (선택됨:{' '}
            <span className="font-semibold text-primary">{(draft.supportedLanguages || ['한국어']).join(', ')}</span>)
          </p>
        </FieldCard>

        {/* 5. 수업 정원 (인원 설정): 기본 2명, 3명/4명은 관리자 승인 필요 */}
        <FieldCard label="수업 정원 (인원 설정)">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5">
              {/* 2명 (기본) */}
              <button
                type="button"
                onClick={() => draft.setField('capacity', 2)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  draft.capacity === 2
                    ? 'border-2 border-primary bg-primary text-white shadow-xs ring-2 ring-primary/20'
                    : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">group</span>
                <span>2명 (기본 정원)</span>
                {draft.capacity === 2 && <span className="material-symbols-outlined text-base">check</span>}
              </button>

              {/* 3명 (관리자 승인 필요) */}
              <button
                type="button"
                onClick={() => {
                  showWarning('3명 수업은 관리자의 승인이 있어야 등록 가능합니다. 기본 2명 수업으로 개설해주세요.');
                }}
                className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm font-semibold text-slate-400 opacity-70 hover:opacity-90 transition-all cursor-not-allowed"
                title="관리자 승인 필요"
              >
                <span className="material-symbols-outlined text-lg text-slate-400">lock</span>
                <span>3명</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                  관리자 승인 필요
                </span>
              </button>

              {/* 4명 (관리자 승인 필요) */}
              <button
                type="button"
                onClick={() => {
                  showWarning('4명 수업은 관리자의 승인이 있어야 등록 가능합니다. 기본 2명 수업으로 개설해주세요.');
                }}
                className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm font-semibold text-slate-400 opacity-70 hover:opacity-90 transition-all cursor-not-allowed"
                title="관리자 승인 필요"
              >
                <span className="material-symbols-outlined text-lg text-slate-400">lock</span>
                <span>4명</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                  관리자 승인 필요
                </span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              수업 개설은 <span className="font-semibold text-primary">무조건 기본 2명 그룹</span>으로 시작됩니다. 3명
              또는 4명 수업 개설은 관리자 승인 후 가능합니다.
            </p>
          </div>
        </FieldCard>

        {/* 6. 수업 대상 (활성화 / 비활성화 전환 및 누구나 버튼) */}
        <FieldCard label="수업 대상 (권장 난이도)">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
              <div>
                <span className="text-xs font-bold text-on-surface">수업 대상 설정 여부</span>
                <p className="text-[11px] text-on-surface-variant">
                  {draft.hasTargetAudience
                    ? '수업 대상을 지정하여 학생 맞춤형 레벨로 개설합니다.'
                    : '수업 대상을 별도로 지정하지 않아 누구나 수강할 수 있습니다.'}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-surface-container-high p-1">
                <button
                  type="button"
                  id="target-audience-active-btn"
                  onClick={() => {
                    draft.setField('hasTargetAudience', true);
                    if (!draft.level) draft.setField('level', '누구나');
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    draft.hasTargetAudience
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  활성화
                </button>
                <button
                  type="button"
                  id="target-audience-inactive-btn"
                  onClick={() => {
                    draft.setField('hasTargetAudience', false);
                    draft.setField('level', '');
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    !draft.hasTargetAudience
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  비활성화
                </button>
              </div>
            </div>

            {draft.hasTargetAudience ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    권장 대상 레벨 선택 ({draft.level || '누구나'})
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    &apos;누구나&apos; 버튼 포함
                  </span>
                </div>
                <ChipGroup
                  items={levelOptions}
                  selected={draft.level || '누구나'}
                  onSelect={(value) => draft.setField('level', value)}
                />
                <p className="mt-2 text-xs text-on-surface-variant">
                  &apos;누구나&apos;를 선택하시면 특정 레벨 제한 없이 모든 학생이 자유롭게 수강할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700">
                <span className="material-symbols-outlined text-lg text-slate-500">public</span>
                <div>
                  <span className="font-bold text-slate-900 block">수업 대상 미지정 (비활성화 상태)</span>
                  <span className="text-slate-600">
                    특정 대상을 제한하지 않으며, 누구나 참여할 수 있는 열린 수업으로 개설됩니다.
                  </span>
                </div>
              </div>
            )}
          </div>
        </FieldCard>

        {/* 7. 카테고리 */}
        <FieldCard label="카테고리">
          <ChipGroup
            items={categoryOptions}
            selected={draft.category}
            onSelect={(value) => draft.setField('category', value)}
          />
          <p className="mt-2 text-xs text-on-surface-variant">학생에게 표시할 수업 카테고리를 선택해주세요.</p>
        </FieldCard>

        {/* 8. 수업 개설 방식 */}
        <FieldCard label="수업 개설 방식">
          <div className="flex gap-3">
            {(['fixed', 'request'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={draft.schedulingMode === mode}
                onClick={() => draft.setField('schedulingMode', mode)}
                className={
                  draft.schedulingMode === mode
                    ? 'rounded-lg border p-3 bg-primary text-white font-semibold'
                    : 'rounded-lg border p-3 hover:bg-surface-container-low'
                }
              >
                {mode === 'fixed' ? '시간 확정형' : '학생 신청형'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-on-surface-variant">
            {draft.schedulingMode === 'fixed'
              ? '정해진 날짜와 시간에 수업을 개설합니다. 시작 시간을 지정하고 50분/70분 수업을 선택하면 종료 시간이 자동 계산됩니다.'
              : '매주 가능한 시간 중 학생이 선택하면 일정이 생성됩니다. 예약은 결제 완료 후 확정됩니다.'}
          </p>
        </FieldCard>

        {draft.schedulingMode === 'request' && (
          <FieldCard label="매주 가능한 요일 및 회당 수업 시간">
            <div className="flex flex-wrap gap-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={draft.weekdays.includes(index)}
                  className={
                    draft.weekdays.includes(index)
                      ? 'rounded-lg border p-3 bg-primary text-white font-semibold'
                      : 'rounded-lg border p-3 hover:bg-surface-container-low'
                  }
                  onClick={() =>
                    draft.setField(
                      'weekdays',
                      draft.weekdays.includes(index)
                        ? draft.weekdays.filter((value) => value !== index)
                        : [...draft.weekdays, index]
                    )
                  }
                >
                  {day}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="회당 수업 시간(분) (10~240)"
              value={draft.duration}
              min={10}
              max={240}
              onChange={(event) => draft.setField('duration', event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
            />
          </FieldCard>
        )}

        {/* 9. 수업 날짜 및 시간 (한국 시간) */}
        <FieldCard
          label={
            draft.schedulingMode === 'fixed'
              ? '수업 날짜 및 시간 (한국 시간)'
              : '신청 가능한 시간대 (한국 시간)'
          }
        >
          <div className="space-y-4">
            <div hidden={draft.schedulingMode === 'request'}>
              <div className="mb-2 flex items-center justify-between">
                <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="lesson-date">
                  수업 날짜
                </label>
                <span className="text-xs text-primary font-semibold">현재일 기준 최대 3개월까지 선택 가능</span>
              </div>
              <input
                disabled={draft.schedulingMode === 'request'}
                id="lesson-date"
                type="date"
                min={minDate}
                max={maxDate}
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.date}
                onChange={(event) => draft.setField('date', event.target.value)}
              />
              <p className="mt-1.5 text-xs text-on-surface-variant">
                수업 날짜는 오늘({minDate})부터{' '}
                <span className="font-semibold text-primary">최대 3개월({maxDate})</span>까지 설정할 수 있습니다.
              </p>
            </div>

            {/* 시작 시간 입력: 스크롤로 30분 단위 바로 선택 */}
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-label-sm text-label-sm font-bold text-on-surface" htmlFor="start-time">
                    수업 시작 시간 <span className="text-primary text-xs font-semibold">(30분 단위 스크롤 선택)</span>
                  </label>
                  <p className="text-xs text-on-surface-variant">
                    00분 및 30분 단위 슬롯을 스크롤하여 바로 선택하실 수 있습니다.
                  </p>
                </div>
                {draft.startTime && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {draft.startTime} 선택됨
                  </span>
                )}
              </div>

              {/* 1. 드롭다운 스크롤 선택 (모바일 네이티브 스크롤 휠 & 데스크톱 드롭다운) */}
              <div className="relative">
                <select
                  id="start-time"
                  value={draft.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary pr-9"
                >
                  <option value="">수업 시작 시간 선택 (30분 단위)</option>
                  <optgroup label="오전 슬롯 (00:00 ~ 11:30)">
                    {TIME_SLOTS_30MIN.filter((s) => s.period === '오전').map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.fullLabel}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="오후 슬롯 (12:00 ~ 23:30)">
                    {TIME_SLOTS_30MIN.filter((s) => s.period === '오후').map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.fullLabel}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  unfold_more
                </span>
              </div>

              {/* 2. 스크롤 박스로 바로 클릭하여 선택 (빠른 스크롤 슬롯 컨테이너) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">swap_vert</span>
                    전체 시간 스크롤 목록에서 바로 선택
                  </span>
                  <span className="text-[11px] text-slate-400">48개 슬롯 (00:00 ~ 23:30)</span>
                </div>
                <div
                  id="time-slot-scroll-container"
                  className="grid max-h-40 grid-cols-3 sm:grid-cols-4 gap-1.5 overflow-y-auto p-1 scrollbar-thin"
                >
                  {TIME_SLOTS_30MIN.map((slot) => {
                    const isSelected = draft.startTime === slot.value;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => handleStartTimeChange(slot.value)}
                        className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 text-center transition-all ${
                          isSelected
                            ? 'primary-gradient text-white shadow-xs font-bold scale-[1.02]'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <span className="text-xs font-bold">{slot.value}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {slot.period}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 수업 시간 길이 선택: 50분 수업, 70분 수업 (시작 시간부터 자동 계산) */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-sm text-xs font-bold text-primary">
                  수업 시간 선택 (시작 시간부터 자동 계산)
                </span>
                {draft.duration && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    {draft.duration}분 선택됨
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {durationOptions.map((opt) => {
                  const isSel = String(opt.minutes) === String(draft.duration);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleDurationSelect(opt.minutes)}
                      className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl py-3 px-3 text-sm font-bold transition-all ${
                        isSel
                          ? 'primary-gradient text-white shadow-xs scale-[1.02]'
                          : 'border border-outline-variant/60 bg-white text-on-surface hover:border-primary/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">timer</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                {draft.startTime
                  ? `시작 시간(${draft.startTime}) 기준으로 종료 시간이 ${draft.endTime || '계산 중'}으로 자동 설정됩니다.`
                  : '시작 시간(30분 단위)을 먼저 선택하시면 종료 시간이 자동으로 설정됩니다.'}
              </p>
            </div>

            {/* 종료 시간 확인 / 미세 조정 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor="end-time">
                  수업 종료 시간
                </label>
                {draft.startTime && draft.endTime && (
                  <span className="text-xs font-mono text-primary font-bold">
                    진행: {draft.startTime} ~ {draft.endTime} ({draft.duration}분)
                  </span>
                )}
              </div>
              <input
                id="end-time"
                type="time"
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.endTime}
                onChange={(event) => draft.setField('endTime', event.target.value)}
              />
            </div>
          </div>
        </FieldCard>

        {/* 10. 수강료 */}
        <FieldCard label="회당 수강료 (원)" htmlFor="lesson-price">
          <div className="relative">
            <input
              id="lesson-price"
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-3 pl-4 pr-12 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              type="number"
              value={draft.price}
              onChange={(event) => draft.setField('price', event.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">원</span>
          </div>
        </FieldCard>

        {/* 11. 상세 설명 */}
        <FieldCard label="수업 상세 설명" htmlFor="lesson-description">
          <textarea
            id="lesson-description"
            className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="수강 대상, 커리큘럼, 수업 방식 등을 자세히 적어주세요."
            rows={5}
            value={draft.description}
            onChange={(event) => draft.setField('description', event.target.value)}
          />
        </FieldCard>
      </form>

      <div className="mt-10 mb-16">
        <button
          type="button"
          onClick={handleNext}
          className="block w-full rounded-xl primary-gradient-btn py-4 text-center font-label-lg text-label-lg text-white shadow-xs transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          다음 단계로 (수업 개설 확인)
        </button>
      </div>
    </main>
  );
}

function FieldCard({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-xs">
      <label className="mb-stack-sm block font-label-lg text-label-lg text-on-surface font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </section>
  );
}

function ChipGroup({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`rounded-lg px-4 py-2 font-label-sm text-label-sm transition-colors ${
              active
                ? 'border-2 border-primary bg-primary text-white font-bold shadow-xs'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
