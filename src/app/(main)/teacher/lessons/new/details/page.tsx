'use client';

import { showWarning } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useLessonDraftStore } from '@/stores/lesson-draft-store';
import { useLessonConfigStore } from '@/stores/lesson-config-store';
import { LESSON_CATEGORIES as DEFAULT_CATEGORIES, LESSON_LEVELS as DEFAULT_LEVELS, LESSON_LANGUAGES as DEFAULT_LANGUAGES } from '@/lib/lessonOptions';

function calculateEndTime(startTime: string, minutes: number): string {
  if (!startTime || !startTime.includes(':')) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

const TIME_SLOTS_30MIN = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${period} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} (${time})`;
  return { value: time, label, period };
});

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hStr = String(i).padStart(2, '0');
  const period = i < 12 ? '오전' : '오후';
  const displayH = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return {
    value: hStr,
    label: `${period} ${displayH}시 (${hStr}:00)`,
  };
});

export default function LessonCreationDetailsPage() {
  const router = useRouter();
  const draft = useLessonDraftStore();
  const config = useLessonConfigStore();

  const activeLanguages = config.languages.filter((l) => l.isActive).map((l) => l.label);
  const languageOptions = activeLanguages.length > 0 ? activeLanguages : DEFAULT_LANGUAGES;

  const activeDurations = config.durations.filter((d) => d.isActive);
  const durationOptions = activeDurations.length > 0 ? activeDurations : [
    { id: 'd-50', label: '50분 수업', minutes: 50, isActive: true },
    { id: 'd-70', label: '70분 수업', minutes: 70, isActive: true },
  ];

  const activeCategories = config.categories.filter((c) => c.isActive).map((c) => c.label);
  const categoryOptions = activeCategories.length > 0 ? activeCategories : DEFAULT_CATEGORIES;

  const activeLevels = config.levels.filter((l) => l.isActive).map((l) => l.label);
  const levelOptions = activeLevels.length > 0 ? activeLevels : DEFAULT_LEVELS;

  useEffect(() => {
    if (!draft.type) router.replace('/teacher/lessons/new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  // Set default duration, language, capacity if not set
  useEffect(() => {
    if (!draft.duration) {
      const defaultDur = durationOptions.find((d) => d.isDefault) || durationOptions[0];
      if (defaultDur) draft.setField('duration', String(defaultDur.minutes));
    }
    if (!draft.language) {
      const defaultLang = config.languages.find((l) => l.isDefault)?.label || languageOptions[0] || '한국어';
      draft.setField('language', defaultLang);
    }
    // 수업인원은 기본 2명으로 신청
    if (!draft.capacity || draft.capacity !== 2) {
      draft.setField('capacity', 2);
    }
    // Normalize existing startTime to 30-min interval if set with irregular minutes
    if (draft.startTime && draft.startTime.includes(':')) {
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

  const currentStartHour = draft.startTime && draft.startTime.includes(':') ? draft.startTime.split(':')[0] : '';
  const currentStartMinute = draft.startTime && draft.startTime.includes(':') ? draft.startTime.split(':')[1] : '';

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

  const handleHourSelect = (hourStr: string) => {
    if (!hourStr) return;
    const minuteStr = currentStartMinute === '30' ? '30' : '00';
    handleStartTimeChange(`${hourStr}:${minuteStr}`);
  };

  const handleMinuteSelect = (minuteStr: '00' | '30') => {
    const hourStr = currentStartHour || '14';
    handleStartTimeChange(`${hourStr}:${minuteStr}`);
  };

  const handleNext = () => {
    if (!draft.title.trim()) {
      showWarning('수업 제목을 입력해주세요');
      return;
    }
    if (!draft.language) {
      showWarning('수업 언어를 선택해주세요');
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
    const startM = Number(draft.startTime.split(':')[1]);
    if (Number.isNaN(startM) || (startM !== 0 && startM !== 30)) {
      showWarning('수업 시작 시간의 분은 30분 단위(:00 또는 :30)로 선택해주세요');
      return;
    }
    if (!draft.freeTrial && (!draft.price || Number(draft.price) <= 0)) {
      showWarning('수강료를 입력해주세요');
      return;
    }
    if (!categoryOptions.includes(draft.category)) return showWarning('카테고리를 선택해주세요');
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
    const windowMinutes = minutes(draft.endTime) - minutes(draft.startTime);
    if (windowMinutes <= 0) return showWarning('종료 시간은 시작 시간 이후여야 합니다');
    if (draft.schedulingMode === 'fixed' && (windowMinutes < 10 || windowMinutes > 240 || new Date(draft.date + 'T' + draft.startTime + ':00+09:00').getTime() <= Date.now())) return showWarning('미래의 날짜와 10~240분의 수업 시간을 선택해주세요');
    if (draft.schedulingMode === 'request' && (!draft.weekdays.length || !Number.isInteger(Number(draft.duration)) || Number(draft.duration) < 10 || Number(draft.duration) > 240 || windowMinutes < Number(draft.duration))) return showWarning('가능한 요일과 시간, 회당 수업 시간(10~240분)을 확인해주세요');
    router.push('/teacher/lessons/new/confirm');
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-container-margin pb-48 pt-stack-md font-body-md text-on-background">
      <section className="sticky top-[56px] z-40 -mx-container-margin bg-surface px-container-margin shadow-sm">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/lessons/new" className="text-primary transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="이전 단계">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">수업 개설</h1>
          </div>
          <Link href="/teacher/home" className="text-primary transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="등록 취소">
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </section>

      <section className="mb-section-gap mt-stack-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Step 2 of 3</span>
          <span className="font-label-sm text-label-sm font-semibold text-primary">상세 정보</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full w-2/3 rounded-full primary-gradient" />
        </div>
      </section>

      <h2 className="mb-stack-lg font-headline-md text-headline-md text-on-surface">어떤 수업을 진행하시나요?</h2>

      <form className="space-y-stack-lg" onSubmit={(event) => event.preventDefault()}>
        <section className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-sm">
          <div className="flex flex-col pr-4">
            <span className="font-label-lg text-label-lg text-on-surface">무료 체험 레슨</span>
            <span className="text-xs text-on-surface-variant">첫 수업을 무료로 제공하여 더 많은 학생을 모집해보세요.</span>
          </div>
          <button
            type="button"
            onClick={() => draft.setFreeTrial(!draft.freeTrial)}
            className={`relative h-6 w-11 rounded-lg transition-colors ${draft.freeTrial ? 'bg-primary' : 'bg-surface-container-high'}`}
            aria-pressed={draft.freeTrial}
            aria-label="무료 체험 레슨 설정"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draft.freeTrial ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </section>

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

        {/* 수업 언어 선택 영역 */}
        <FieldCard label="수업 언어">
          <ChipGroup
            items={languageOptions}
            selected={draft.language || '한국어'}
            onSelect={(value) => draft.setField('language', value)}
          />
          <p className="mt-2 text-xs text-on-surface-variant">
            수업 진행 시 사용할 주요 언어를 선택해주세요 (선택: {draft.language || '한국어'}).
          </p>
        </FieldCard>

        {/* 수업 정원 (인원) 선택 영역: 기본 2명, 3명/4명은 관리자 승인 필요 */}
        <FieldCard label="수업 정원 (인원 설정)">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5">
              {/* 2명 (기본) */}
              <button
                type="button"
                onClick={() => draft.setField('capacity', 2)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  draft.capacity === 2
                    ? 'border-2 border-primary bg-primary text-white shadow-sm ring-2 ring-primary/20'
                    : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">group</span>
                <span>2명 (기본 정원)</span>
                {draft.capacity === 2 && (
                  <span className="material-symbols-outlined text-base">check</span>
                )}
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
              수업 개설은 <span className="font-semibold text-primary">무조건 기본 2명 그룹</span>으로 시작됩니다. 3명 또는 4명 수업 개설은 관리자 승인 후 가능합니다.
            </p>
          </div>
        </FieldCard>

        <FieldCard label="수업 대상">
          <ChipGroup items={levelOptions} selected={draft.level} onSelect={(value) => draft.setField('level', value)} />
        </FieldCard>

        <FieldCard label="카테고리">
          <ChipGroup items={categoryOptions} selected={draft.category} onSelect={(value) => draft.setField('category', value)} />
          <p className="mt-2 text-xs text-on-surface-variant">학생에게 표시할 수업 카테고리를 선택해주세요.</p>
        </FieldCard>

        <FieldCard label="수업 개설 방식">
          <div className="flex gap-3">
            {(['fixed', 'request'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={draft.schedulingMode === mode}
                onClick={() => draft.setField('schedulingMode', mode)}
                className={draft.schedulingMode === mode ? 'rounded-lg border p-3 bg-primary text-white font-semibold' : 'rounded-lg border p-3 hover:bg-surface-container-low'}
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
                  className={draft.weekdays.includes(index) ? 'rounded-lg border p-3 bg-primary text-white font-semibold' : 'rounded-lg border p-3 hover:bg-surface-container-low'}
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

            <div className="mt-5">
              <span className="mb-2 block font-label-sm text-label-sm font-semibold text-on-surface">
                회당 수업 시간 선택
              </span>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((opt) => {
                  const isSel = String(opt.minutes) === String(draft.duration);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleDurationSelect(opt.minutes)}
                      className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 font-label-sm text-sm font-bold transition-all ${
                        isSel
                          ? 'border-2 border-primary bg-primary text-white shadow-sm'
                          : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">timer</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-4 block font-label-sm text-label-sm text-on-surface-variant" htmlFor="duration">
              수업 시간 직접 입력 (분)
            </label>
            <input
              id="duration"
              type="number"
              min={10}
              max={240}
              value={draft.duration}
              onChange={(event) => draft.setField('duration', event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
            />
          </FieldCard>
        )}

        <FieldCard label={draft.schedulingMode === 'fixed' ? '수업 날짜 및 시간 (한국 시간)' : '신청 가능한 시간대 (한국 시간)'}>
          <div className="space-y-4">
            <div hidden={draft.schedulingMode === 'request'}>
              <label className="mb-2 block font-label-sm text-label-sm text-on-surface-variant" htmlFor="lesson-date">
                수업 날짜
              </label>
              <input
                disabled={draft.schedulingMode === 'request'}
                id="lesson-date"
                type="date"
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.date}
                onChange={(event) => draft.setField('date', event.target.value)}
              />
            </div>

            {/* 시작 시간 입력 (30분 단위: :00, :30) */}
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-label-sm text-label-sm font-bold text-on-surface" htmlFor="start-time-hour">
                    수업 시작 시간 <span className="text-primary text-xs font-semibold">(30분 단위)</span>
                  </label>
                  <p className="text-xs text-on-surface-variant">
                    분(Minute)은 <span className="font-semibold text-primary">00분</span> 또는 <span className="font-semibold text-primary">30분</span>으로 선택됩니다.
                  </p>
                </div>
                {draft.startTime && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {draft.startTime}
                  </span>
                )}
              </div>

              {/* 시(Hour) 선택과 분(:00 / :30) 토글 버튼 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* 시 선택 드롭다운 */}
                <div className="sm:col-span-7">
                  <div className="relative">
                    <select
                      id="start-time-hour"
                      value={currentStartHour}
                      onChange={(e) => handleHourSelect(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary pr-9"
                    >
                      <option value="">시작 시간 (시) 선택</option>
                      <optgroup label="오전">
                        {HOURS_OPTIONS.slice(0, 12).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="오후">
                        {HOURS_OPTIONS.slice(12).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* 분 선택 토글 (:00분 / :30분) */}
                <div className="flex sm:col-span-5 gap-2">
                  <button
                    type="button"
                    id="minute-00-btn"
                    onClick={() => handleMinuteSelect('00')}
                    className={`flex-1 rounded-xl py-3 px-2 text-center text-sm font-bold transition-all ${
                      currentStartMinute === '00'
                        ? 'primary-gradient text-white shadow-sm ring-2 ring-primary/30'
                        : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50'
                    }`}
                  >
                    :00분
                  </button>
                  <button
                    type="button"
                    id="minute-30-btn"
                    onClick={() => handleMinuteSelect('30')}
                    className={`flex-1 rounded-xl py-3 px-2 text-center text-sm font-bold transition-all ${
                      currentStartMinute === '30'
                        ? 'primary-gradient text-white shadow-sm ring-2 ring-primary/30'
                        : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50'
                    }`}
                  >
                    :30분
                  </button>
                </div>
              </div>

              {/* 전체 30분 슬롯 목록 드롭다운 (원클릭 직접 선택) */}
              <div>
                <select
                  id="start-time"
                  value={draft.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant transition-all focus:border-primary focus:outline-none"
                >
                  <option value="">전체 30분 슬롯 목록에서 선택 (00:00 ~ 23:30)</option>
                  <optgroup label="오전 슬롯 (00:00 ~ 11:30)">
                    {TIME_SLOTS_30MIN.filter((s) => s.period === '오전').map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="오후 슬롯 (12:00 ~ 23:30)">
                    {TIME_SLOTS_30MIN.filter((s) => s.period === '오후').map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
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
                          ? 'primary-gradient text-white shadow-md scale-[1.02]'
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

        <FieldCard label="회당 수강료 (원)" htmlFor="lesson-price">
          <div className="relative">
            <input
              id="lesson-price"
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-3 pl-4 pr-12 font-body-md text-on-surface transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:text-on-surface-variant"
              placeholder="0"
              type="number"
              disabled={draft.freeTrial}
              value={draft.freeTrial ? '' : draft.price}
              onChange={(event) => draft.setField('price', event.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">원</span>
          </div>
        </FieldCard>

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
          className="block w-full rounded-xl primary-gradient-btn py-4 text-center font-label-lg text-label-lg text-white shadow-md transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          다음 단계로 (수업 개설 확인)
        </button>
      </div>
    </main>
  );
}

function FieldCard({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-sm">
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
              active ? 'border-2 border-primary bg-primary text-white font-bold shadow-xs' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
