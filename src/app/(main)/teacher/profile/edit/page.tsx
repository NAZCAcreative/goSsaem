'use client';

import { showError, showWarning } from '@/components/shared/AlertDialog';

import { PageLoading } from '@/components/shared/PageLoading';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { getTeacherDetail, updateTeacherProfileForm } from '@/lib/queries/teachers';
import { useAuthStore } from '@/stores/auth-store';
import { TeacherImage } from '@/components/shared/LearningImage';
import { uploadTeacherPortrait } from '@/lib/queries/teacherPortraits';

const SPECIALTY_OPTIONS = ['TOPIK', '회화', '비즈니스 한국어', '발음 교정', '문화/K-Pop'];

export default function TeacherProfileEditPage({ searchParams }: { searchParams: { from?: string } }) {
  const returnHref = searchParams.from === 'application' ? '/teacher/apply' : '/teacher/profile';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profileId = user?.id;
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarIsGenerated, setAvatarIsGenerated] = useState(false);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!profileId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getTeacherDetail(profileId)
      .then((detail) => {
        if (cancelled || !detail) return;
        setName(detail.name);
        setHeadline(detail.headline ?? '');
        setAvatarUrl(detail.avatarUrl);
        setAvatarIsGenerated(detail.avatarIsGenerated);
        setBio(detail.bio ?? '');
        setSpecialties(detail.specialties);
      })
      .catch(() => {
        if (!cancelled) showError('프로필 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, isHydrated]);

  const toggleSpecialty = (label: string) => {
    setSpecialties((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]));
  };

  const handleSave = async () => {
    if (!user || uploading) return;
    if (!name.trim()) {
      showWarning('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      await updateTeacherProfileForm(user.id, { name: name.trim(), headline: headline.trim(), bio, specialties });
      showToast('프로필 정보가 저장되었습니다');
      router.push(returnHref);
    } catch {
      showError('프로필 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user || uploading || saving) return;
    setUploading(true);
    try {
      const url = await uploadTeacherPortrait(user.id, file);
      setAvatarUrl(url);
      setAvatarIsGenerated(false);
      showToast('프로필 사진이 저장되었습니다');
      await useAuthStore.getState().fetchMe().catch(() => undefined);
    } catch (error) {
      showError(error instanceof Error ? error.message : '사진 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-background">
      <Link href="/teacher/profile/matching" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"><span><strong className="block text-sm text-on-surface">언어·성향·맞춤 추천 설정</strong><span className="mt-1 block text-xs text-on-surface-variant">언어별 레벨, 관심사, 수업 방식과 MBTI를 설정하세요.</span></span><span className="text-sm font-semibold text-primary">설정하기 →</span></Link>
      <div className="mb-stack-lg flex h-16 items-center justify-between">
        <Link href={returnHref} className="flex items-center text-on-surface transition-opacity hover:opacity-80 active:scale-[0.98]" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">소개 편집</h1>
        <div className="w-10" />
      </div>

      <form className="mt-8 grid gap-6 lg:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <label className="block lg:col-span-2 font-label-lg">한 줄 소개
          <input maxLength={160} value={headline} onChange={event => setHeadline(event.target.value)} placeholder="어떤 학습자를 어떻게 돕는 선생님인가요?" className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3" />
        </label>
        <section className="flex flex-wrap items-center gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 lg:col-span-2">
          <TeacherImage name={name || '나의'} avatarUrl={avatarUrl} avatarIsGenerated={avatarIsGenerated} className="h-40 w-32 shrink-0 rounded-xl" />
          <div className="min-w-0 space-y-2">
            <label htmlFor="teacher-portrait" className="block font-headline-md font-semibold text-on-surface">프로필 사진</label>
            <p className="text-sm text-on-surface-variant">얼굴이 잘 보이는 사진을 선택해주세요. JPG·PNG·WebP, 최대 5MB</p>
            <input
              id="teacher-portrait"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!user || uploading || saving}
              className="block w-full max-w-sm text-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-3 file:font-semibold file:text-primary disabled:opacity-50"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handlePhotoUpload(file);
              }}
            />
            <p role="status" className="text-xs text-on-surface-variant">{uploading ? '사진을 저장하고 있어요...' : '사진을 선택하면 바로 저장되어 선생님 목록과 프로필에 반영됩니다.'}</p>
          </div>
        </section>
        <Field label="이름">
          <input
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="이름을 입력하세요"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="전문 분야">
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((label) => {
              const active = specialties.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleSpecialty(label)}
                  aria-pressed={active}
                  className={`rounded-lg px-4 py-2 font-label-sm text-label-sm font-semibold transition-all ${
                    active
                      ? 'border border-primary/20 bg-primary-container text-on-primary-container'
                      : 'border border-transparent bg-surface-container-high text-on-surface-variant hover:border-primary/30'
                  }`}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="자기소개 (최대 500자)">
          <textarea
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-md leading-relaxed transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="학생들에게 본인을 소개해주세요."
            rows={6}
            maxLength={500}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
          <div className="px-1 text-right">
            <span className="text-xs font-medium text-on-surface-variant">{bio.length} / 500</span>
          </div>
        </Field>

        <div className="pt-4 lg:col-span-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || uploading}
            className="block h-14 w-full rounded-xl primary-gradient-btn py-3.5 text-center font-headline-md text-headline-md font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
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
