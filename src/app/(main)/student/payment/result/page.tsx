"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
import { PageLoading } from "@/components/shared/PageLoading";
function Result() {
  const params = useSearchParams();
  const [message, setMessage] = useState("결제 결과를 확인하고 있습니다.");
  const [booking, setBooking] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const key = params.get("paymentKey"),
    order = params.get("orderId"),
    amount = Number(params.get("amount"));
  const failed = params.get("failed") === "1";
  useEffect(() => {
    if (failed) {
      setMessage(
        "결제가 완료되지 않았습니다. 예약과 결제 내역을 확인한 뒤 다시 진행해주세요.",
      );
      return;
    }
    if (!key || !order || !Number.isSafeInteger(amount) || amount <= 0) {
      setError("유효한 결제 결과가 없습니다. 결제 내역을 확인해주세요.");
      return;
    }
    let active = true;
    setBusy(true);
    setError("");
    void fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey: key, orderId: order, amount }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "결제 상태를 확인하지 못했습니다.");
        if (active) {
          setBooking(result.enrollmentId || "");
          setMessage(
            result.status === "paid"
              ? "결제가 완료되어 예약이 확정되었습니다."
              : result.status === "refunded"
                ? "예약을 확정할 수 없어 결제가 취소되었습니다."
                : "결제 결과를 확인 중입니다. 추가 결제하지 말고 결제 내역 또는 고객센터에서 확인해주세요.",
          );
        }
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [key, order, amount, failed, retry]);
  return (
    <ServicePage title="결제 결과">
      <p role="status">{message}</p>
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {error && key && order && (
          <button
            disabled={busy}
            className={actionClass}
            onClick={() => setRetry((value) => value + 1)}
          >
            {busy ? "확인 중..." : "결제 상태 다시 확인"}
          </button>
        )}
        {booking && (
          <Link className={actionClass} href={`/student/bookings/${booking}`}>
            예약 상세
          </Link>
        )}
        <Link
          className="inline-flex min-h-12 items-center text-primary"
          href="/student/payment-history"
        >
          결제 내역
        </Link>
        <Link
          className="inline-flex min-h-12 items-center text-primary"
          href="/student/bookings"
        >
          내 예약
        </Link>
      </div>
    </ServicePage>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Result />
    </Suspense>
  );
}
