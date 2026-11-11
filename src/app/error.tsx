'use client';

import { useEffect } from 'react';
import { showError } from '@/components/shared/AlertDialog';

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { showError('화면을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'); }, [error]);
  return <main className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-4">
    <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-primary px-6 py-3 text-on-primary">다시 시도</button>
  </main>;
}
