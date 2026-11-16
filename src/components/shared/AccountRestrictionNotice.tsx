"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
export function AccountRestrictionNotice() {
  const user = useAuthStore((state) => state.user);
  const [notice, setNotice] = useState<{
    reason: string;
    until: string | null;
  } | null>(null);
  useEffect(() => {
    if (!user) {
      setNotice(null);
      return;
    }
    let active = true;
    void createClient()
      .rpc("my_account_restriction")
      .then(({ data, error }) => {
        if (active && !error)
          setNotice(data as { reason: string; until: string | null } | null);
      });
    return () => {
      active = false;
    };
  }, [user]);
  if (!notice) return null;
  return (
    <aside
      role="status"
      className="border-b border-error/20 bg-error-container/20 px-container-margin py-4 text-sm"
    >
      <p className="font-semibold">
        현재 계정의 일부 이용이 제한되어 있습니다.
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words">{notice.reason}</p>
      <Link
        className="inline-flex min-h-11 items-center text-primary underline"
        href="/support"
      >
        문의·이의 신청
      </Link>
    </aside>
  );
}
