'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Fragment, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

function AuthHydrator() {
  const syncUser = useAuthStore((s) => s.syncUser);
  useEffect(() => {
    let cancelled = false;
    let eventVersion = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let watchdog: ReturnType<typeof setTimeout>;
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (cancelled) return;
        eventVersion++;
        useAuthStore.getState().failHydration('로그인 상태 확인이 지연되고 있습니다. 다시 시도해주세요.');
      }, 8000);
    };
    armWatchdog();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'TOKEN_REFRESHED' && useAuthStore.getState().user?.id === session?.user.id) return;
      eventVersion++;
      armWatchdog();
      // Clear a previous account synchronously; defer requests outside Supabase's auth lock.
      if (useAuthStore.getState().user?.id !== session?.user.id) {
        useAuthStore.setState({ user: null, isAuthenticated: false, isHydrated: false });
      }
      const version = eventVersion;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!cancelled && version === eventVersion) void syncUser(session?.user.id || null).catch(() => {}).finally(() => {
          if (version === eventVersion) clearTimeout(watchdog);
        });
      }, 0);
      timers.add(timer);
    });
    const initialVersion = eventVersion;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && initialVersion === eventVersion) return syncUser(data.user?.id || null);
    }).catch(() => {
      if (!cancelled && initialVersion === eventVersion) useAuthStore.getState().failHydration('로그인 서버에 연결하지 못했습니다. 다시 시도해주세요.');
    }).finally(() => { if (initialVersion === eventVersion) clearTimeout(watchdog); });
    return () => { cancelled = true; clearTimeout(watchdog); timers.forEach(clearTimeout); subscription.unsubscribe(); };
  }, [syncUser]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore(s => s.user?.id);
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1 },
    },
  }), [userId]);
  useEffect(() => () => { void queryClient.cancelQueries(); queryClient.clear(); }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator />
      <Fragment key={userId || 'anonymous'}>{children}</Fragment>
    </QueryClientProvider>
  );
}
