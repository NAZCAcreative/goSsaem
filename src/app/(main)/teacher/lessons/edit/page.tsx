'use client';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/components/shared/Toast';
import { deleteTeacherLesson, getTeacherLesson, updateTeacherLesson } from '@/lib/queries/teacherLessons';
import { LESSON_CATEGORIES as CATEGORY_OPTIONS, LESSON_LEVELS as LEVEL_OPTIONS } from '@/lib/lessonOptions';

function TeacherLessonEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState(LEVEL_OPTIONS[0]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getTeacherLesson(lessonId)
      .then((lesson) => {
        if (cancelled || !lesson) return;
        setTitle(lesson.title);
        setLevel(lesson.level ?? LEVEL_OPTIONS[0]);
        setCategory(lesson.category);
        setPrice(String(lesson.price));
        setDescription(lesson.description ?? '');
      })
      .catch(() => {
        if (!cancelled) showToast('수업 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function handleDelete() {
    if (!lessonId) return;
    const confirmed = window.confirm('정말 이 수업을 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.');
    if (!confirmed) return;
    try {
      await deleteTeacherLesson(lessonId);
      showToast('수업 정보가 삭제되었습니다');
      router.push('/teacher/lessons');
    } catch {
      showToast('수업 삭제에 실패했습니다');
    }
  }

  async function handleSave() {
    if (!lessonId) return;
    setSaving(true);
    try {
      await updateTeacherLesson(lessonId, { title, level, category, price: Number(price) || 0, description: description || null });
      showToast('수업 정보가 저장되었습니다');
      router.push('/teacher/lessons');
    } catch {
      showToast('수업 정보 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  if (!lessonId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-4 bg-background px-container-margin text-center">
        <p className="font-headline-md text-headline-md text-on-surface">수정할 수업을 찾을 수 없습니다</p>
        <Link href="/teacher/lessons" className="rounded-lg bg-primary px-6 py-3 font-label-lg text-on-primary">
          수업관리로 돌아가기
        </Link>
      </main>
    );
  }

  if (loading) return <PageLoading />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-surface">
      <section className="mb-8 flex items-center justify-between">
        <Link href="/teacher/lessons" className="text-primary transition-transform active:scale-[0.98]" aria-label="뒤로가기">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md font-bold text-primary">수업 수정</h1>
        <button className="text-error transition-transform active:scale-[0.98]" onClick={() => void handleDelete()} aria-label="수업 삭제">
          <span className="material-symbols-outlined text-2xl">delete</span>
        </button>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-headline-lg text-2xl font-bold text-on-surface">기존 수업 정보 수정</h2>
        <p className="text-sm text-on-surface-variant">변경하고자 하는 내용을 입력하신 후 하단의 수정 완료 버튼을 눌러주세요.</p>
      </section>

      <form className="grid gap-section-gap lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" onSubmit={(event) => event.preventDefault()}>
        <section className="space-y-6">
          <FormField label="수업 제목">
            <input className={inputClass} placeholder="수업 제목을 입력하세요" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="대상">
              <select className={selectClass} value={level} onChange={(event) => setLevel(event.target.value)}>
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </FormField>
            <FormField label="카테고리">
              <select className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="수강료 (원)">
            <div className="relative">
              <input
                className={`${inputClass} pl-4`}
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-on-surface-variant">원</span>
            </div>
          </FormField>

          <FormField label="상세 설명">
            <textarea
              className="w-full resize-none rounded-xl border-0 bg-white p-4 shadow-sm ring-1 ring-inset ring-outline-variant transition-all outline-none focus:ring-2 focus:ring-primary"
              rows={8}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
        </section>

        <aside className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] lg:sticky lg:top-24">
          <div className="space-y-2 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
            <p>수업 정보는 저장 후 학생 화면에 반영됩니다.</p>
            <p>수업 일정(날짜/시간)은 예약 시점에 새 회차로 생성됩니다.</p>
          </div>
          <button
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl primary-gradient-btn font-headline-md text-lg font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <span className="material-symbols-outlined">check_circle</span>
            {saving ? '저장 중...' : '수정 완료'}
          </button>
        </aside>
      </form>
    </main>
  );
}

const inputClass = 'h-12 w-full rounded-xl border-0 bg-white px-4 shadow-sm ring-1 ring-inset ring-outline-variant transition-all outline-none focus:ring-2 focus:ring-primary';
const selectClass = `${inputClass} appearance-none`;

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block font-headline-md text-sm font-bold text-on-surface">{label}</span>
      {children}
    </label>
  );
}

export default function TeacherLessonEditPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TeacherLessonEditContent />
    </Suspense>
  );
}
