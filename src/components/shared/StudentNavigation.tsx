"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  GraduationCap,
  Home,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isNavItemActive, useNavigationStore } from "@/stores/navigation-store";
import { LogoutButton } from "./LogoutButton";
import styles from "./StudentNavigation.module.css";

const icons: Record<string, typeof Home> = {
  "s-home": Home,
  "s-search": Compass,
  "s-bookings": BookOpen,
  "s-chat": MessageCircle,
  "s-profile": UserRound,
};
export function StudentNavigation({
  landing = false,
  unreadCount = 0,
  onNotifications,
  isAdmin = false,
}: {
  landing?: boolean;
  unreadCount?: number;
  onNotifications?: () => void;
  isAdmin?: boolean;
}) {
  const user = useAuthStore((s) => s.user),
    ready = useAuthStore((s) => s.isHydrated);
  const student = ready && user?.role === "student" ? user : null;
  const pathname = usePathname();
  const items = useNavigationStore((s) => s.getItems)("student").filter(
    (item) =>
      item.isActive && !/^\/(teacher|signup\/teacher)([/?#]|$)/.test(item.href),
  );
  const [open, setOpen] = useState<"discover" | "account" | null>(null);
  const wrapper = useRef<HTMLElement>(null),
    discoverButton = useRef<HTMLButtonElement>(null),
    accountButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wrapper.current?.contains(event.target)
      )
        setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        (open === "discover" ? discoverButton : accountButton).current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <header
      ref={wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
      }}
      className={`global-top-nav ${styles.header}`}
      data-student-navigation
      data-landing-header={landing || undefined}
    >
      <div className={styles.inner}>
        <Link
          href={student ? "/student/home" : "/student"}
          className={styles.brand}
          aria-label="고쌤 학생 홈"
        >
          <Image
            src="/img/gossaem_logo02.png"
            alt="고쌤"
            width={2172}
            height={724}
            priority
          />
          <span>취향으로 만나는 한국어</span>
        </Link>
        <nav aria-label="학생 상단 메뉴" className={styles.navigation}>
          {items.map((item) => {
            const active = isNavItemActive(item, pathname),
              Icon = icons[item.id] || Compass;
            const href =
              student && item.href === "/student" ? "/student/home" : item.href;
            return (
              <div key={item.id} className={styles.navItem}>
                <div
                  className={`${styles.navPill} ${active ? styles.active : ""}`}
                >
                  <Link href={href} aria-current={active ? "page" : undefined}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                  {item.id === "s-search" && (
                    <button
                      ref={discoverButton}
                      onClick={() =>
                        setOpen((value) =>
                          value === "discover" ? null : "discover",
                        )
                      }
                      className={styles.expand}
                      aria-label="수업과 선생님 탐색 메뉴"
                      aria-expanded={open === "discover"}
                      aria-controls={`${id}-discover`}
                    >
                      <ChevronDown
                        size={14}
                        className={open === "discover" ? styles.rotated : ""}
                      />
                    </button>
                  )}
                </div>
                {item.id === "s-search" && open === "discover" && (
                  <div id={`${id}-discover`} className={styles.discovery}>
                    <p className={styles.menuEyebrow}>
                      <Sparkles size={14} />
                      배움을 찾는 두 가지 방법
                    </p>
                    <Link href="/student/search" onClick={() => setOpen(null)}>
                      <span className={styles.menuIcon}>
                        <BookOpen size={22} />
                      </span>
                      <span>
                        <strong>수업으로 찾기</strong>
                        <small>관심 주제와 가능한 일정으로</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                    <Link
                      href="/student/teachers"
                      onClick={() => setOpen(null)}
                    >
                      <span className={`${styles.menuIcon} ${styles.peach}`}>
                        <Users size={22} />
                      </span>
                      <span>
                        <strong>선생님으로 찾기</strong>
                        <small>소개·전문 분야·후기를 살펴보세요</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                    <div className={styles.menuFooter}>
                      <GraduationCap size={16} />
                      <Link href="/guide" onClick={() => setOpen(null)}>
                        처음 이용하시나요? 이용 안내
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className={styles.actions}>
          <Link
            href="/student/search"
            className={styles.mobileSearch}
            aria-label="수업 찾기"
          >
            <Search size={21} />
          </Link>
          {student ? (
            <>
              {onNotifications ? (
                <button
                  className={styles.iconButton}
                  aria-label={unreadCount ? `알림 ${unreadCount}개` : "알림"}
                  onClick={onNotifications}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && <span className={styles.dot} />}
                </button>
              ) : (
                <Link
                  href="/notifications"
                  aria-label="알림"
                  className={styles.iconButton}
                >
                  <Bell size={20} />
                </Link>
              )}
              <div className={styles.accountWrap}>
                <button
                  ref={accountButton}
                  className={styles.account}
                  aria-expanded={open === "account"}
                  aria-controls={`${id}-account`}
                  onClick={() =>
                    setOpen((value) => (value === "account" ? null : "account"))
                  }
                  aria-label="내 계정 메뉴"
                >
                  <span className={styles.avatar}>
                    {student.name?.slice(0, 1) || "나"}
                  </span>
                  <span className={styles.accountName}>
                    {student.name || "학생"}님
                  </span>
                  <ChevronDown size={14} />
                </button>
                {open === "account" && (
                  <div id={`${id}-account`} className={styles.accountMenu}>
                    <strong>오늘도 반가워요, {student.name || "학생"}님</strong>
                    <Link href="/student/profile" onClick={() => setOpen(null)}>
                      <UserRound size={17} />내 정보
                    </Link>
                    <Link href="/student/report" onClick={() => setOpen(null)}>
                      <GraduationCap size={17} />
                      학습 기록
                    </Link>
                    {isAdmin && (
                      <Link href="/admin">
                        <ShieldCheck size={17} />
                        관리자
                      </Link>
                    )}
                    <LogoutButton />
                  </div>
                )}
              </div>
            </>
          ) : ready ? (
            <>
              <Link
                href="/login?role=student&next=%2Fstudent%2Fhome"
                className={styles.login}
              >
                로그인
              </Link>
              <Link href="/signup/student" className={styles.join}>
                시작하기 <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <span
              className={styles.authLoading}
              aria-label="로그인 상태 확인 중"
            />
          )}
        </div>
        {open && (
          <button
            className={styles.mobileClose}
            onClick={() => setOpen(null)}
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
