'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';
import { NotificationLayer } from '@/components/shared/NotificationLayer';
import { countUnreadNotifications } from '@/lib/queries/notifications';
import {
  getMyTeacherApplication,
  getDemoTeacherStatus,
  setDemoTeacherStatus,
  type TeacherApplicationStatus,
} from '@/lib/queries/teacherApplications';
import { getTeacherOverview, type TeacherOverview } from '@/lib/queries/teacherOverview';

export function TeacherWorkspaceDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Status & Data
  const [appStatus, setAppStatus] = useState<TeacherApplicationStatus>('review_pending');
  const [feedback, setFeedback] = useState<string>('');
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationLayer, setShowNotificationLayer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showApprovalLockModal, setShowApprovalLockModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Interactive Checklist State
  const [todos, setTodos] = useState([
    { id: 1, text: '오전 10시 수업 준비하기', time: '10:00', done: true },
    { id: 2, text: '수업 후 학습 기록 남기기', time: null, done: false },
    { id: 3, text: '협업 공고 지원서 검토하기', time: null, done: false },
  ]);

  // Load Status and Data
  useEffect(() => {
    // 1. Check demo status first
    const demoStatus = getDemoTeacherStatus();
    if (demoStatus) {
      setAppStatus(demoStatus);
    } else {
      // 2. Fetch from DB
      getMyTeacherApplication()
        .then((res) => {
          if (res) {
            setAppStatus(res.status);
            setFeedback(res.feedback || '');
          } else {
            // Default to review_pending for new teachers
            setAppStatus('review_pending');
          }
        })
        .catch(() => {
          setAppStatus('review_pending');
        });
    }

    if (user) {
      getTeacherOverview(user.id)
        .then((data) => setOverview(data))
        .catch(() => {});

      countUnreadNotifications(user.id)
        .then((c) => setUnreadNotifications(c))
        .catch(() => {});
    }

    const handleStatusChanged = () => {
      const updated = getDemoTeacherStatus();
      if (updated) setAppStatus(updated);
    };
    window.addEventListener('gossaem_teacher_status_changed', handleStatusChanged);
    return () => {
      window.removeEventListener('gossaem_teacher_status_changed', handleStatusChanged);
    };
  }, [user]);

  // Toggle todo item
  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const remainingTodos = todos.filter((t) => !t.done).length;

  // Handle lesson creation click
  const handleCreateLesson = () => {
    if (appStatus !== 'approved') {
      setShowApprovalLockModal(true);
      return;
    }
    router.push('/teacher/lessons/new');
  };

  // Quick switch status (Demo / Testing helper)
  const handleToggleStatus = (targetStatus: TeacherApplicationStatus) => {
    setDemoTeacherStatus(targetStatus);
    setAppStatus(targetStatus);
    if (targetStatus === 'approved') {
      showToast('🎉 선생님 등록 심사가 승인되었습니다! 대시보드와 수업 개설이 활성화되었습니다.');
    } else if (targetStatus === 'review_pending') {
      showToast('📋 심사 대기(진행 중) 상태로 변경되었습니다.');
    } else if (targetStatus === 'needs_changes') {
      showToast('⚠️ 심사 보완 요청 상태로 변경되었습니다.');
    } else {
      showToast(`상태가 ${targetStatus}(으)로 변경되었습니다.`);
    }
  };

  const teacherName = overview?.name || user?.name || '지민';
  const avatarSrc = overview?.avatarUrl || user?.avatarUrl || '/img/generated/teachers/kim-jimin.png';

  // Dynamic date formatting: "11월 11일 (화)"
  const now = new Date();
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${now.getMonth() + 1}월 ${now.getDate()}일 (${daysOfWeek[now.getDay()]})`;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* ========================================================= */}
      {/* 1. DESKTOP SIDEBAR (Dark Navy: #121829)                   */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-60 xl:w-64 flex-col bg-[#121829] text-white shrink-0 sticky top-0 h-screen select-none border-r border-[#1e2742] z-30">
        {/* Brand Header */}
        <div className="p-5 pb-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="material-symbols-outlined text-[20px] text-white">school</span>
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-white leading-tight">Go Ssaem</div>
            <div className="text-[11px] font-medium text-slate-400">Teacher Workspace</div>
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm font-medium">
          <Link
            href="/teacher/home"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#5b50f6] text-white font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              home
            </span>
            <span>홈</span>
          </Link>

          <Link
            href="/teacher/profile"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span>내 페이지</span>
          </Link>

          <Link
            href="/teacher/lessons"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">school</span>
            <span>수업·학생</span>
          </Link>

          <Link
            href="/teacher/materials"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">folder</span>
            <span>자료실</span>
          </Link>

          <a
            href="#opportunities"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            <span>성장·기회</span>
          </a>
        </nav>

        {/* Bottom Sidebar Items */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <button
            type="button"
            onClick={() => setShowNotificationLayer(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span>알림</span>
            </div>
            {unreadNotifications > 0 ? (
              <span className="w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#121829]" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-pink-500/80" />
            )}
          </button>

          <Link
            href="/teacher/chat"
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
            <span>메시지</span>
          </Link>

          {/* Teacher Profile Card */}
          <div className="pt-2">
            <Link
              href="/teacher/profile"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all group"
            >
              <img
                src={avatarSrc}
                alt={teacherName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{teacherName} 선생님</div>
                <div className="text-[11px] text-slate-400 truncate">내 계정 · 설정</div>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-white text-[18px]">
                chevron_right
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MOBILE DRAWER OVERLAY                                  */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#121829] text-white flex flex-col h-full shadow-2xl z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-white">school</span>
                </div>
                <span className="font-bold text-white text-base">Teacher Workspace</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1">
              <Link
                href="/teacher/home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#5b50f6] text-white font-semibold text-sm"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                <span>홈</span>
              </Link>
              <Link
                href="/teacher/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>내 페이지</span>
              </Link>
              <Link
                href="/teacher/lessons"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">school</span>
                <span>수업·학생</span>
              </Link>
              <Link
                href="/teacher/materials"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">folder</span>
                <span>자료실</span>
              </Link>
              <Link
                href="/teacher/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                <span>메시지</span>
              </Link>
            </nav>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white text-sm truncate">{teacherName} 선생님</div>
                  <div className="text-xs text-slate-400">내 계정 관리</div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  router.push('/teacher');
                }}
                className="w-full text-center py-2 text-xs text-red-400 hover:text-red-300"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MAIN WORKSPACE CONTENT AREA                            */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 lg:pb-12">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#121829] text-white px-4 py-3 flex items-center justify-between border-b border-[#1e2742]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 -ml-1 text-slate-300 hover:text-white"
              aria-label="메뉴 열기"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <span className="font-bold text-base tracking-tight">Go Ssaem</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotificationLayer(true)}
              className="relative p-1.5 text-slate-300 hover:text-white rounded-lg"
              aria-label="알림"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
            </button>
            <button
              type="button"
              onClick={handleCreateLesson}
              className="bg-white text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm hover:bg-slate-100 flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>수업 개설</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* HERO BANNER SECTION (Vinyl Record / Atmospheric Warm Tone) */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden bg-[#121829] text-white min-h-[170px] sm:min-h-[195px] lg:min-h-[210px] flex flex-col justify-between px-5 sm:px-8 lg:px-10 pt-5 pb-12 sm:pb-14">
          {/* Background Image: Vinyl turntable crop on right with dark gradient overlay */}
          <div
            className="absolute inset-0 z-0 bg-cover bg-right sm:bg-center opacity-70 mix-blend-screen pointer-events-none"
            style={{
              backgroundImage: "url('/img/teacher/workspace-hero-bg.jpg'), url('/img/teacher/workspace-vinyl-bg.jpg')",
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#121829] via-[#121829]/80 to-transparent pointer-events-none" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#121829] via-transparent to-transparent opacity-60 pointer-events-none" />

          {/* Top Bar inside Hero */}
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="hidden lg:block text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Go Ssaem
            </div>

            <div className="hidden lg:flex items-center gap-3 ml-auto">
              {/* Search button */}
              <button
                type="button"
                onClick={() => showToast('선생님 자료 및 수업 검색 기능')}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="검색"
              >
                <span className="material-symbols-outlined text-[19px]">search</span>
              </button>

              {/* Notification bell */}
              <button
                type="button"
                onClick={() => setShowNotificationLayer(true)}
                className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="알림"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#121829]" />
              </button>

              {/* Chat message */}
              <Link
                href="/teacher/chat"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="메시지"
              >
                <span className="material-symbols-outlined text-[19px]">chat_bubble</span>
              </Link>

              {/* + 수업 개설 button */}
              <button
                type="button"
                onClick={handleCreateLesson}
                className="bg-white text-slate-900 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5 active:scale-95 ml-1"
              >
                {appStatus !== 'approved' && (
                  <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
                )}
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>수업 개설</span>
              </button>
            </div>
          </div>

          {/* Big Hero Title & Slogan */}
          <div className="relative z-10 max-w-xl mt-4 sm:mt-5">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold text-white tracking-tight leading-[1.2]">
              Teach Korean <br />
              <span className="italic font-normal bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent">
                Through What You Love.
              </span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              한국어를 가르치는 선생님의 전문성과 가능성이 더 크게 빛나는 공간
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* MAIN BODY CONTAINER WITH FLOATING CARDS                   */}
        {/* ========================================================= */}
        <main className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-5 -mt-6 sm:-mt-8 relative z-20">
          {/* ======================================================= */}
          {/* 1. GREETING OVERLAY CARD                                */}
          {/* ======================================================= */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={avatarSrc}
                  alt={teacherName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-indigo-50 shadow-sm"
                />
                {appStatus === 'approved' && (
                  <span
                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold"
                    title="인증 완료 선생님"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 break-keep">
                  {teacherName} 선생님, 좋은 아침이에요! 👋
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-keep">
                  오늘도 여러분의 경험과 전문성이 누군가의 한국어 여정에 큰 힘이 됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-xs font-medium text-slate-500">{formattedDate}</span>
              <div className="bg-indigo-50 border border-indigo-100/80 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                <span>오늘의 일정 2건</span>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. REGISTRATION & REVIEW LIFECYCLE BANNER               */}
          {/* 회원가입 -> 로그인 -> 등록 신청 -> 심사 -> 승인 -> 대시보드 오픈 및 수업개설 */}
          {/* ======================================================= */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-indigo-100/70 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                    선생님 라이프사이클
                  </span>
                  {appStatus === 'approved' ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      심사 승인 완료 (수업 개설 가능)
                    </span>
                  ) : appStatus === 'review_pending' ? (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                      운영팀 심사 진행 중 (수업 개설 대기)
                    </span>
                  ) : appStatus === 'needs_changes' ? (
                    <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">assignment_late</span>
                      심사 보완 요청
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-600">등록 신청 대기</span>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  {appStatus === 'approved'
                    ? '정식 인증 선생님으로 승인되었습니다. 자유롭게 새로운 맞춤 수업을 개설하고 학생을 모집하세요.'
                    : appStatus === 'review_pending'
                    ? '운영팀에서 선생님의 프로필과 전문성을 심사하고 있습니다 (평균 24시간 내 완료). 승인 후 수업 개설이 활성화됩니다.'
                    : appStatus === 'needs_changes'
                    ? `운영팀 안내: "${feedback || '프로필 소개 및 전문분야를 보완해주세요.'}" 보완 후 재심사를 요청하세요.`
                    : '선생님 등록 신청서를 제출하시면 운영팀 심사를 거쳐 수업 개설이 열립니다.'}
                </p>
              </div>

              {/* 4-Step Progress Pill Tracker */}
              <div className="flex items-center gap-1 sm:gap-2 text-[11px] font-medium text-slate-500 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold shrink-0">
                  <span>✓ 1. 가입</span>
                </div>
                <span className="text-slate-300">→</span>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold shrink-0">
                  <span>✓ 2. 신청</span>
                </div>
                <span className="text-slate-300">→</span>
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold shrink-0 ${
                    appStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-100/80 text-amber-800 ring-1 ring-amber-300 animate-pulse'
                  }`}
                >
                  <span>{appStatus === 'approved' ? '✓ 3. 심사완료' : '⏳ 3. 심사 중'}</span>
                </div>
                <span className="text-slate-300">→</span>
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold shrink-0 ${
                    appStatus === 'approved'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span>{appStatus === 'approved' ? '🎉 4. 개설 오픈' : '🔒 4. 개설 오픈'}</span>
                </div>
              </div>
            </div>

            {/* Test / Demo Quick Switch Bar */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-indigo-500">science</span>
                <span>심사 테스트 토글:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleStatus('review_pending')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    appStatus === 'review_pending'
                      ? 'bg-amber-500 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  심사 중(잠김 테스트)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus('approved')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    appStatus === 'approved'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  운영자 승인 완료(대시보드 오픈)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus('needs_changes')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    appStatus === 'needs_changes'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  보완 요청
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 3. 5 QUICK ACTION CARDS ROW                             */}
          {/* ======================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: 수업 개설 (새로운 수업 만들기) */}
            <button
              type="button"
              onClick={handleCreateLesson}
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md hover:border-pink-200 transition-all text-left flex flex-col justify-between min-h-[105px] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-pink-600 transition-colors flex items-center gap-1">
                  <span>수업 개설</span>
                  {appStatus !== 'approved' && (
                    <span className="material-symbols-outlined text-[14px] text-amber-500">lock</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">새로운 수업 만들기</div>
              </div>
            </button>

            {/* Card 2: 프로필 업데이트 (전문성과 경력 정리) */}
            <Link
              href="/teacher/profile/edit"
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all text-left flex flex-col justify-between min-h-[105px] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">edit</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  프로필 업데이트
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">전문성과 경력 정리</div>
              </div>
            </Link>

            {/* Card 3: 자료 업로드 (수업 자료·활동지 저장) */}
            <Link
              href="/teacher/materials"
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md hover:border-teal-200 transition-all text-left flex flex-col justify-between min-h-[105px] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">folder</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                  자료 업로드
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">수업 자료·활동지 저장</div>
              </div>
            </Link>

            {/* Card 4: 소개서 내보내기 (이력서·포트폴리오 PDF) */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all text-left flex flex-col justify-between min-h-[105px] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">description</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  소개서 내보내기
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">이력서·포트폴리오 PDF</div>
              </div>
            </button>

            {/* Card 5: 새로운 기회 보기 (모집·협업·연수 확인) */}
            <a
              href="#opportunities"
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col justify-between min-h-[105px] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">campaign</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  새로운 기회 보기
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">모집·협업·연수 확인</div>
              </div>
            </a>
          </div>

          {/* ======================================================= */}
          {/* 4. MIDDLE ROW (3 EQUAL COLUMNS)                          */}
          {/* [오늘 할 일] | [오늘의 수업 일정] | [활동 요약 (이번 달)] */}
          {/* ======================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: 오늘 할 일 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-[20px]">edit</span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">오늘 할 일</h3>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                    {remainingTodos}
                  </span>
                </div>

                <div className="space-y-3">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            todo.done
                              ? 'bg-[#5b50f6] text-white'
                              : 'border-2 border-slate-300 bg-white'
                          }`}
                        >
                          {todo.done && <span className="material-symbols-outlined text-[15px]">check</span>}
                        </div>
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            todo.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                          }`}
                        >
                          {todo.text}
                        </span>
                      </div>
                      {todo.time && (
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {todo.time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => showToast('전체 할 일 목록을 확인합니다')}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>모두 보기</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Card 2: 오늘의 수업 일정 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-700 text-[20px]">calendar_today</span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">오늘의 수업 일정</h3>
                </div>

                <div className="space-y-3">
                  {/* Session 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600">10:00 - 11:00</span>
                        <span className="px-1.5 py-0.5 rounded-sm bg-teal-100 text-teal-700 text-[10px] font-bold">
                          ● 1:1
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                        K-pop으로 배우는 일상 표현 🎵
                      </div>
                    </div>
                    <Link
                      href="/teacher/lessons"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">videocam</span>
                      <span>입장하기</span>
                    </Link>
                  </div>

                  {/* Session 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600">19:00 - 20:00</span>
                        <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 text-[10px] font-bold">
                          ● 1:2
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                        한국 여행 회화 - 카페에서 ☕
                      </div>
                    </div>
                    <Link
                      href="/teacher/lessons"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">videocam</span>
                      <span>입장하기</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <Link
                  href="/teacher/lessons"
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>전체 일정 보기</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Card 3: 활동 요약 (이번 달) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">auto_awesome</span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">활동 요약 (이번 달)</h3>
                </div>

                {/* 3 Metric Counters */}
                <div className="grid grid-cols-3 gap-2 text-center pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                      <span>진행한 수업</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">12회</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">group</span>
                      <span>함께한 학생</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">8명</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px] text-amber-500">star</span>
                      <span>평균 만족도</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">4.9</div>
                  </div>
                </div>

                {/* Weekly Bar Chart */}
                <div className="mt-4">
                  <div className="h-20 flex items-end justify-between px-3 gap-3">
                    {/* Week 1 */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[36px] bg-indigo-200 hover:bg-indigo-300 rounded-t-md h-[30%] transition-all" />
                      <span className="text-[11px] text-slate-400">1주</span>
                    </div>
                    {/* Week 2 */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[36px] bg-indigo-200 hover:bg-indigo-300 rounded-t-md h-[55%] transition-all" />
                      <span className="text-[11px] text-slate-400">2주</span>
                    </div>
                    {/* Week 3 */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[36px] bg-indigo-200 hover:bg-indigo-300 rounded-t-md h-[70%] transition-all" />
                      <span className="text-[11px] text-slate-400">3주</span>
                    </div>
                    {/* Week 4 */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[36px] bg-indigo-500 hover:bg-indigo-600 rounded-t-md h-[95%] transition-all shadow-xs" />
                      <span className="text-[11px] text-indigo-600 font-bold">4주</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 5. BOTTOM ROW (3 EQUAL COLUMNS)                          */}
          {/* [내 페이지 미리보기] | [나의 전문성과 성장] | [지금 주목할 기회] */}
          {/* ======================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="opportunities">
            {/* Card 1: 내 페이지 미리보기 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-[20px]">badge</span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">내 페이지 미리보기</h3>
                  </div>
                  <Link
                    href={`/teachers/${user?.id || 'demo'}`}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="공개 페이지로 이동"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                </div>

                {/* Banner & Avatar preview */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100">
                  <div
                    className="w-full h-20 sm:h-24 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('/img/teacher/seoul-skyline-banner.jpg')",
                    }}
                  />
                  <div className="p-3 pt-0 relative flex items-end justify-between -mt-6">
                    <div className="flex items-end gap-2.5">
                      <img
                        src={avatarSrc}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-3 ring-white shadow-sm shrink-0"
                      />
                      <div className="pb-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900">{teacherName} 선생님</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            한국어 회화
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            K-pop
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            한국 문화
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <Link
                  href="/teacher/profile"
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold inline-block transition-colors"
                >
                  공개 페이지 보기
                </Link>
              </div>
            </div>

            {/* Card 2: 나의 전문성과 성장 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-4">나의 전문성과 성장</h3>

                <div className="flex items-center justify-between gap-3">
                  {/* Left Checklist */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500 shrink-0">verified_user</span>
                        <span className="text-slate-700 font-medium truncate">경력 5건 등록됨</span>
                      </div>
                      <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0">check_circle</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500 shrink-0">folder_special</span>
                        <span className="text-slate-700 font-medium truncate">대표 자료 4개 연결됨</span>
                      </div>
                      <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0">check_circle</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500 shrink-0">star</span>
                        <span className="text-slate-700 font-medium truncate">교육 사례 3건 작성됨</span>
                      </div>
                      <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0">check_circle</span>
                    </div>
                  </div>

                  {/* Right Progress Circle */}
                  <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#5b50f6]"
                          strokeDasharray="85, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-900">85%</span>
                        <span className="text-[9px] text-slate-400">완성도</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <Link
                  href="/teacher/profile"
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>보완하기</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Card 3: 지금 주목할 기회 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-[20px]">auto_awesome</span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">지금 주목할 기회</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('선생님 기회 센터(공고·연수) 오픈 예정')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center gap-0.5"
                  >
                    <span>더 보기</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Opportunity 1 */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">apartment</span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                        해외 한국문화센터 온라인 강사 모집
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold shrink-0">
                      D-7
                    </span>
                  </div>

                  {/* Opportunity 2 */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">menu_book</span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                        한국어 교재 공동 집필 프로젝트
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold shrink-0">
                      D-14
                    </span>
                  </div>

                  {/* Opportunity 3 */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">school</span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                        한국어 교육 워크숍 (온라인)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold shrink-0">
                      D-20
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <span className="text-[11px] text-slate-400">매주 새로운 기회가 업데이트됩니다</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* 6. APPROVAL REQUIRED MODAL (When not approved)             */}
      {/* ========================================================= */}
      {showApprovalLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              선생님 심사 승인 후 수업을 개설할 수 있습니다
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              현재 운영팀에서 선생님의 프로필과 교육 전문성을 심사하고 있습니다.
              승인이 완료되면 대시보드의 수업 개설 기능이 자동으로 활성화됩니다.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">신청자:</span>
                <span>{teacherName} 선생님</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">심사 상태:</span>
                <span className="text-amber-600 font-bold">운영팀 심사 진행 중</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalLockModal(false);
                  handleToggleStatus('approved');
                  router.push('/teacher/lessons/new');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5b50f6] to-[#7c3aed] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all"
              >
                관리자 즉시 승인하고 수업 개설하기 (테스트)
              </button>
              <button
                type="button"
                onClick={() => setShowApprovalLockModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. RESUME / PORTFOLIO EXPORT MODAL                        */}
      {/* ========================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">description</span>
                <h3 className="font-bold text-slate-900 text-base">선생님 소개서 · 포트폴리오 내보내기</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-3">
                  <img src={avatarSrc} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-bold text-slate-900">{teacherName} 선생님</div>
                    <div className="text-xs text-slate-500">Go Ssaem 공인 한국어 교육 전문가</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  선생님 프로필, 등록된 경력 5건, 대표 자료 4건, 교육 사례 3건이 포함된 PDF 소개서를 생성합니다.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                  <span>공개 경력 및 자격 사항 포함</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                  <span>대표 강의 계획서 및 수업 자료 링크 포함</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                  <span>Go Ssaem 공식 프로필 QR 코드 포함</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowExportModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#5b50f6] text-white text-xs font-bold shadow-xs hover:bg-[#4d42e6]"
              >
                PDF로 저장 / 인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Layer Drawer */}
      <NotificationLayer open={showNotificationLayer} onClose={() => setShowNotificationLayer(false)} />
    </div>
  );
}

