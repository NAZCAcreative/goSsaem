"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";

export function RecoveryForm({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(mode !== "reset");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (mode !== "reset") return;
    let active = true;
    const client = createClient();
    const subscription = client.auth.onAuthStateChange((event, session) => {
      if (active && session && event === "PASSWORD_RECOVERY") setReady(true);
    });
    void client.auth.getUser().then(({ data }) => {
      if (active) {
        setReady(Boolean(data.user));
        if (!data.user)
          setError(
            "재설정 링크가 만료되었거나 유효하지 않습니다. 새 링크를 요청해주세요.",
          );
      }
    });
    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, [mode]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || cooldown || !ready) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = createClient();
      if (mode === "reset") {
        if (password.length < 12 || password !== confirmation)
          throw new Error(
            "비밀번호를 12자 이상 입력하고 확인 값과 일치하는지 확인해주세요.",
          );
        const result = await client.auth.updateUser({ password });
        if (result.error)
          throw new Error(
            "비밀번호를 변경하지 못했습니다. 링크 만료 또는 최근 인증이 필요한지 확인해주세요.",
          );
        await client.auth.signOut({ scope: "global" });
        setReady(false);
        setPassword("");
        setConfirmation("");
        setMessage(
          "비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.",
        );
      } else {
        const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(mode === "forgot" ? "/reset-password" : "/account")}`;
        const result =
          mode === "forgot"
            ? await client.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: callback,
              })
            : await client.auth.resend({
                type: "signup",
                email: email.trim(),
                options: { emailRedirectTo: callback },
              });
        if (result.error)
          throw new Error(
            "메일을 요청하지 못했습니다. 잠시 후 다시 시도해주세요.",
          );
        setCooldown(60);
        setMessage(
          "입력하신 주소로 안내가 발송될 수 있습니다. 메일함과 스팸함을 확인해주세요.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title={
        mode === "forgot"
          ? "비밀번호 찾기"
          : mode === "verify"
            ? "인증 메일 다시 받기"
            : "새 비밀번호 설정"
      }
      description="계정에 사용하는 이메일을 확인해주세요."
    >
      <form onSubmit={submit} className="max-w-xl space-y-5">
        {mode !== "reset" ? (
          <label className="block font-semibold">
            이메일
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              className={fieldClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label className="block font-semibold">
              새 비밀번호
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className={fieldClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block font-semibold">
              새 비밀번호 확인
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className={fieldClass}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <p className="text-sm text-on-surface-variant">
              다른 서비스에서 사용하지 않는 12자 이상의 비밀번호를 사용해주세요.
            </p>
          </>
        )}
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
        <button
          disabled={busy || !ready || cooldown > 0}
          className={actionClass}
        >
          {busy
            ? "처리 중..."
            : cooldown
              ? `${cooldown}초 후 재요청`
              : mode === "reset"
                ? "비밀번호 변경"
                : "메일 요청"}
        </button>
        <div className="flex flex-wrap gap-5 text-primary">
          <Link className="inline-flex min-h-11 items-center" href="/login">
            로그인
          </Link>
          <Link
            className="inline-flex min-h-11 items-center"
            href="/forgot-password"
          >
            새 재설정 링크 요청
          </Link>
        </div>
      </form>
    </ServicePage>
  );
}
