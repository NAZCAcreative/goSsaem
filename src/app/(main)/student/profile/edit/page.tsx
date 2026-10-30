'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { getStudentProfile, updateStudentProfile } from '@/lib/queries/studentProfile';
import { useAuthStore } from '@/stores/auth-store';
import type { LanguageLevel } from '@/types';

const LEVEL_OPTIONS: { value: LanguageLevel; label: string }[] = [
  { value: 'beginner', label: '입문' },
  { value: 'elementary', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
  { value: 'topik1', label: 'TOPIK I' },
  { value: 'topik2', label: 'TOPIK II' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: '영어' },
  { value: 'zh', label: '중국어' },
  { value: 'ja', label: '일본어' },
  { value: 'es', label: '스페인어' },
  { value: 'vi', label: '베트남어' },
  { value: 'th', label: '태국어' },
  { value: 'fr', label: '프랑스어' },
  { value: 'de', label: '독일어' },
  { value: 'other', label: '기타' },
];

export default function StudentProfileEditPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [koreanLevel, setKoreanLevel] = useState<LanguageLevel>('beginner');
  const [nativeLanguage, setNativeLanguage] = useState('en');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getStudentProfile(user.id)
      .then((profile) => {
        if (cancelled || !profile) return;
        setName(profile.name);
        setKoreanLevel(profile.koreanLevel);
        setNativeLanguage(profile.nativeLanguage ?? 'en');
      })
      .catch(() => {
        if (!cancelled) showToast('프로필 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      await updateStudentProfile(user.id, { name: name.trim(), koreanLevel, nativeLanguage });
      showToast('프로필 정보가 저장되었습니다');
      router.push('/student/profile');
    } catch {
      showToast('프로필 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-background">
      <div className="mb-stack-lg flex h-16 items-center justify-between">
        <Link href="/student/profile" className="flex items-center text-on-surface transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </Link>
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary">내 정보 관리</h1>
        <div className="w-10" />
      </div>

      <form className="grid gap-6 lg:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <Field label="이름">
          <input
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="이름을 입력하세요"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="모국어">
          <select
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={nativeLanguage}
            onChange={(event) => setNativeLanguage(event.target.value)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="한국어 학습 레벨">
          <div className="flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((option) => {
              const active = koreanLevel === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKoreanLevel(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg px-4 py-2 font-label-sm text-label-sm font-semibold transition-all ${
                    active
                      ? 'border border-primary/20 bg-primary-container text-on-primary-container'
                      : 'border border-transparent bg-surface-container-high text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="pt-4 lg:col-span-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="block h-14 w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 text-center font-headline-md text-headline-md font-bold text-on-primary shadow-sm shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <label className="block px-1 font-headline-md text-label-lg font-semibold text-on-surface-variant">{label}</label>
      {children}
    </section>
  );
}
