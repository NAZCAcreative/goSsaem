'use client';

import { showConfirm, showError } from '@/components/shared/AlertDialog';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { deleteTeacherLesson, getTeacherLesson, updateTeacherLesson } from '@/lib/queries/teacherLessons';
import { useLessonConfigStore, DEFAULT_SUPPORTED_LANGUAGES } from '@/stores/lesson-config-store';
import {
  LESSON_CATEGORIES as DEFAULT_CATEGORIES,
  LESSON_LEVELS as DEFAULT_LEVELS,
  LESSON_LANGUAGES as DEFAULT_LANGUAGES,
} from '@/lib/lessonOptions';
import { showToast } from '@/components/shared/Toast';

export default function LessonEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('id');
  const config = useLessonConfigStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLanguages = config.languages.filter((l) => l.isActive).map((l) => l.label);
  const languageOptions = activeLanguages.length > 0 ? activeLanguages : DEFAULT_LANGUAGES;

  const supportedConfig = config.supportedLanguages || DEFAULT_SUPPORTED_LANGUAGES;
  const activeSupported = supportedConfig.filter((l) => l.isActive).map((l) => l.label);
  const supportedLanguageOptions =
    activeSupported.length > 0 ? activeSupported : DEFAULT_SUPPORTED_LANGUAGES.map((l) => l.label);

  const activeCategories = config.categories.filter((c) => c.isActive).map((c) => c.label);
  const categoryOptions = activeCategories.length > 0 ? activeCategories : DEFAULT_CATEGORIES;

  const activeLevels = config.levels.filter((l) => l.isActive).map((l) => l.label);
  const baseLevels = activeLevels.length > 0 ? activeLevels : DEFAULT_LEVELS;
  const levelOptions = baseLevels.includes('누구나')
    ? ['누구나', ...baseLevels.filter((lvl) => lvl !== '누구나')]
    : ['누구나', ...baseLevels];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [hasTargetAudience, setHasTargetAudience] = useState(true);
  const [level, setLevel] = useState('누구나');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGES[0]);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['한국어']);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
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
        if (lesson.level) {
          setHasTargetAudience(true);
          setLevel(lesson.level);
        } else {
          setHasTargetAudience(false);
          setLevel('누구나');
        }
        setCategory(lesson.category);
        setLanguage(lesson.language ?? DEFAULT_LANGUAGES[0]);
        setSupportedLanguages(
          Array.isArray(lesson.supportedLanguages) && lesson.supportedLanguages.length > 0
            ? lesson.supportedLanguages
            : ['한국어']
        );
        setImageUrl(lesson.imageUrl ?? '');
        setVideoUrl(lesson.videoUrl ?? '');
        setPrice(String(lesson.price));
        setDescription(lesson.description ?? '');
      })
      .catch(() => {
        if (!cancelled) showError('수업 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const toggleSupportedLanguage = (lang: string) => {
    if (supportedLanguages.includes(lang)) {
      if (supportedLanguages.length <= 1) {
        showError('대응 언어는 최소 1개 이상 선택해야 합니다.');
        return;
      }
      setSupportedLanguages(supportedLanguages.filter((l) => l !== lang));
    } else {
      setSupportedLanguages([...supportedLanguages, lang]);
    }
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('이미지 파일(JPG, PNG, WebP)만 선택해주세요.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('이미지 파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  async function handleDelete() {
    if (!lessonId) return;
    const confirmed = await showConfirm('정말 이 수업을 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.');
    if (!confirmed) return;
    try {
      await deleteTeacherLesson(lessonId);
      showToast('수업 정보가 삭제되었습니다');
      router.push('/teacher/lessons');
    } catch {
      showError('수업 삭제에 실패했습니다');
    }
  }

  async function handleSave() {
    if (!lessonId) return;
    if (!title.trim()) {
      showError('수업 제목을 입력해주세요');
      return;
    }
    if (supportedLanguages.length === 0) {
      showError('대응 가능 언어를 최소 1개 이상 선택해주세요');
      return;
    }
    setSaving(true);
    try {
      await updateTeacherLesson(lessonId, {
        title: title.trim(),
        level: hasTargetAudience ? level : null,
        category,
        language,
        supportedLanguages,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        price: Number(price) || 0,
        description: description || null,
      });
      showToast('수업 정보가 저장되었습니다');
      router.push('/teacher/lessons');
    } catch {
      showError('수업 정보 저장에 실패했습니다');
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
          {/* 대표 이미지 & 영상 링크 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">image</span>
              수업 대표 이미지 & 소개 영상 (선택 사항)
            </h3>

            {imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="relative aspect-video w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="수업 이미지 미리보기" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                    이미지 등록됨
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      변경
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl text-primary mb-1">add_photo_alternate</span>
                <span className="text-sm font-bold text-slate-800">대표 이미지 등록 (클릭)</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, WebP (최대 5MB)</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">수업 소개 영상 링크</label>
              <input
                type="url"
                placeholder="예: https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <FormField label="수업 제목">
            <input className={inputClass} placeholder="수업 제목을 입력하세요" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
          </FormField>

          {/* 수업 진행 언어 & 카테고리 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="수업 진행 언어 (주 언어)">
              <select className={selectClass} value={language} onChange={(event) => setLanguage(event.target.value)}>
                {languageOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FormField>

            <FormField label="카테고리">
              <select className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* 선생님 가능 언어 (대응 언어 - 다중 선택) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <label className="text-sm font-semibold text-slate-900 block">선생님 가능 언어 · 대응 언어 (다중 선택)</label>
            <div className="flex flex-wrap gap-2">
              {supportedLanguageOptions.map((lang) => {
                const isSelected = supportedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleSupportedLanguage(lang)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-2 border-primary bg-primary text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 수업 대상 (활성화 / 비활성화 & 누구나) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <label className="text-sm font-semibold text-slate-900 block">수업 대상 설정 여부</label>
                <p className="text-xs text-slate-500">
                  {hasTargetAudience ? '수업 대상을 지정하여 맞춤형 레벨로 운영합니다.' : '수업 대상을 제한하지 않고 누구나 수강할 수 있습니다.'}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setHasTargetAudience(true)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    hasTargetAudience ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  활성화
                </button>
                <button
                  type="button"
                  onClick={() => setHasTargetAudience(false)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    !hasTargetAudience ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  비활성화
                </button>
              </div>
            </div>

            {hasTargetAudience ? (
              <FormField label="대상 레벨 ('누구나' 버튼 포함)">
                <select className={selectClass} value={level} onChange={(event) => setLevel(event.target.value)}>
                  {levelOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="material-symbols-outlined text-base text-slate-500">public</span>
                <span>수업 대상 미지정 (누구나 참여 가능한 수업으로 설정됨)</span>
              </div>
            )}
          </div>

          <FormField label="회당 수강료">
            <div className="relative">
              <input className={`${inputClass} pr-12`} min="0" placeholder="0" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">원</span>
            </div>
          </FormField>

          <FormField label="수업 상세 설명">
            <textarea className={`${inputClass} min-h-[160px] resize-y`} placeholder="수업에 대한 상세한 설명을 적어주세요" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormField>
        </section>

        <aside className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="font-title-md text-base font-bold text-on-surface">수업 정보 미리보기</h3>
          <p className="text-xs text-on-surface-variant">
            수정하신 수업 정보는 저장 즉시 반영되며, 학생에게 보이는 수업 상세 페이지에 노출됩니다.
          </p>
          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>진행 언어</span>
              <span className="font-bold text-primary">{language}</span>
            </div>
            <div className="flex justify-between">
              <span>대응 언어</span>
              <span className="font-semibold text-slate-800">{supportedLanguages.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span>수업 대상</span>
              <span className="font-semibold text-slate-800">{hasTargetAudience ? level : '누구나'}</span>
            </div>
            <div className="flex justify-between">
              <span>수업료</span>
              <span className="font-bold text-slate-900">{Number(price || 0).toLocaleString()}원</span>
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-primary py-3.5 text-center font-label-lg font-bold text-white shadow-xs transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? '저장 중...' : '수정 완료'}
          </button>
        </aside>
      </form>
    </main>
  );
}

const inputClass = 'w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary';
const selectClass = 'w-full rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-on-surface transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block font-label-lg text-sm font-semibold text-on-surface">{label}</label>
      {children}
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-body-lg text-on-surface-variant">수업 정보를 불러오는 중입니다...</p>
    </div>
  );
}
