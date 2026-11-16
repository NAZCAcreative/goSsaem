"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { DEFAULT_TIME_ZONE, validTimeZone } from "@/lib/time";
import { serviceConfig } from "@/lib/service-config";

export default function Page() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [zone, setZone] = useState(DEFAULT_TIME_ZONE);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [closures, setClosures] = useState<
    { id: string; status: string; response: string | null }[]
  >([]);
  const [refresh, setRefresh] = useState(0);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      createClient()
        .from("account_preferences")
        .select("time_zone")
        .eq("user_id", user.id)
        .maybeSingle(),
      createClient()
        .from("account_closure_requests")
        .select("id,status,response")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ])
      .then(([preferences, requests]) => {
        if (!active) return;
        if (preferences.error || requests.error) {
          setError("계정 설정을 불러오지 못했습니다. 다시 시도해주세요.");
          return;
        }
        if (preferences.data) {
          setZone(preferences.data.time_zone);
          try {
            localStorage.setItem(
              "gossaem-timezone",
              preferences.data.time_zone,
            );
          } catch {}
        }
        setClosures(requests.data ?? []);
      })
      .catch(() => {
        if (active) setError("계정 정보를 불러오지 못했습니다.");
      });
    return () => {
      active = false;
    };
  }, [user, refresh]);
  const run = async (task: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
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
      title="계정·보안 설정"
      description="계정 복구, 시간대와 개인정보 요청을 관리하세요."
    >
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
      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-xl font-bold">로그인·보안</h2>
          <Link
            className="inline-flex min-h-11 items-center text-primary"
            href="/forgot-password"
          >
            비밀번호 재설정 메일 받기
          </Link>
          <Link
            className="flex min-h-11 items-center text-primary"
            href="/account/security"
          >
            2단계 인증 설정·확인
          </Link>
          <p className="text-sm text-on-surface-variant">
            Google 등 외부 계정의 비밀번호는 해당 서비스에서 변경해주세요.
          </p>
          <button
            disabled={busy}
            className={actionClass}
            onClick={() =>
              void run(async () => {
                const result = await createClient().auth.signOut({
                  scope: "global",
                });
                if (result.error)
                  throw new Error("전체 로그아웃에 실패했습니다.");
                await logout();
                window.location.assign("/login");
              }, "전체 기기에서 로그아웃했습니다.")
            }
          >
            모든 기기에서 로그아웃
          </button>
        </section>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              if (!validTimeZone(zone))
                throw new Error("올바른 IANA 시간대를 입력해주세요.");
              const { error } = await createClient().rpc(
                "save_account_preferences",
                { p_time_zone: zone },
              );
              if (error) throw new Error("시간대를 저장하지 못했습니다.");
              try {
                localStorage.setItem("gossaem-timezone", zone);
              } catch {}
            }, "시간대가 저장되었습니다.");
          }}
        >
          <h2 className="text-xl font-bold">표시 시간대</h2>
          <label className="block font-semibold">
            시간대
            <input
              required
              list="timezones"
              className={fieldClass}
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            />
          </label>
          <datalist id="timezones">
            {[
              "Asia/Seoul",
              "Asia/Tokyo",
              "Asia/Shanghai",
              "Asia/Bangkok",
              "Europe/London",
              "Europe/Paris",
              "America/New_York",
              "America/Los_Angeles",
              "Australia/Sydney",
            ].map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <button
            type="button"
            className="min-h-11 text-primary"
            onClick={() =>
              setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
            }
          >
            기기 시간대 사용
          </button>
          <p className="text-sm text-on-surface-variant">
            예약 상세의 시간 표시에 적용됩니다. 검색·예약 시간표는 한국 시간
            기준입니다.
          </p>
          <button disabled={busy} className={actionClass}>
            저장
          </button>
        </form>
      </div>
      {serviceConfig.policiesPublished && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">서비스 정책 동의</h2>
          <p>
            <Link className="text-primary underline" href="/policies/terms">
              이용약관
            </Link>{" "}
            ·{" "}
            <Link className="text-primary underline" href="/policies/privacy">
              개인정보처리방침
            </Link>{" "}
            ·{" "}
            <Link className="text-primary underline" href="/policies/refunds">
              취소·환불 정책
            </Link>
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            정책을 확인하고 동의합니다.
          </label>
          <button
            disabled={busy || !consent}
            className={actionClass}
            onClick={() =>
              void run(async () => {
                const { error } = await createClient().rpc(
                  "accept_service_policies",
                  { p_version: serviceConfig.policyVersion },
                );
                if (error) throw new Error("동의를 저장하지 못했습니다.");
              }, "동의가 저장되었습니다.")
            }
          >
            동의 저장
          </button>
        </section>
      )}
      <section className="max-w-2xl space-y-4 border-t border-outline-variant/30 pt-6">
        <h2 className="text-xl font-bold">회원 탈퇴 요청</h2>
        <p className="leading-relaxed text-on-surface-variant">
          진행 중인 예약·환불·지급과 정보 보관 의무를 확인한 뒤 처리합니다. 요청
          접수만으로 계정이나 정보가 삭제되지는 않습니다. 처리 결과는 이 화면과
          고객센터에서 확인해주세요.
        </p>
        {closures.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-outline-variant/30 p-4"
          >
            <p>
              탈퇴 요청:{" "}
              {
                (
                  {
                    requested: "접수",
                    processing: "확인 중",
                    resolved: "처리 완료",
                    rejected: "반려",
                  } as Record<string, string>
                )[request.status]
              }
            </p>
            {request.response && (
              <p className="mt-2 whitespace-pre-wrap">{request.response}</p>
            )}
          </div>
        ))}
        {!closures.some((request) =>
          ["requested", "processing"].includes(request.status),
        ) && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const { error } = await createClient().rpc(
                  "request_account_closure",
                  { p_reason: reason },
                );
                if (error) throw new Error("탈퇴 요청을 접수하지 못했습니다.");
                setReason("");
                setRefresh((value) => value + 1);
              }, "탈퇴 요청이 접수되었습니다.");
            }}
          >
            <label className="block font-semibold">
              요청 내용
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                className={fieldClass}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              disabled={busy || reason.trim().length < 10}
              className="min-h-12 rounded-lg border border-error px-5 text-error disabled:opacity-50"
            >
              탈퇴 요청 접수
            </button>
          </form>
        )}
      </section>
    </ServicePage>
  );
}
