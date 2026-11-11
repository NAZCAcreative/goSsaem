'use client';

import { showWarning, showConfirm } from '@/components/shared/AlertDialog';
import { useState } from 'react';
import { useLessonConfigStore, DEFAULT_SUPPORTED_LANGUAGES } from '@/stores/lesson-config-store';
import { showToast } from '@/components/shared/Toast';

export function LessonConfigManager() {
  const {
    languages,
    supportedLanguages: rawSupportedLanguages,
    durations,
    levels,
    categories,
    allow1on1Approval,
    capacityPolicies,
    isLevelFieldEnabled,
    toggle1on1Approval,
    toggleCapacityApproval,
    toggleLevelFieldEnabled,
    addLanguage,
    updateLanguage,
    toggleLanguageActive,
    setDefaultLanguage,
    removeLanguage,
    addSupportedLanguage,
    updateSupportedLanguage,
    toggleSupportedLanguageActive,
    removeSupportedLanguage,
    addDuration,
    updateDuration,
    toggleDurationActive,
    setDefaultDuration,
    removeDuration,
    addLevel,
    updateLevel,
    toggleLevelActive,
    removeLevel,
    addCategory,
    updateCategory,
    toggleCategoryActive,
    removeCategory,
    resetToDefault,
  } = useLessonConfigStore();

  const supportedLanguages = rawSupportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;

  const [activeTab, setActiveTab] = useState<'language_duration' | 'capacity_policy' | 'level_category'>('language_duration');

  // Inline Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingMinutes, setEditingMinutes] = useState<number>(50);

  // New Forms State
  const [newLangLabel, setNewLangLabel] = useState('');
  const [newSupportedLangLabel, setNewSupportedLangLabel] = useState('');
  const [newDurMinutes, setNewDurMinutes] = useState('');
  const [newDurLabel, setNewDurLabel] = useState('');
  const [newLevelLabel, setNewLevelLabel] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  const startEdit = (id: string, initialValue: string, initialMinutes?: number) => {
    setEditingItemId(id);
    setEditingValue(initialValue);
    if (initialMinutes) setEditingMinutes(initialMinutes);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingValue('');
  };

  // Add Handlers
  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangLabel.trim()) {
      showWarning('수업 진행 언어명을 입력해주세요.');
      return;
    }
    addLanguage(newLangLabel.trim());
    setNewLangLabel('');
    showToast('새 수업 진행 언어가 추가되었습니다.');
  };

  const handleAddSupportedLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupportedLangLabel.trim()) {
      showWarning('선생님 지원(대응) 언어명을 입력해주세요.');
      return;
    }
    addSupportedLanguage(newSupportedLangLabel.trim());
    setNewSupportedLangLabel('');
    showToast('새 지원(대응) 언어가 추가되었습니다.');
  };

  const handleAddDuration = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(newDurMinutes);
    if (!mins || mins <= 0 || mins > 240) {
      showWarning('10분에서 240분 사이의 수업 시간을 입력해주세요.');
      return;
    }
    const label = newDurLabel.trim() || `${mins}분 수업`;
    addDuration(label, mins);
    setNewDurMinutes('');
    setNewDurLabel('');
    showToast('새 수업 시간 옵션이 추가되었습니다.');
  };

  const handleAddLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelLabel.trim()) return;
    addLevel(newLevelLabel.trim());
    setNewLevelLabel('');
    showToast('새 레벨이 추가되었습니다.');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    addCategory(newCatLabel.trim());
    setNewCatLabel('');
    showToast('새 카테고리가 추가되었습니다.');
  };

  const handleReset = async () => {
    if (
      await showConfirm(
        '수업 등록 옵션(언어, 지원 언어, 50분/70분 시간, 인원 정책, 레벨, 카테고리)을 모두 기본값으로 초기화하시겠습니까?'
      )
    ) {
      resetToDefault();
      showToast('기본 설정으로 초기화되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">tune</span>
              <h2 className="text-xl font-bold text-slate-900">수업 등록 설정 관리</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              수업 언어(진행 언어), 지원 언어(대응 언어), 카테고리, 수업 대상(레벨) 종류를 직접 수정 및 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleReset()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              기본값 초기화
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('language_duration')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'language_duration'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">language</span>
            수업 언어 · 지원 언어 · 수업 시간 (50/70분)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capacity_policy')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'capacity_policy'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            수업 인원(기본 2명) 및 개설 승인 정책
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level_category')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'level_category'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">category</span>
            수업 대상(레벨) 및 카테고리 관리
          </button>
        </div>
      </section>

      {/* Tab 1: 언어 & 지원 언어 & 시간 관리 */}
      {activeTab === 'language_duration' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Section 1: 수업 진행 언어 관리 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">translate</span>
                    수업 진행 언어 (주 언어)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    수업을 진행할 때 사용하는 주요 언어 옵션입니다. 이름을 수정하거나 활성화/비활성화할 수 있습니다.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  활성 {languages.filter((l) => l.isActive).length}개
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {languages.map((lang) => {
                  const isEditing = editingItemId === `lang-${lang.id}`;
                  return (
                    <li key={lang.id} className="flex items-center justify-between py-2.5">
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2 pr-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="flex-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold focus:outline-none"
                            placeholder="언어명"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingValue.trim()) return showWarning('언어명을 입력해주세요.');
                              updateLanguage(lang.id, editingValue.trim());
                              cancelEdit();
                              showToast('수업 진행 언어가 수정되었습니다.');
                            }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleLanguageActive(lang.id)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                lang.isActive ? 'bg-primary' : 'bg-slate-200'
                              }`}
                              title={lang.isActive ? '비활성화하기' : '활성화하기'}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                  lang.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span
                              className={`font-semibold text-sm ${
                                lang.isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                              }`}
                            >
                              {lang.label}
                            </span>
                            {lang.isDefault && (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                기본 선택
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(`lang-${lang.id}`, lang.label)}
                              className="rounded p-1 text-slate-400 hover:text-primary"
                              title="이름 수정"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            {!lang.isDefault && lang.isActive && (
                              <button
                                type="button"
                                onClick={() => setDefaultLanguage(lang.id)}
                                className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                기본값 설정
                              </button>
                            )}
                            {languages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLanguage(lang.id)}
                                className="rounded p-1 text-slate-400 hover:text-red-600"
                                title="삭제"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={handleAddLanguage} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <input
                  type="text"
                  placeholder="추가할 수업 진행 언어명 (예: 프랑스어)"
                  value={newLangLabel}
                  onChange={(e) => setNewLangLabel(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  추가
                </button>
              </form>
            </section>

            {/* Section 2: 선생님 지원(대응) 언어 관리 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-lg">support_agent</span>
                    선생님 지원 언어 · 대응 언어
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    선생님이 학생과 의사소통 및 질의응답 가능한 언어 목록입니다.
                  </p>
                </div>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                  활성 {supportedLanguages.filter((l) => l.isActive).length}개
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {supportedLanguages.map((slang) => {
                  const isEditing = editingItemId === `slang-${slang.id}`;
                  return (
                    <li key={slang.id} className="flex items-center justify-between py-2.5">
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2 pr-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="flex-1 rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-semibold focus:outline-none"
                            placeholder="지원 언어명"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingValue.trim()) return showWarning('언어명을 입력해주세요.');
                              updateSupportedLanguage(slang.id, editingValue.trim());
                              cancelEdit();
                              showToast('지원 언어가 수정되었습니다.');
                            }}
                            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleSupportedLanguageActive(slang.id)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                slang.isActive ? 'bg-teal-600' : 'bg-slate-200'
                              }`}
                              title={slang.isActive ? '비활성화하기' : '활성화하기'}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                  slang.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span
                              className={`font-semibold text-sm ${
                                slang.isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                              }`}
                            >
                              {slang.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(`slang-${slang.id}`, slang.label)}
                              className="rounded p-1 text-slate-400 hover:text-teal-600"
                              title="이름 수정"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            {supportedLanguages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSupportedLanguage(slang.id)}
                                className="rounded p-1 text-slate-400 hover:text-red-600"
                                title="삭제"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={handleAddSupportedLanguage} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <input
                  type="text"
                  placeholder="추가할 지원(대응) 언어명 (예: 독일어)"
                  value={newSupportedLangLabel}
                  onChange={(e) => setNewSupportedLangLabel(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  추가
                </button>
              </form>
            </section>
          </div>

          {/* Section 3: 수업 시간 옵션 (50분/70분) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">timer</span>
                  수업 시간 옵션 (50분 수업 / 70분 수업)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  선생님이 시작 시간을 선택하면 선택된 수업 시간에 따라 종료 시간이 자동 계산됩니다.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {durations.map((dur) => {
                const isEditing = editingItemId === `dur-${dur.id}`;
                return (
                  <div
                    key={dur.id}
                    className={`rounded-xl border p-4 transition-all ${
                      dur.isActive ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200/50 bg-slate-100/50 opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-full rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold"
                          placeholder="시간 라벨"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editingMinutes}
                            onChange={(e) => setEditingMinutes(Number(e.target.value))}
                            className="w-24 rounded-lg border border-primary px-3 py-1.5 text-sm"
                            placeholder="분"
                          />
                          <span className="text-xs text-slate-500">분</span>
                          <div className="flex-1" />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingValue.trim() || editingMinutes <= 0) return;
                              updateDuration(dur.id, editingValue.trim(), editingMinutes);
                              cancelEdit();
                              showToast('수업 시간이 수정되었습니다.');
                            }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleDurationActive(dur.id)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                dur.isActive ? 'bg-primary' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                  dur.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">{dur.label}</span>
                              <span className="text-xs text-slate-500">{dur.minutes}분 동안 진행</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(`dur-${dur.id}`, dur.label, dur.minutes)}
                              className="rounded p-1 text-slate-400 hover:text-primary"
                              title="수정"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            {dur.isDefault && (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                기본 프리셋
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                          {!dur.isDefault && dur.isActive && (
                            <button
                              type="button"
                              onClick={() => setDefaultDuration(dur.id)}
                              className="font-semibold text-slate-500 hover:text-primary"
                            >
                              기본 프리셋으로 설정
                            </button>
                          )}
                          {durations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDuration(dur.id)}
                              className="font-semibold text-red-500 hover:text-red-700 ml-auto"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddDuration} className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                placeholder="표시 라벨 (예: 90분 심화 수업)"
                value={newDurLabel}
                onChange={(e) => setNewDurLabel(e.target.value)}
                className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                placeholder="수업 시간(분)"
                value={newDurMinutes}
                onChange={(e) => setNewDurMinutes(e.target.value)}
                className="w-32 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                시간 추가
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Tab 2: 인원 & 1:1 승인 정책 */}
      {activeTab === 'capacity_policy' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
                  수업 인원 설정 및 개설 승인 정책
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  수업 개설은 <span className="font-bold text-primary">무조건 2명 그룹으로 시작</span>되며, 3~4인 및
                  1:1 레슨은 관리자 승인 정책을 적용합니다.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">groups</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">소규모 그룹 클래스 (기본 2명)</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        무조건 2인 그룹으로 시작
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      선생님 수업 등록 1단계 및 2단계에서 기본값으로 자동 설정됩니다.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
              </div>

              {capacityPolicies.map((cp) => (
                <div
                  key={cp.capacity}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    cp.isApproved ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500 text-2xl">group_add</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{cp.label}</span>
                        {cp.isApproved ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            승인됨 (선생님 선택 가능)
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                            🔒 관리자 승인 필요 (선택 잠김)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cp.isApproved
                          ? '선생님이 2단계 상세 화면에서 해당 정원을 선택하여 개설할 수 있습니다.'
                          : '선생님 화면에서 잠금(Lock) 표시되며 클릭 시 관리자 승인 안내가 노출됩니다.'}
                      </p>
                    </div>
                  </div>
                  {cp.capacity !== 2 && (
                    <button
                      type="button"
                      onClick={() => toggleCapacityApproval(cp.capacity)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        cp.isApproved ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                          cp.isApproved ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}

              {/* 1:1 프리미엄 레슨 */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">person</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-sm">1:1 프리미엄 레슨</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          allow1on1Approval ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {allow1on1Approval ? '특별 승인 활성화됨' : '🔒 회색 미지원 · 관리자 승인 필요'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      선생님 화면에서 회색으로 비활성화되며 클릭 시 관리자 승인 필요 안내가 뜹니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggle1on1Approval}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    allow1on1Approval ? 'bg-primary' : 'bg-slate-300'
                  }`}
                  title="1:1 레슨 전체 승인 허용 토글"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                      allow1on1Approval ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* 오픈 라이브 코스 (제거됨 안내) */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-red-200 bg-red-50/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400 text-2xl">block</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm line-through">오픈 라이브 코스</span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        개설 목록에서 완전 제거됨
                      </span>
                    </div>
                    <p className="text-xs text-red-600 mt-0.5">
                      사용자 요청에 따라 수업 개설 1단계 옵션에서 완전히 삭제되었습니다.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-red-500">delete_forever</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: 수업 대상(레벨) & 카테고리 관리 */}
      {activeTab === 'level_category' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section 1: 수업 대상(레벨) 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">school</span>
                  수업 대상(레벨) 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  수업 대상 기능 사용 여부 및 &apos;누구나&apos;를 포함한 레벨 옵션을 관리합니다.
                </p>
              </div>
            </div>

            {/* 마스터 스위치: 수업 대상 사용 여부 */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div>
                <span className="text-sm font-bold text-slate-800 block">수업 대상 설정 기능 사용</span>
                <span className="text-xs text-slate-500">
                  {isLevelFieldEnabled
                    ? '활성화됨 - 선생님이 수업 개설 시 대상 레벨(누구나 포함)을 선택할 수 있습니다.'
                    : '비활성화됨 - 수업 대상을 별도로 지정하지 않고 모든 수업이 오픈 레벨로 운영됩니다.'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleLevelFieldEnabled}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isLevelFieldEnabled ? 'bg-primary' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    isLevelFieldEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <ul className="divide-y divide-slate-100">
              {levels.map((lvl) => {
                const isEditing = editingItemId === `lvl-${lvl.id}`;
                return (
                  <li key={lvl.id} className="flex items-center justify-between py-2.5">
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2 pr-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold focus:outline-none"
                          placeholder="레벨명"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingValue.trim()) return showWarning('레벨명을 입력해주세요.');
                            updateLevel(lvl.id, editingValue.trim());
                            cancelEdit();
                            showToast('수업 대상(레벨)이 수정되었습니다.');
                          }}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleLevelActive(lvl.id)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              lvl.isActive ? 'bg-primary' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                lvl.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span
                            className={`font-semibold text-sm ${
                              lvl.isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {lvl.label}
                          </span>
                          {lvl.label === '누구나' && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                              오픈 레벨 기본 버튼
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(`lvl-${lvl.id}`, lvl.label)}
                            className="rounded p-1 text-slate-400 hover:text-primary"
                            title="이름 수정"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          {levels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLevel(lvl.id)}
                              className="rounded p-1 text-slate-400 hover:text-red-600"
                              title="삭제"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>

            <form onSubmit={handleAddLevel} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                placeholder="추가할 레벨명 (예: 최상급)"
                value={newLevelLabel}
                onChange={(e) => setNewLevelLabel(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                추가
              </button>
            </form>
          </section>

          {/* Section 2: 카테고리 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">category</span>
                  수업 카테고리 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  선생님이 수업 개설 시 선택 가능한 카테고리 목록입니다.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                활성 {categories.filter((c) => c.isActive).length}개
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {categories.map((cat) => {
                const isEditing = editingItemId === `cat-${cat.id}`;
                return (
                  <li key={cat.id} className="flex items-center justify-between py-2.5">
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2 pr-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold focus:outline-none"
                          placeholder="카테고리명"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingValue.trim()) return showWarning('카테고리명을 입력해주세요.');
                            updateCategory(cat.id, editingValue.trim());
                            cancelEdit();
                            showToast('카테고리가 수정되었습니다.');
                          }}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCategoryActive(cat.id)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              cat.isActive ? 'bg-primary' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                cat.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span
                            className={`font-semibold text-sm ${
                              cat.isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {cat.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(`cat-${cat.id}`, cat.label)}
                            className="rounded p-1 text-slate-400 hover:text-primary"
                            title="이름 수정"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCategory(cat.id)}
                              className="rounded p-1 text-slate-400 hover:text-red-600"
                              title="삭제"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>

            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                placeholder="추가할 카테고리명 (예: K-Culture)"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                추가
              </button>
            </form>
          </section>
        </div>
      )}

      {/* 실시간 미리보기 및 정책 요약 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-xl">preview</span>
          선생님 수업 등록 화면 실시간 반영 요약
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <span className="font-bold text-slate-700 block">수업 유형 & 인원</span>
            <p className="text-slate-600">
              • 기본 2명 소규모 그룹으로 시작<br />
              • 3명, 4명: 관리자 승인제<br />
              • 1:1 레슨: 미지원 (승인 필요)<br />
              • 오픈 라이브 코스: 제거됨
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <span className="font-bold text-slate-700 block">수업 진행 & 지원 언어</span>
            <p className="text-slate-600">
              • 진행 언어: {languages.filter((l) => l.isActive).map((l) => l.label).join(', ')}<br />
              • 지원 언어: {supportedLanguages.filter((l) => l.isActive).map((l) => l.label).join(', ')}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <span className="font-bold text-slate-700 block">수업 시간 & 날짜</span>
            <p className="text-slate-600">
              • 시작 시간: 30분 단위 스크롤 선택<br />
              • 수업 시간: {durations.filter((d) => d.isActive).map((d) => d.label).join(', ')}<br />
              • 수업 날짜: 오늘 기준 최대 3개월
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <span className="font-bold text-slate-700 block">수업 대상 & 미디어</span>
            <p className="text-slate-600">
              • 수업 대상: {isLevelFieldEnabled ? `활성화 ('누구나' 포함)` : '비활성화'}<br />
              • 대표 이미지: 선택 등록 (처음에 위치)<br />
              • 소개 영상 링크: 선택 등록<br />
              • 무료 체험 레슨: 버튼 제거됨
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
