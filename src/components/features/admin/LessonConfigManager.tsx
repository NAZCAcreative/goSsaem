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
    allow1on1Approval,
    capacityPolicies,
    toggle1on1Approval,
    toggleCapacityApproval,
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

  const [activeTab, setActiveTab] = useState<'language_duration' | 'capacity_policy' | 'level_category'>('language_duration');

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
    if (await showConfirm('수업 등록 옵션(언어, 50분/70분 시간, 인원 정책, 레벨, 카테고리)을 모두 기본값으로 초기화하시겠습니까?')) {
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
              수업 개설 유형(그룹 2인 기본, 1:1 승인제), 수업 인원(기본 2명, 3~4인 승인제), 수업 언어, 수업 시간(50분/70분)을 설정합니다.
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
            수업 언어 및 수업 시간 (50분/70분)
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
            레벨 및 카테고리 관리
          </button>
        </div>
      </section>

      {/* Tab 1: 언어 & 시간 관리 */}
      {activeTab === 'language_duration' && (
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

            {/* Languages list */}
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
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${lang.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {lang.label}
                        </span>
                        {lang.isDefault && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                            기본 선택
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">코드: {lang.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!lang.isDefault && lang.isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultLanguage(lang.id);
                          showToast(`기본 언어가 '${lang.label}'(으)로 설정되었습니다.`);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        기본 지정
                      </button>
                    )}
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition-colors"
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
                placeholder="추가할 언어명 (예: 프랑스어)"
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
                  선생님이 시작 시간(30분 단위: :00, :30)을 정하고 버튼 클릭으로 선택할 수 있는 수업 시간 길이입니다.
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
                          showToast(`기본 수업 시간이 '${dur.label}'(으)로 설정되었습니다.`);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        기본 지정
                      </button>
                    )}
                    {durations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDuration(dur.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition-colors"
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
            <form onSubmit={handleAddDuration} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-100 pt-4">
              <input
                type="number"
                placeholder="시간(분: 50)"
                min={10}
                max={240}
                value={newDurMinutes}
                onChange={(e) => setNewDurMinutes(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="표시명 (예: 50분 수업)"
                value={newDurLabel}
                onChange={(e) => setNewDurLabel(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add</span>
                추가
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Tab 2: 수업 인원 및 개설 승인 정책 관리 */}
      {activeTab === 'capacity_policy' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section A: 수업 인원(정원) 정책 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">group</span>
                수업 인원(정원) 승인 정책 (기본 2명)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                수업 인원은 <span className="font-bold text-primary">기본 2명으로 신청</span>되며, 3명 및 4명 수업은 관리자의 사전 승인이 있어야 등록 가능하도록 제한됩니다.
              </p>
            </div>

            <div className="space-y-3">
              {/* 2명 (기본) */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                    2명
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">2명 수업 (기본 정원)</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        기본 개설 고정
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      모든 선생님이 별도 승인 없이 기본으로 개설하는 2인 소규모 그룹 수업입니다.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-xl font-bold">check_circle</span>
              </div>

              {/* 3명 (승인제) */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                    3명
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">3명 수업</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        capacityPolicies.find((c) => c.capacity === 3)?.isApproved
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {capacityPolicies.find((c) => c.capacity === 3)?.isApproved ? '관리자 승인 활성' : '🔒 관리자 승인 필요 (기본 잠금)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      선생님 수업 등록 시 비활성화되며, 관리자 승인 요청을 통해 개설 가능합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCapacityApproval(3)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    capacityPolicies.find((c) => c.capacity === 3)?.isApproved ? 'bg-primary' : 'bg-slate-200'
                  }`}
                  title="3인 수업 전체 승인 허용 토글"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                      capacityPolicies.find((c) => c.capacity === 3)?.isApproved ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* 4명 (승인제) */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                    4명
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">4명 수업</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        capacityPolicies.find((c) => c.capacity === 4)?.isApproved
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {capacityPolicies.find((c) => c.capacity === 4)?.isApproved ? '관리자 승인 활성' : '🔒 관리자 승인 필요 (기본 잠금)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      선생님 수업 등록 시 비활성화되며, 관리자 승인 요청을 통해 개설 가능합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCapacityApproval(4)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    capacityPolicies.find((c) => c.capacity === 4)?.isApproved ? 'bg-primary' : 'bg-slate-200'
                  }`}
                  title="4인 수업 전체 승인 허용 토글"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                      capacityPolicies.find((c) => c.capacity === 4)?.isApproved ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Section B: 수업 유형 정책 (1:1 및 라이브코스) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
                수업 개설 유형 승인 정책
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                수업 개설은 <span className="font-bold text-primary">무조건 그룹 2명으로 시작</span>하며, 1:1 레슨은 회색 미지원 처리됩니다.
              </p>
            </div>

            <div className="space-y-3">
              {/* 소규모 그룹 2명 클래스 */}
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">groups</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">소규모 그룹 클래스 (2명)</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        무조건 그룹으로 시작
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      수업 개설 1단계 화면에서 기본값으로 자동 선택됩니다.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
              </div>

              {/* 1:1 프리미엄 레슨 */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">person</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-sm">1:1 프리미엄 레슨</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        allow1on1Approval
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
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

      {/* Tab 3: 레벨 & 카테고리 관리 */}
      {activeTab === 'level_category' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section 3: 레벨 관리 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">school</span>
                  수업 레벨(난이도) 관리
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">학생 대상별 권장 레벨 옵션 목록입니다.</p>
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
          <h3 className="font-bold text-slate-900">선생님 수업 등록 화면 실시간 정책 미리보기</h3>
        </div>
        <p className="mb-4 text-xs text-slate-600">
          관리자가 설정한 개설 유형(그룹 2인 기본, 1:1 미지원), 정원(기본 2명), 수업 언어, 수업 시간(50분/70분)이 선생님 수업 개설 화면에 아래와 같이 바로 반영됩니다.
        </p>

        <div className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-xs space-y-4 max-w-xl">
          {/* Step 1 Preview: 수업 유형 */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">1️⃣ 수업 유형 선택 (Step 1)</span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-2 text-xs">
                <span className="font-bold text-primary">소규모 그룹 클래스 (2명)</span>
                <span className="rounded bg-primary text-white px-2 py-0.5 text-[11px] font-bold">기본 개설 (선택됨)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100/70 p-2 text-xs text-slate-400">
                <span>1:1 프리미엄 레슨</span>
                <span className="rounded bg-slate-200 text-slate-600 px-2 py-0.5 text-[11px] font-bold">회색 미지원 · 관리자 승인 필요</span>
              </div>
            </div>
          </div>

          {/* Step 2 Preview: 정원 */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">2️⃣ 수업 정원 선택 (Step 2)</span>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1 rounded-lg border-2 border-primary bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                <span className="material-symbols-outlined text-sm">group</span>
                2명 (기본 정원 선택)
              </span>
              <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                <span className="material-symbols-outlined text-sm">lock</span>
                3명 (승인 필요)
              </span>
              <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                <span className="material-symbols-outlined text-sm">lock</span>
                4명 (승인 필요)
              </span>
            </div>
          </div>

          {/* Step 2 Preview: 언어 */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">3️⃣ 수업 언어 선택</span>
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

          {/* Step 2 Preview: 시간 */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">4️⃣ 수업 시간 선택 (30분 시작 시간 단위에서 자동 계산)</span>
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
