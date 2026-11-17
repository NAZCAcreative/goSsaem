"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function ChatSafetyActions({ userId }: { userId: string }) {
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void createClient()
      .rpc("my_chat_block", { p_user: userId })
      .then(({ data, error }) => {
        if (active) {
          if (error) setError("차단 설정을 확인하지 못했습니다.");
          else {
            setBlocked(data === true);
            setReady(true);
          }
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);
  const toggle = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("set_chat_block", {
      p_user: userId,
      p_block: !blocked,
    });
    if (error) setError("차단 설정을 변경하지 못했습니다.");
    else setBlocked((value) => !value);
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 px-container-margin py-2 text-sm">
      <button
        disabled={!ready || busy}
        className="min-h-11 text-error disabled:opacity-50"
        onClick={() => void toggle()}
      >
        {blocked ? "대화 차단 해제" : "대화 차단"}
      </button>
      <Link
        className="inline-flex min-h-11 items-center text-primary"
        href="/support"
      >
        신고·문의
      </Link>
      {blocked && (
        <span role="status">
          차단한 상대와는 메시지를 주고받을 수 없습니다.
        </span>
      )}
      {error && (
        <span role="alert" className="text-error">
          {error}
        </span>
      )}
    </div>
  );
}
