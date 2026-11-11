'use client';

import { useAlertState } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/components/shared/Toast';

const GROUPS = [
  {
    icon: 'notifications_active',
    iconClass: 'text-primary',
    title: '서비스 알림',
    items: [
      { id: 'lesson-start', title: '수업 시작 알림', description: '수업 10분 전에 알림을 보내드려요.', defaultChecked: true },
      { id: 'chat-message', title: '채팅 메시지 알림', description: '튜터나 매칭된 파트너의 새 메시지 알림입니다.', defaultChecked: true },
    ],
  },
  {
    icon: 'redeem',
    iconClass: 'text-secondary',
    title: '마케팅 알림',
    items: [{ id: 'marketing', title: '이벤트 및 혜택 알림', description: '할인 쿠폰, 특별 이벤트 등 유용한 정보를 받아보세요.', defaultChecked: false }],
  },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors active:scale-95 ${
        checked ? 'bg-primary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useAlertState<string>('');
  const [refresh, setRefresh] = useState(0);
  const saving = useRef(false);
  const [settings, setSettings] = useState(() =>
    Object.fromEntries(GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.defaultChecked]))),
  );

  useEffect(() => {
    let cancelled = false;
    if (!user) { setLoading(false); return; }
    setLoading(true); setError('');
    createClient().from('notification_preferences').select('lesson_start,chat_message,marketing').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError('알림 설정을 불러오지 못했습니다. 다시 시도해주세요.');
      else setSettings({ 'lesson-start': data?.lesson_start ?? true, 'chat-message': data?.chat_message ?? true, marketing: data?.marketing ?? false });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, refresh, setError]);
  const setSetting = async (id: string, checked: boolean) => {
    if (!user || loading || saving.current) return;
    saving.current = true; setError('');
    const next = { ...settings, [id]: checked };
    const column = id === 'lesson-start' ? 'lesson_start' : id === 'chat-message' ? 'chat_message' : 'marketing';
    try {
      const { error } = await createClient().rpc('set_notification_preference', { p_key: column, p_enabled: checked });
      if (error) throw error;
      setSettings(next); showToast('알림 설정을 저장했습니다');
    } catch { setError('저장하지 못했습니다. 다시 시도해주세요.'); }
    finally { saving.current = false; }
  };

  return (
    <PageContent loading={loading}>
    <div className="min-h-screen bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <div className="w-full bg-surface shadow-sm">
        <div className="flex h-16 w-full items-center justify-between px-container-margin">
          <Link href="/student/profile" className="flex items-center justify-center rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-[0.98]" aria-label="뒤로가기">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface">알림 설정</h1>
          <div className="w-10" />
        </div>
      </div>

      <main className="mx-auto max-w-lg px-container-margin pb-32 pt-stack-lg">
        <div className="flex flex-col gap-section-gap">
          {loading && <p role="status">알림 설정을 불러오는 중...</p>}
          {error && <div role="alert"><p className="text-red-600">{error}</p><button className="min-h-11 px-3 text-primary" onClick={() => setRefresh(value => value + 1)}>다시 불러오기</button></div>}
          {GROUPS.map((group) => (
            <section key={group.title} className="rounded-xl bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="mb-stack-lg flex items-center gap-2 border-b border-surface-container pb-3">
                <span className={`material-symbols-outlined ${group.iconClass}`}>{group.icon}</span>
                <h2 className="font-label-lg text-label-lg text-on-surface">{group.title}</h2>
              </div>
              <div className="flex flex-col gap-stack-lg">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-body-lg text-body-lg text-on-surface">{item.title}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{item.description}</span>
                    </div>
                    <Toggle checked={settings[item.id]} onChange={(checked) => { void setSetting(item.id, checked); }} label={item.title} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
    </PageContent>
  );
}
