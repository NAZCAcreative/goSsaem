import { create } from 'zustand';
import { errorMessage } from '@/lib/error-message';

export type AlertKind = 'error' | 'warning' | 'confirm';
export type AlertItem = { id: number; message: string; kind: AlertKind; resolve?: (accepted: boolean) => void };
let nextId = 0;
export const useAlertStore = create<{ queue: AlertItem[] }>(() => ({ queue: [] }));

function enqueue(message: string, kind: AlertKind, resolve?: AlertItem['resolve']) {
  if (!message.trim()) return;
  useAlertStore.setState(state => {
    if (kind !== 'confirm' && state.queue.some(item => item.kind === kind && item.message === message)) return state;
    return { queue: [...state.queue, { id: ++nextId, message, kind, resolve }] };
  });
}

export function showError(message: string) { if (message.trim()) enqueue(errorMessage(message), 'error'); }
export function showWarning(message: string) { enqueue(message, 'warning'); }
export function showConfirm(message: string): Promise<boolean> {
  if (!message.trim()) return Promise.resolve(false);
  return new Promise(resolve => enqueue(message, 'confirm', resolve));
}
export function dismissAlert(id: number, accepted: boolean) {
  const item = useAlertStore.getState().queue[0];
  if (!item || item.id !== id) return;
  useAlertStore.setState(state => ({ queue: state.queue.slice(1) }));
  item.resolve?.(accepted);
}
