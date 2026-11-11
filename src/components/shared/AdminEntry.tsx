'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

const ADMIN_EMAILS = ['nazca4902@naver.com', 'parkdaegun@gmail.com'];

export function AdminEntry() {
  const userId = useAuthStore((state) => state.user?.id);
  const [authorizedId, setAuthorizedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setAuthorizedId(null);
      return;
    }

    const check = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email?.toLowerCase();
      if (email && ADMIN_EMAILS.includes(email)) {
        if (!cancelled) setAuthorizedId(userId);
        return;
      }

      const { data, error } = await supabase.rpc('admin_is_authorized');
      if (!cancelled) setAuthorizedId(!error && data === true ? userId : null);
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || authorizedId !== userId) return null;

  return (
    <Link
      href="/admin"
      className="flex items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-purple-50/80 p-5 transition-all hover:bg-purple-100 shadow-xs"
    >
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl text-purple-700">
          admin_panel_settings
        </span>
        <span>
          <span className="block font-bold text-purple-900">관리자 콘솔 바로가기</span>
          <span className="mt-0.5 block text-xs text-purple-700">
            선생님 심사·수업 관리·네비게이션 메뉴 및 운영 현황
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="material-symbols-outlined text-purple-700">
        chevron_right
      </span>
    </Link>
  );
}
