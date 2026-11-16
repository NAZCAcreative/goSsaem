"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { actionClass, fieldClass } from "@/components/shared/ServicePage";
export function RestrictionForm() {
  const [user, setUser] = useState("");
  const [active, setActive] = useState(true);
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await createClient().rpc("admin_set_restriction", {
        p_user: user,
        p_active: active,
        p_until: until ? new Date(`${until}:00+09:00`).toISOString() : null,
        p_reason: reason,
      });
      if (error) throw new Error("회원 ID·기간·관리자 권한을 확인해주세요.");
      setMessage("이용 제한 상태와 처리 이력이 저장되었습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">회원 이용 제한·해제</h2>
      <form className="max-w-xl space-y-4" onSubmit={submit}>
        <label className="block">
          회원 ID
          <input
            required
            className={fieldClass}
            value={user}
            onChange={(event) => setUser(event.target.value)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          신규 예약·판매·채팅 등 활동 제한
        </label>
        <label className="block">
          제한 종료 일시 (한국 시간, 비워두면 별도 해제까지)
          <input
            type="datetime-local"
            className={fieldClass}
            value={until}
            onChange={(event) => setUntil(event.target.value)}
          />
        </label>
        <label className="block">
          회원에게 안내할 사유
          <textarea
            required
            minLength={3}
            maxLength={2000}
            className={fieldClass}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <p className="text-sm text-on-surface-variant">
          기존 예약·환불·지급은 별도로 정리해야 합니다. 제한된 회원도 고객센터에
          이의를 신청할 수 있습니다.
        </p>
        <button disabled={busy} className={actionClass}>
          이용 상태 저장
        </button>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-primary">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
