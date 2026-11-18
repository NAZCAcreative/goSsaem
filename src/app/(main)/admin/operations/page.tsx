"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import { createClient } from "@/lib/supabase/client";
import { RestrictionForm } from "@/components/features/admin/RestrictionForm";
import { RuntimeHealth } from "@/components/features/admin/RuntimeHealth";
type RequestRow = {
  kind?: string;
  id: string;
  name: string;
  reason: string;
  status: string;
  response: string | null;
  enrollment_id?: string;
};
type Payout = {
  id: string;
  name: string;
  amount: number;
  status: string;
  payout_reference: string | null;
};
type Order = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  enrollment_id: string;
};
type Operations = {
  bookings: RequestRow[];
  closures: RequestRow[];
  withdrawals: Payout[];
};
type Payments = {
  orders: Order[];
  mailPending: number;
  mailFailed: number;
  paymentReview: number;
  demoTeachers: number;
};
const statuses: Record<string, string> = {
  requested: "접수",
  processing: "처리 중",
  resolved: "처리 완료",
  rejected: "반려",
  completed: "지급 완료",
  prepared: "결제 대기",
  confirming: "승인 확인 중",
  paid: "결제 완료",
  refund_pending: "환불 처리 중",
  refunded: "환불 완료",
  needs_review: "대사 필요",
  expired: "만료",
};
export default function Page() {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [payments, setPayments] = useState<Payments | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      createClient().rpc("admin_operations", { p_page: page }),
      createClient().rpc("admin_checkout_orders", { p_page: page }),
    ])
      .then(([a, b]) => {
        if (!active) return;
        if (a.error || b.error) throw new Error();
        setOperations(a.data as unknown as Operations);
        setPayments(b.data as unknown as Payments);
      })
      .catch(() => {
        if (active)
          setError(
            "운영 내역을 불러오지 못했습니다. 권한과 배포 상태를 확인해주세요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, refresh]);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage("처리 결과가 저장되었습니다.");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title="거래·운영 처리"
      description="금융 처리는 실제 결제·은행 결과를 확인한 뒤 기록하세요. 환불·지급에는 2단계 인증이 필요합니다."
    >
      <div className="flex flex-wrap gap-5 text-primary">
        <Link className="inline-flex min-h-11 items-center" href="/admin">
          관리자 현황
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href="/account/security"
        >
          2단계 인증 확인
        </Link>
        <button
          disabled={busy}
          onClick={() => setRefresh((value) => value + 1)}
        >
          새로고침
        </button>
      </div>
      {loading && <p role="status">운영 내역을 불러오는 중...</p>}
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
      <RuntimeHealth />
      {payments && (
        <p className="rounded-xl bg-surface-container-low p-5">
          결제 대사 필요 {payments.paymentReview}건 · 메일 대기{" "}
          {payments.mailPending}건 · 발송 중단 {payments.mailFailed}건 · 데모
          쌤 {payments.demoTeachers}명
        </p>
      )}
      {operations &&
        (["bookings", "closures"] as const).map((type) => (
          <section className="space-y-4" key={type}>
            <h2 className="text-xl font-bold">
              {type === "bookings" ? "예약·분쟁 요청" : "탈퇴 요청"}
            </h2>
            {operations[type].length === 0 && <p>접수 내역이 없습니다.</p>}
            {operations[type].map((row) => (
              <RequestCard
                key={row.id}
                row={row}
                busy={busy}
                closure={type === "closures"}
                onSubmit={(status, response, start) =>
                  void run(async () => {
                    if (
                      status === "apply_cancel" ||
                      status === "apply_reschedule"
                    ) {
                      const { error } = await createClient().rpc(
                        "admin_resolve_booking",
                        {
                          p_request: row.id,
                          p_start: start || null,
                          p_response: response,
                        },
                      );
                      if (error)
                        throw new Error(
                          "예약 상태·금액·정원·가능 시간을 확인해주세요. 유료 취소는 환불 기능을 이용하세요.",
                        );
                      return;
                    }
                    const { error } = await createClient().rpc(
                      "admin_review_request",
                      {
                        p_id: row.id,
                        p_type: type === "bookings" ? "booking" : "closure",
                        p_status: status,
                        p_response: response,
                      },
                    );
                    if (error)
                      throw new Error("요청 처리 상태를 저장하지 못했습니다.");
                  })
                }
              />
            ))}
          </section>
        ))}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">유료 주문·전액 환불</h2>
        <p className="text-sm text-on-surface-variant">
          정산 적립 전 주문만 여기서 전액 환불합니다. 정산 후 환불·부분 환불은
          대사와 정산 조정이 필요합니다.
        </p>
        {payments?.orders.map((order) => (
          <article
            className="space-y-3 rounded-xl border border-outline-variant/30 p-5"
            key={order.id}
          >
            <p className="font-bold">
              {order.name} · {order.amount.toLocaleString()} {order.currency} ·{" "}
              {statuses[order.status] || order.status}
            </p>
            <p className="break-all text-sm">
              주문 {order.id}
              <br />
              예약 {order.enrollment_id}
            </p>
            {["paid", "refund_pending"].includes(order.status) && (
              <ReasonForm
                busy={busy}
                label="전액 환불 실행"
                onSubmit={(reason) =>
                  void run(async () => {
                    const response = await fetch("/api/payments/refund", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orderId: order.id, reason }),
                    });
                    const result = await response.json();
                    if (!response.ok || result.status !== "refunded")
                      throw new Error(
                        result.error || "환불 결과 대사가 필요합니다.",
                      );
                  })
                }
              />
            )}
          </article>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">출금·실제 지급 기록</h2>
        {operations?.withdrawals.map((row) => (
          <PayoutCard
            key={row.id}
            row={row}
            busy={busy}
            onSubmit={(status, reference, reason) =>
              void run(async () => {
                const { error } = await createClient().rpc(
                  "admin_record_payout",
                  {
                    p_id: row.id,
                    p_status: status,
                    p_reference: reference,
                    p_reason: reason,
                  },
                );
                if (error)
                  throw new Error(
                    "2단계 인증·이전 상태·송금 증빙을 확인해주세요.",
                  );
              })
            }
          />
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">데모·실제 쌤 구분</h2>
        <p>
          실제 신원·상품·사진을 확인한 뒤 변경하세요. 실제 쌤으로 바꿔도
          심사 승인이 별도로 필요합니다.
        </p>
        <DemoForm
          busy={busy}
          onSubmit={(teacher, demo, reason) =>
            void run(async () => {
              const { error } = await createClient().rpc("admin_mark_demo", {
                p_teacher: teacher,
                p_is_demo: demo,
                p_reason: reason,
              });
              if (error) throw new Error("데모 구분을 저장하지 못했습니다.");
            })
          }
        />
      </section>
      <RestrictionForm />
      <div className="flex gap-5">
        <button
          className={actionClass}
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          이전
        </button>
        <span className="self-center">{page}페이지</span>
        <button
          className={actionClass}
          disabled={
            loading ||
            (![...(operations?.bookings || []), ...(operations?.closures || [])]
              .length &&
              !operations?.withdrawals.length &&
              !payments?.orders.length)
          }
          onClick={() => setPage((value) => value + 1)}
        >
          다음
        </button>
      </div>
    </ServicePage>
  );
}
function ReasonForm({
  busy,
  label,
  onSubmit,
}: {
  busy: boolean;
  label: string;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(reason);
      }}
    >
      <label className="min-w-0 flex-1">
        처리 사유
        <input
          required
          minLength={3}
          maxLength={200}
          className={fieldClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button disabled={busy} className={actionClass}>
        {label}
      </button>
    </form>
  );
}
function RequestCard({
  row,
  busy,
  closure,
  onSubmit,
}: {
  row: RequestRow;
  busy: boolean;
  closure: boolean;
  onSubmit: (status: string, response: string, start?: string) => void;
}) {
  const [status, setStatus] = useState("processing");
  const [response, setResponse] = useState("");
  const [start, setStart] = useState("");
  return (
    <article className="space-y-3 rounded-xl border border-outline-variant/30 p-5">
      <p className="font-bold">
        {row.name} · {statuses[row.status]}
      </p>
      {row.enrollment_id && (
        <p className="break-all text-sm">예약 {row.enrollment_id}</p>
      )}
      <p className="whitespace-pre-wrap break-words">{row.reason}</p>
      {row.response && (
        <p className="whitespace-pre-wrap text-primary">{row.response}</p>
      )}
      {["requested", "processing"].includes(row.status) && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(
              status,
              response,
              start ? new Date(`${start}:00+09:00`).toISOString() : undefined,
            );
          }}
        >
          <label className="block">
            처리 상태
            <select
              className={fieldClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="processing">처리 중</option>
              {row.kind === "cancel" && (
                <option value="apply_cancel">무료 확정 예약 취소 실행</option>
              )}
              {row.kind === "reschedule" && (
                <option value="apply_reschedule">일정 변경 실행</option>
              )}
              {!closure && <option value="resolved">처리 완료</option>}
              <option value="rejected">반려</option>
            </select>
          </label>
          {status === "apply_reschedule" && (
            <label className="block">
              변경할 일시 (한국 시간)
              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
          )}
          <label className="block">
            회원에게 보낼 답변
            <textarea
              required
              minLength={3}
              maxLength={2000}
              className={fieldClass}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
            />
          </label>
          {closure && (
            <p className="text-sm text-on-surface-variant">
              실제 삭제는 보관 의무와 거래 정리 확인 후 별도 계정 삭제 절차로
              진행합니다.
            </p>
          )}
          <button disabled={busy} className={actionClass}>
            답변·처리 상태 저장
          </button>
        </form>
      )}
    </article>
  );
}
function PayoutCard({
  row,
  busy,
  onSubmit,
}: {
  row: Payout;
  busy: boolean;
  onSubmit: (status: string, reference: string, reason: string) => void;
}) {
  const [status, setStatus] = useState("processing");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  return (
    <article className="space-y-3 rounded-xl border border-outline-variant/30 p-5">
      <p className="font-bold">
        {row.name} · {row.amount.toLocaleString()} KRW · {statuses[row.status]}
      </p>
      {row.payout_reference && <p>은행 거래 증빙: {row.payout_reference}</p>}
      {["requested", "processing"].includes(row.status) && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(status, reference, reason);
          }}
        >
          <label className="block">
            상태
            <select
              className={fieldClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="processing">지급 처리 중</option>
              {row.status === "processing" && (
                <option value="completed">은행 송금 확인 완료</option>
              )}
              <option value="rejected">반려</option>
            </select>
          </label>
          <label className="block">
            은행 거래 증빙 번호
            <input
              required={status === "completed"}
              minLength={5}
              maxLength={200}
              className={fieldClass}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </label>
          <label className="block">
            처리 사유
            <input
              required
              minLength={3}
              maxLength={2000}
              className={fieldClass}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button disabled={busy} className={actionClass}>
            실제 처리 결과 기록
          </button>
        </form>
      )}
    </article>
  );
}
function DemoForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (teacher: string, demo: boolean, reason: string) => void;
}) {
  const [teacher, setTeacher] = useState("");
  const [demo, setDemo] = useState(true);
  const [reason, setReason] = useState("");
  return (
    <form
      className="max-w-xl space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(teacher, demo, reason);
      }}
    >
      <label className="block">
        쌤 ID
        <input
          required
          className={fieldClass}
          value={teacher}
          onChange={(event) => setTeacher(event.target.value)}
        />
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={demo}
          onChange={(event) => setDemo(event.target.checked)}
        />
        데모 계정으로 분류
      </label>
      <label className="block">
        확인 근거
        <input
          required
          minLength={3}
          maxLength={1000}
          className={fieldClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button disabled={busy} className={actionClass}>
        구분 저장
      </button>
    </form>
  );
}
