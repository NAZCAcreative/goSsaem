'use client';

import { useEffect, useState } from 'react';

type DesignMode = 'classic' | 'gossaem';
const STORAGE_KEY = 'gossaem-design-mode';

export function DesignModeSwitch() {
  const [mode, setMode] = useState<DesignMode>('gossaem');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setMode(document.documentElement.dataset.design === 'classic' ? 'classic' : 'gossaem');
    sync();
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        document.documentElement.dataset.design = event.newValue === 'classic' ? 'classic' : 'gossaem';
        sync();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function changeMode(next: DesignMode) {
    document.documentElement.dataset.design = next;
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep switching available when storage is disabled. */ }
  }

  return (
    <div className="design-mode-switch" role="group" aria-label="디자인 모드">
      {(['classic', 'gossaem'] as const).map((value) => (
        <button key={value} type="button" disabled={!ready} aria-pressed={mode === value} onClick={() => changeMode(value)}>
          <span className={`design-mode-preview design-mode-preview-${value}`} aria-hidden="true"><i /><i /><i /></span>
          <span className="font-semibold">{value === 'classic' ? '기본' : 'GoSsaem'}</span>
          <span className="design-mode-description">{value === 'classic' ? '퍼플 · 핑크' : '네이비 · 코랄 · 크림'}</span>
        </button>
      ))}
    </div>
  );
}
