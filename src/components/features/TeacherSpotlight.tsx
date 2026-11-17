"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Star, Users } from "lucide-react";
import { searchTeachers, type TeacherCard } from "@/lib/queries/teachers";
import { TeacherImage } from "@/components/shared/LearningImage";
import styles from "./TeacherSpotlight.module.css";
export function TeacherSpotlight() {
  const [teachers, setTeachers] = useState<TeacherCard[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    searchTeachers({
      query: "",
      specialty: null,
      price: "all",
      periods: [],
      sort: "recommended",
      page: 1,
      size: 4,
    })
      .then((result) => {
        if (active) setTeachers(result.items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <section className={styles.section} aria-label="함께 배울 선생님">
      <div className={styles.heading}>
        <div>
          <p>MEET YOUR TEACHER</p>
          <h2>내 이야기를 함께할 선생님</h2>
          <span>
            소개와 전문 분야를 살펴보고, 나에게 맞는 선생님을 만나보세요.
          </span>
        </div>
        <Link href="/student/teachers">
          선생님 모두 보기 <ArrowUpRight size={16} />
        </Link>
      </div>
      {loading ? (
        <div role="status" className={styles.empty}>
          선생님을 만나러 가는 중이에요…
        </div>
      ) : error ? (
        <div role="alert" className={styles.empty}>
          선생님을 불러오지 못했습니다.
          <button onClick={() => setRetry((value) => value + 1)}>
            다시 시도
          </button>
        </div>
      ) : teachers.length ? (
        <div className={styles.grid}>
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              href={`/teachers/${teacher.id}`}
              className={styles.card}
            >
              <TeacherImage
                name={teacher.name}
                avatarUrl={teacher.avatarUrl}
                avatarIsGenerated={teacher.avatarIsGenerated}
                specialties={teacher.specialties}
                className={styles.portrait}
              />
              <div className={styles.body}>
                <div className={styles.name}>
                  <h3>{teacher.name} 선생님</h3>
                  <ArrowUpRight size={18} />
                </div>
                <p>{teacher.headline || "함께 이야기하며 배우는 한국어"}</p>
                <div className={styles.tags}>
                  {teacher.specialties.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className={styles.meta}>
                  {teacher.ratingCount > 0 ? (
                    <span>
                      <Star size={12} />
                      {teacher.ratingAvg.toFixed(1)}{" "}
                      <small>후기 {teacher.ratingCount}개</small>
                    </span>
                  ) : (
                    <small>선생님 소개를 만나보세요</small>
                  )}
                  {teacher.minPrice !== null && (
                    <strong>
                      {teacher.minPrice === 0
                        ? "무료 수업부터"
                        : `${teacher.minPrice.toLocaleString("ko-KR")}원부터`}
                    </strong>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Users size={26} />
          <p>공개 선생님을 준비하고 있어요.</p>
          <Link href="/student/teachers">선생님 찾기 둘러보기 →</Link>
        </div>
      )}
    </section>
  );
}
