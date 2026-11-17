"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
export default function Page() {
  const [factor, setFactor] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    let active = true;
    void createClient()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError("인증 설정을 불러오지 못했습니다.");
          return;
        }
        const existing = data.totp.find((value) => value.status === "verified");
        if (existing) {
          setFactor(existing.id);
          setVerified(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const enroll = async () => {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await createClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `GoSsaem ${new Date().toISOString()}`,
      });
      if (error)
        throw new Error(
          "인증기를 등록하지 못했습니다. 기존 미완료 등록이 있는지 확인해주세요.",
        );
      setFactor(data.id);
      setQr(data.totp.qr_code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (error) throw new Error("인증 코드를 확인해주세요.");
      setVerified(true);
      setQr("");
      setCode("");
      setMessage(
        "2단계 인증이 완료되었습니다. 관리자 거래 처리를 진행할 수 있습니다.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title="2단계 인증"
      description="환불·지급 등 관리자 금융 처리에는 인증기 확인이 필요합니다."
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
      {!factor ? (
        <button
          disabled={busy}
          className={actionClass}
          onClick={() => void enroll()}
        >
          인증기 등록
        </button>
      ) : (
        <form className="max-w-lg space-y-4" onSubmit={verify}>
          {qr && (
            <>
              <p>
                인증기 앱으로 QR 코드를 스캔해주세요. 이 화면을 다른 사람에게
                공유하지 마세요.
              </p>
              <Image
                unoptimized
                width={240}
                height={240}
                alt="인증기 등록 QR 코드"
                src={qr.startsWith('data:image/svg+xml') ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`}
              />
            </>
          )}
          <label className="block font-semibold">
            {verified ? "인증기 코드 확인" : "인증기 등록 확인"}
            <input
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className={fieldClass}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button disabled={busy} className={actionClass}>
            {busy ? "확인 중..." : "6자리 코드 확인"}
          </button>
        </form>
      )}
    </ServicePage>
  );
}
