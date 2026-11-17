'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DesignModeSwitch } from './DesignModeSwitch';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';

export function SettingsDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const isTeacher = useAuthStore(s => s.user?.role === 'teacher');
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);
  useEffect(() => { dialog.current?.close(); }, [pathname]);

  return (
    <>
      <button type="button" disabled={!ready} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-container-low" aria-label="설정" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">settings</span>
      </button>
      <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="settings-dialog-content">
          <div className="flex items-center justify-between gap-4">
            <h2 id="settings-title" className="text-xl font-bold">설정</h2>
            <button type="button" autoFocus className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container" aria-label="설정 닫기" onClick={() => dialog.current?.close()}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
          <section className="mt-5" aria-labelledby="design-title">
            <h3 id="design-title" className="font-semibold">화면 디자인</h3>
            <p className="mb-4 mt-1 text-sm text-on-surface-variant">모든 화면에 적용할 색상과 버튼 스타일을 선택하세요.</p>
            <DesignModeSwitch />
            <nav className="mt-5 flex flex-wrap gap-4 text-sm text-primary"><Link className="inline-flex min-h-11 items-center" href="/account">계정·보안 설정</Link><Link className="inline-flex min-h-11 items-center" href="/guide">이용 안내</Link></nav>
            {isTeacher && <Link className="inline-flex min-h-11 items-center text-sm text-primary" href="/teacher/availability">공통 상담 시간·휴무 관리</Link>}
          </section>
        </div>
      </dialog>
    </>
  );
}
