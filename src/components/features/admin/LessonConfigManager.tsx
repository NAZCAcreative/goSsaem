'use client';

import { showWarning, showConfirm } from '@/components/shared/AlertDialog';
import { useState } from 'react';
import { useLessonConfigStore } from '@/stores/lesson-config-store';
import { showToast } from '@/components/shared/Toast';

export function LessonConfigManager() {
  const {
    languages,
    durations,
    levels,
    categories,
    addLanguage,
    toggleLanguageActive,
    setDefaultLanguage,
    removeLanguage,
    addDuration,
    toggleDurationActive,
    setDefaultDuration,
    removeDuration,
    addLevel,
    toggleLevelActive,
    removeLevel,
    addCategory,
    toggleCategoryActive,
    removeCategory,
    resetToDefault,
  } = useLessonConfigStore();

  const [activeTab, setActiveTab] = useState<'language_duration' | 'level_category'>('language_duration');

  // New Language Form
  const [newLangLabel, setNewLangLabel] = useState('');

  // New Duration Form
  const [newDurMinutes, setNewDurMinutes] = useState('');
  const [newDurLabel, setNewDurLabel] = useState('');

  // New Level & Category Form
  const [newLevelLabel, setNewLevelLabel] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangLabel.trim()) {
      showWarning('수업 언어명을 입력해주세요.');
      return;
    }
    addLanguage(newLangLabel.trim());
    setNewLangLabel('');
    showToast('새 수업 언어가 추가되었습니다.');
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
    if (await showConfirm('수업 등록 옵션(언어, 50분/70분 시간, 레벨, 카테고리)을 모두 기본값으로 초기화하시겠습니까?')) {
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
              선생님 수업 개설 시 선택하는 수업 언어, 수업 시간(50분/70분), 레벨 및 카테고리를 설정하고 관리합니다.
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
        <div className="mt-5 flex gap-2 border-b border-slate-100 pb-2">
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
            수업 언어 및 수업 시간 (50분/70분)
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
            레벨 및 카테고리 관리
          </button>
        </div>
      </section>

      {activeTab === 'language_duration' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section 1: 수업 언어 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">translate</span>
                  수업 언어 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  선생님이 수업 개설 시 선택 가능한 지원 언어 목록입니다.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                활성 {languages.filter((l) => l.isActive).length}개
              </span>
            </div>

            {/* Language list */}
            <ul className="divide-y divide-slate-100">
              {languages.map((lang) => (
                <li key={lang.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleLanguageActive(lang.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        lang.isActive ? 'bg-primary' : 'bg-slate-200'
                      }`}
                      title={lang.isActive ? '클릭 시 비활성화' : '클릭 시 활성화'}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                          lang.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <span className={`font-semibold text-sm ${lang.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {lang.label}
                      </span>
                      {lang.isDefault && (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                          기본 선택
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!lang.isDefault && lang.isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultLanguage(lang.id);
                          showToast(`기본 수업 언어가 「${lang.label}」로 설정되었습니다.`);
                        }}
                        className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      >
                        기본 지정
                      </button>
                    )}
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="언어 삭제"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Add Language Form */}
            <form onSubmit={handleAddLanguage} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                placeholder="추가할 언어명 (예: 프랑스어, 독일어)"
                value={newLangLabel}
                onChange={(e) => setNewLangLabel(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add</span>
                추가
              </button>
            </form>
          </section>

          {/* Section 2: 수업 시간 옵션 관리 (50분/70분) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">timer</span>
                  수업 시간 옵션 관리 (50분 / 70분 등)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  선생님이 시작 시간을 정하고 버튼 클릭으로 선택할 수 있는 수업 시간 길이입니다.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                활성 {durations.filter((d) => d.isActive).length}개
              </span>
            </div>

            {/* Durations list */}
            <ul className="divide-y divide-slate-100">
              {durations.map((dur) => (
                <li key={dur.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDurationActive(dur.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        dur.isActive ? 'bg-primary' : 'bg-slate-200'
                      }`}
                      title={dur.isActive ? '클릭 시 비활성화' : '클릭 시 활성화'}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                          dur.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${dur.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {dur.label}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                          {dur.minutes}분
                        </span>
                      </div>
                      {dur.isDefault && (
                        <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                          기본 선택
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!dur.isDefault && dur.isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultDuration(dur.id);
                          showToast(`기본 수업 시간이 「${dur.label}」로 설정되었습니다.`);
                        }}
                        className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      >
                        기본 지정
                      </button>
                    )}
                    {durations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDuration(dur.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="옵션 삭제"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Add Duration Form */}
            <form onSubmit={handleAddDuration} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <span className="block text-xs font-bold text-slate-700">새 수업 시간 옵션 추가</span>
              <div className="grid grid-cols-[90px_1fr_auto] gap-2">
                <input
                  type="number"
                  placeholder="분 (예: 60)"
                  min={10}
                  max={240}
                  value={newDurMinutes}
                  onChange={(e) => {
                    setNewDurMinutes(e.target.value);
                    if (!newDurLabel && e.target.value) {
                      setNewDurLabel(`${e.target.value}분 수업`);
                    }
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="라벨 (예: 60분 집중 수업)"
                  value={newDurLabel}
                  onChange={(e) => setNewDurLabel(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  추가
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section 3: 레벨 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">stairs</span>
                  수업 레벨 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">선생님이 선택하는 수업 대상 난이도 태그입니다.</p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {levels.map((lvl) => (
                <li key={lvl.id} className="flex items-center justify-between py-2.5">
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
                    <span className={`font-semibold text-sm ${lvl.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {lvl.label}
                    </span>
                  </div>
                  {levels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLevel(lvl.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </li>
              ))}
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

          {/* Section 4: 카테고리 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">local_offer</span>
                  수업 카테고리 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">학생 검색 및 추천에 노출되는 카테고리 태그입니다.</p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between py-2.5">
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
                    <span className={`font-semibold text-sm ${cat.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {cat.label}
                    </span>
                  </div>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCategory(cat.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-600"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                placeholder="추가할 카테고리명 (예: K-드라마 회화)"
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

      {/* Live Preview for Admin */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">visibility</span>
          <h3 className="font-bold text-slate-900">선생님 수업 등록 화면 실시간 미리보기</h3>
        </div>
        <p className="mb-4 text-xs text-slate-600">
          관리자 페이지에서 변경한 수업 언어와 수업 시간(50분/70분)이 선생님 수업 개설 화면에 아래와 같이 바로 반영됩니다.
        </p>

        <div className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-xs space-y-4 max-w-xl">
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">🗣 수업 언어 선택</span>
            <div className="flex flex-wrap gap-1.5">
              {languages.filter((l) => l.isActive).map((l, i) => (
                <span
                  key={l.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    i === 0
                      ? 'border-2 border-primary bg-primary text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">⏱ 수업 시간 선택 (시작 시간부터 자동 계산)</span>
            <div className="flex flex-wrap gap-2">
              {durations.filter((d) => d.isActive).map((d, i) => (
                <span
                  key={d.id}
                  className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold ${
                    i === 0
                      ? 'primary-gradient text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">timer</span>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
