"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
import { formatLessonTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
type Detail = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  verified: boolean;
  createdAt: string;
  enrollmentId: string | null;
  title: string | null;
  receiptUrl: string | null;
  orderStatus: string | null;
};
export default function Page() {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    void createClient()
      .rpc("my_payment_detail", { p_payment: params.id })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("결제 내역을 확인하지 못했습니다.");
        else setDetail(data as unknown as Detail);
      });
    return () => {
      active = false;
    };
  }, [params.id, user]);
  return (
    <ServicePage title="결제·환불 상세">
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {detail && (
        <>
          <section className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface p-6">
            <h2 className="text-xl font-bold">{detail.title || "수업 결제"}</h2>
            <p className="text-xl font-semibold">
              {detail.amount.toLocaleString()} {detail.currency}
            </p>
            <p>
              {detail.verified
                ? (
                    {
                      pending: "처리 중",
                      succeeded: "결제 완료",
                      refunded: "환불 완료",
                      cancelled: "결제 취소",
                    } as Record<string, string>
                  )[detail.status]
                : "미검증된 기존 기록"}
            </p>
            {detail.orderStatus &&
              ["refund_pending", "needs_review"].includes(
                detail.orderStatus,
              ) && (
                <p className="text-error">
                  {detail.orderStatus === "refund_pending"
                    ? "환불 결과를 확인 중입니다."
                    : "결제사 결과와 정산 내역을 확인 중입니다. 고객센터로 문의해주세요."}
                </p>
              )}
            <p className="text-sm text-on-surface-variant">
              {formatLessonTime(detail.createdAt)}
            </p>
            <p className="break-all text-sm">결제 번호 {detail.id}</p>
          </section>
          <div className="flex flex-wrap gap-4">
            {detail.receiptUrl?.startsWith("https://") && (
              <a
                className={actionClass}
                target="_blank"
                rel="noopener noreferrer"
                href={detail.receiptUrl}
              >
                결제사 영수증 ↗
              </a>
            )}
            {detail.enrollmentId && (
              <Link
                className="inline-flex min-h-12 items-center text-primary"
                href={`/student/bookings/${detail.enrollmentId}`}
              >
                예약 상세·문의
              </Link>
            )}
          </div>
        </>
      )}
      <Link
        className="inline-flex min-h-11 items-center text-primary"
        href="/student/payment-history"
      >
        결제 목록으로
      </Link>
    </ServicePage>
  );
}
