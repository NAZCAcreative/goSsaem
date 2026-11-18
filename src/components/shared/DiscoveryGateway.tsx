"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search, Sparkles, Users } from "lucide-react";
import styles from "./DiscoveryGateway.module.css";
export function DiscoverySwitcher({
  active,
  query = "",
}: {
  active: "lessons" | "teachers";
  query?: string;
}) {
  const suffix = query ? `?${new URLSearchParams({ q: query })}` : "";
  return (
    <nav className={styles.switcher} aria-label="수업과 쌤 찾기">
      <Link
        href={`/student/search${suffix}`}
        aria-current={active === "lessons" ? "page" : undefined}
        className={active === "lessons" ? styles.selected : ""}
      >
        <BookOpen size={18} />
        수업으로 찾기<span>주제·일정</span>
      </Link>
      <Link
        href={`/student/teachers${suffix}`}
        aria-current={active === "teachers" ? "page" : undefined}
        className={active === "teachers" ? styles.selected : ""}
      >
        <Users size={18} />
        쌤으로 찾기<span>소개·전문 분야</span>
      </Link>
    </nav>
  );
}
export function DiscoveryGateway() {
  const [mode, setMode] = useState<"lessons" | "teachers">("lessons");
  const router = useRouter();
  return (
    <section className={styles.gateway} aria-label="나에게 맞는 배움 찾기">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>
          <Sparkles size={13} /> FIND YOUR CONNECTION
        </span>
        <h2>어떤 배움을 만나고 싶나요?</h2>
        <p>좋아하는 주제로, 잘 맞는 쌤과 함께.</p>
      </div>
      <div className={styles.searchArea}>
        <div className={styles.mode} aria-label="검색 대상">
          {(["lessons", "teachers"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "lessons" ? (
                <BookOpen size={15} />
              ) : (
                <Users size={15} />
              )}{" "}
              {value === "lessons" ? "수업 찾기" : "쌤 찾기"}
            </button>
          ))}
        </div>
        <form
          role="search"
          action={mode === "lessons" ? "/student/search" : "/student/teachers"}
          onSubmit={(event) => {
            event.preventDefault();
            const query = String(
              new FormData(event.currentTarget).get("q") || "",
            ).trim();
            router.push(
              `${mode === "lessons" ? "/student/search" : "/student/teachers"}${query ? `?${new URLSearchParams({ q: query })}` : ""}`,
            );
          }}
        >
          <Search size={20} aria-hidden="true" />
          <input
            name="q"
            maxLength={200}
            type="search"
            aria-label={
              mode === "lessons"
                ? "배우고 싶은 수업 검색"
                : "쌤 이름과 전문 분야 검색"
            }
            placeholder={
              mode === "lessons"
                ? "여행 회화, 좋아하는 음악, 일상 이야기…"
                : "쌤 이름, 회화, TOPIK, 비즈니스…"
            }
          />
          <button
            aria-label={
              mode === "lessons" ? "수업 검색하기" : "쌤 검색하기"
            }
          >
            <ArrowRight size={20} />
          </button>
        </form>
        <div className={styles.suggestions}>
          <span>이런 배움은 어때요?</span>
          {["여행 회화", "일상 회화", "TOPIK"].map((query) => (
            <Link
              key={query}
              href={`${mode === "lessons" ? "/student/search" : "/student/teachers"}?${new URLSearchParams({ q: query })}`}
            >
              {query}
              <ArrowRight size={11} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
