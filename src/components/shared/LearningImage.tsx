'use client';

import Image from 'next/image';
import { useState } from 'react';

export const LEARNING_IMAGES = {
  cafe: '/img/generated/learning-cafe.png',
  desk: '/img/generated/study-desk.png',
  seoul: '/img/generated/seoul-walk.png',
} as const;

export function LearningImage({ scene = 'desk', className = '', priority = false, sizes = '(max-width: 640px) 100vw, 640px' }: {
  scene?: keyof typeof LEARNING_IMAGES;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const descriptions = { cafe: '밝은 카페에서 함께 한국어를 공부하는 사람들', desk: '햇살이 드는 한국어 학습 책상', seoul: '봄날의 서울 한옥 골목' };
  return <Image src={LEARNING_IMAGES[scene]} alt={`${descriptions[scene]} · AI 생성 이미지`} width={1536} height={1024} className={`object-cover ${className}`} priority={priority} sizes={sizes} />;
}

/** Uploaded portraits take precedence; illustrative portraits are explicitly labeled. */
export function TeacherImage({ name, avatarUrl, specialties = [], className = '', avatarIsGenerated = false }: {
  name: string;
  avatarUrl?: string | null;
  specialties?: string[];
  className?: string;
  avatarIsGenerated?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasPortrait = Boolean(avatarUrl && avatarUrl !== failedUrl);
  const isStoredPortrait = avatarUrl?.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/teacher-portraits/`);
  const scene = specialties.some((specialty) => /여행|문화|travel/i.test(specialty)) ? 'seoul' : 'desk';
  return (
    <div className={`relative overflow-hidden bg-surface-container-low ${className}`}>
      {hasPortrait ? (
        <>
          {isStoredPortrait ? (
            <Image src={avatarUrl!} alt={`${name} 쌤${avatarIsGenerated ? ' · AI 생성 인물' : ''}`} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover object-top" onError={() => setFailedUrl(avatarUrl!)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl!} alt={`${name} 쌤`} className="h-full w-full object-cover object-top" loading="lazy" onError={() => setFailedUrl(avatarUrl!)} />
          )}
          {avatarIsGenerated && <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-on-surface">AI 생성 이미지</span>}
        </>
      ) : (
        <>
          <LearningImage scene={scene} className="h-full w-full" sizes="(max-width: 640px) 384px, 480px" />
          <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-on-surface">수업 이미지</span>
        </>
      )}
    </div>
  );
}
