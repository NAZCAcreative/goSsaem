'use client';

import { useState } from 'react';
import { useNavigationStore, type NavItem } from '@/stores/navigation-store';
import { showToast } from '@/components/shared/Toast';

const PRESET_ICONS = [
  { name: 'home', label: '홈' },
  { name: 'search', label: '검색' },
  { name: 'school', label: '학교/선생님' },
  { name: 'menu_book', label: '수업/책' },
  { name: 'calendar_today', label: '일정/예약' },
  { name: 'chat_bubble', label: '채팅' },
  { name: 'person', label: '프로필/마이' },
  { name: 'add_circle', label: '추가' },
  { name: 'star', label: '즐겨찾기' },
  { name: 'notifications', label: '알림' },
  { name: 'help', label: '고객지원' },
  { name: 'campaign', label: '공지/이벤트' },
];

export function MenuManager() {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New item form state
  const [newLabel, setNewLabel] = useState('');
  const [newHref, setNewHref] = useState('');
  const [newIcon, setNewIcon] = useState('link');

  const {
    studentItems,
    teacherItems,
    updateItem,
    addItem,
    removeItem,
    toggleItemActive,
    moveItem,
    resetToDefault,
  } = useNavigationStore();

  const items = (activeTab === 'teacher' ? teacherItems : studentItems).slice().sort((a, b) => a.order - b.order);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.label.trim() || !editingItem.href.trim()) {
      showToast('메뉴명과 이동 경로를 입력해주세요.');
      return;
    }
    updateItem(activeTab, editingItem.id, {
      label: editingItem.label.trim(),
      href: editingItem.href.trim(),
      icon: editingItem.icon,
    });
    setEditingItem(null);
    showToast('메뉴가 성공적으로 수정되었습니다.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newHref.trim()) {
      showToast('메뉴명과 이동 경로를 입력해주세요.');
      return;
    }
    addItem(activeTab, {
      label: newLabel.trim(),
      href: newHref.trim(),
      icon: newIcon,
    });
    setNewLabel('');
    setNewHref('');
    setNewIcon('link');
    setIsAddOpen(false);
    showToast('새 메뉴가 추가되었습니다.');
  };

  const handleReset = () => {
    if (confirm(`${activeTab === 'student' ? '학생' : '선생님'} 메뉴를 기본값으로 초기화하시겠습니까?`)) {
      resetToDefault(activeTab);
      showToast('메뉴가 기본값으로 초기화되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Description */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">네비게이션 메뉴 관리</h2>
            <p className="mt-1 text-sm text-slate-500">
              웹버전 상단 네비게이션(GNB)과 모바일 버전 하단 네비게이션 바에 노출되는 메뉴를 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>기본값 초기화</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>새 메뉴 추가</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-5 flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'student'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            <span>학생 모드 메뉴 ({studentItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'teacher'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            <span>선생님 모드 메뉴 ({teacherItems.length})</span>
          </button>
        </div>
      </section>

      {/* Menu List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            {activeTab === 'student' ? '학생 메뉴 목록' : '선생님 메뉴 목록'}
          </h3>
          <span className="text-xs text-slate-500">
            ▲/▼ 버튼으로 순서를 변경하고 스위치로 활성화 여부를 전환할 수 있습니다.
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-4 transition-colors ${
                item.isActive ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/60 opacity-60'
              }`}
            >
              {/* Order and Icon & Label */}
              <div className="flex items-center gap-3 min-w-[200px]">
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(activeTab, item.id, 'up')}
                    className="p-1 text-slate-400 hover:text-primary disabled:opacity-20 disabled:hover:text-slate-400"
                    title="위로 이동"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">arrow_drop_up</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(activeTab, item.id, 'down')}
                    className="p-1 text-slate-400 hover:text-primary disabled:opacity-20 disabled:hover:text-slate-400"
                    title="아래로 이동"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">arrow_drop_down</span>
                  </button>
                </div>

                {/* Icon Preview */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                </div>

                {/* Label & URL */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.isActive ? '노출 중' : '숨김'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{item.href}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleItemActive(activeTab, item.id)}
                  className={`inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-all ${
                    item.isActive
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {item.isActive ? '숨기기' : '노출하기'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`「${item.label}」 메뉴를 삭제하시겠습니까?`)) {
                      removeItem(activeTab, item.id);
                      showToast('메뉴가 삭제되었습니다.');
                    }
                  }}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Previews: Web Desktop Top Menu & Mobile Bottom Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900">실시간 네비게이션 미리보기</h3>

        {/* 1. Web Version Top Menu Preview */}
        <div>
          <span className="text-xs font-bold text-slate-500 mb-2 block">
            1. 웹버전 상단 네비게이션 (데스크톱 GNB)
          </span>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/gossaem_logo02.png" alt="GoSsaem" className="h-6 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-1">
              {items
                .filter((i) => i.isActive)
                .map((item, idx) => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      idx === 0 ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">알림 / 프로필</span>
            </div>
          </div>
        </div>

        {/* 2. Mobile Version Bottom Navigation Bar Preview */}
        <div>
          <span className="text-xs font-bold text-slate-500 mb-2 block">
            2. 모바일 버전 하단 네비게이션 바 (모바일 전용)
          </span>
          <div className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-white shadow-md p-2 flex items-center justify-around">
            {items
              .filter((i) => i.isActive)
              .map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl ${
                    idx === 0 ? 'bg-primary-container font-bold text-on-primary-container' : 'text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Edit Modal Dialog */}
      {editingItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">메뉴 수정</h3>
            <p className="mt-1 text-xs text-slate-500">메뉴명, 연결 URL 및 아이콘을 수정합니다.</p>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">메뉴명 (Label)</label>
                <input
                  type="text"
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">이동 경로 (URL)</label>
                <input
                  type="text"
                  value={editingItem.href}
                  onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">아이콘 선택</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, icon: icon.name })}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 border text-xs transition-all ${
                        editingItem.icon === icon.name
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon.name}</span>
                      <span className="text-[10px]">{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal Dialog */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">새 메뉴 추가</h3>
            <p className="mt-1 text-xs text-slate-500">
              {activeTab === 'student' ? '학생 모드' : '선생님 모드'}에 추가할 새 메뉴를 입력하세요.
            </p>

            <form onSubmit={handleAddItem} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">메뉴명 (Label)</label>
                <input
                  type="text"
                  placeholder="예: 고객센터, 이벤트, 수업소개 등"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">이동 경로 (URL)</label>
                <input
                  type="text"
                  placeholder="예: /support, /events, /student/search 등"
                  value={newHref}
                  onChange={(e) => setNewHref(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">아이콘 선택</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setNewIcon(icon.name)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 border text-xs transition-all ${
                        newIcon === icon.name
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon.name}</span>
                      <span className="text-[10px]">{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90"
                >
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
