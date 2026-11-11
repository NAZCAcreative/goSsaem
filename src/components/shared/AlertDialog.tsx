'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dismissAlert, showError, showWarning, useAlertStore } from '@/stores/alert-store';
export { showError, showWarning, showConfirm } from '@/stores/alert-store';

// Keep page error state for retry controls, while every new failure opens a dialog.
export function useAlertState<T extends string | null = string>(initial: T) {
  const [message, setMessage] = useState<T>(initial);
  const update = useCallback((value: T) => {
    setMessage(value);
    if (value) showError(value);
  }, []);
  return [message, update] as const;
}

export function AlertDialogHost() {
  const current = useAlertStore(state => state.queue[0]);
  const currentId = current?.id;
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Suppress browser validation bubbles and announce the first invalid field in a layer.
    let validating = false;
    const invalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      event.preventDefault();
      if (validating) return;
      validating = true;
      queueMicrotask(() => { validating = false; });
      field.focus();
      const label = field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '';
      showWarning([label, field.validationMessage].filter(Boolean).join(': '));
    };
    document.addEventListener('invalid', invalid, true);
    return () => document.removeEventListener('invalid', invalid, true);
  }, []);

  useEffect(() => {
    if (currentId === undefined) return;
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    button.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [currentId]);

  if (!current) return null;
  const confirm = current.kind === 'confirm';
  return <dialog ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="global-alert-title" aria-describedby="global-alert-message"
    onCancel={event => { event.preventDefault(); event.stopPropagation(); dismissAlert(current.id, false); }}
    onKeyDown={event => event.stopPropagation()}
    className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border-0 bg-surface p-6 text-on-surface shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${current.kind === 'error' ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'}`}>
      <span aria-hidden="true" className="material-symbols-outlined">{current.kind === 'error' ? 'error' : 'warning'}</span>
    </div>
    <h2 id="global-alert-title" className="text-xl font-bold">{current.kind === 'error' ? '오류 안내' : confirm ? '확인해주세요' : '주의 안내'}</h2>
    <p id="global-alert-message" className="mt-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">{current.message}</p>
    <div className="mt-6 flex gap-3">
      {confirm && <button ref={button} type="button" className="min-h-11 flex-1 rounded-xl border border-outline-variant px-4 py-3" onClick={() => dismissAlert(current.id, false)}>취소</button>}
      <button ref={confirm ? undefined : button} type="button" className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-3 font-bold text-on-primary" onClick={() => dismissAlert(current.id, true)}>확인</button>
    </div>
  </dialog>;
}
