"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import {
  getEnrollmentDetail,
  type EnrollmentDetail,
} from "@/lib/queries/bookings";
import {
  listBookingRequests,
  requestBookingAction,
  type BookingRequest,
} from "@/lib/queries/launch";
import { formatLessonTime, DEFAULT_TIME_ZONE } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { CalendarDownload } from '@/components/features/CalendarDownload';
import { LessonFeedback } from '@/components/features/LessonFeedback';
import { RescheduleChoices } from '@/components/features/RescheduleChoices';

const statuses: Record<string, string> = {
  pending_payment: "결제 대기",
  confirmed: "예약 확정",
  completed: "수업 완료",
  cancelled: "취소",
  no_show: "결석",
};
const requestStatuses: Record<string, string> = {
  requested: "접수",
  processing: "처리 중",
  resolved: "처리 완료",
  rejected: "반려",
};
const kinds: Record<string, string> = {
  cancel: "취소 요청",
  reschedule: "일정 변경 요청",
  dispute: "수업 문제 접수",
};
export default function Page() {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [booking, setBooking] = useState<EnrollmentDetail | null>(null);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState("cancel");
  const [desiredStart, setDesiredStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [zone, setZone] = useState(DEFAULT_TIME_ZONE);
  useEffect(() => {
    try {
      setZone(localStorage.getItem("gossaem-timezone") || DEFAULT_TIME_ZONE);
    } catch {}
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      getEnrollmentDetail(params.id),
      listBookingRequests(params.id),
    ])
      .then(([detail, history]) => {
        if (active) {
          setBooking(detail);
          setRequests(history);
          if (!detail) setError("예약을 찾을 수 없습니다.");
        }
      })
      .catch(() => {
        if (active) setError("예약을 불러오지 못했습니다. 다시 시도해주세요.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id, user, refresh]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const requestReason = kind === 'reschedule' && desiredStart ? `${reason}\n희망 일정: ${formatLessonTime(desiredStart)} (${desiredStart})` : reason;
      if (requestReason.length > 2000) throw new Error('희망 일정을 포함해 사유를 2,000자 이내로 입력해주세요.');
      await requestBookingAction(params.id, kind, requestReason);
      setReason("");
      setMessage("요청이 접수되었습니다. 아래 처리 내역을 확인해주세요.");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage title="예약 상세" description={`예약 번호 ${params.id}`}>
      {loading && <p role="status">예약을 불러오는 중...</p>}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {booking && (
        <>
          <section className="grid gap-6 rounded-xl border border-outline-variant/30 bg-surface p-6 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-bold">{booking.sessionTitle}</h2>
              <p className="mt-2">
                {booking.teacherName} 쌤 ·{" "}
                {statuses[booking.status] || booking.status}
              </p>
              <p className="mt-4 font-semibold">
                {formatLessonTime(booking.scheduledAt, zone)}
              </p>
              {zone !== DEFAULT_TIME_ZONE && (
                <p className="mt-2 text-sm">
                  한국 시간: {formatLessonTime(booking.scheduledAt)}
                </p>
              )}
              <p className="mt-2">
                {booking.durationMinutes}분 · 예약 금액{" "}
                {booking.price.toLocaleString()} {booking.currency}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {booking.status === "pending_payment" && (
                <Link
                  className={actionClass}
                  href={`/student/payment?enrollment=${booking.id}`}
                >
                  결제·예약 확정
                </Link>
              )}
              {["confirmed", "completed", "no_show"].includes(
                booking.status,
              ) && (
                <Link
                  className={actionClass}
                  href={`/sessions/${booking.sessionId}`}
                >
                  수업 대기실
                </Link>
              )}
              <Link
                className="inline-flex min-h-11 items-center text-primary"
                href={`/teachers/${booking.teacherId}`}
              >
                쌤 정보
              </Link>
              <Link
                className="inline-flex min-h-11 items-center text-primary"
                href="/student/payment-history"
              >
                결제·환불 내역
              </Link>
              {booking.status === "completed" && (
                <Link
                  className="inline-flex min-h-11 items-center text-primary"
                  href={`/student/reviews?session=${booking.sessionId}`}
                >
                  수업 후기 작성
                </Link>
              )}
            </div>
          </section>
          {booking.status === 'confirmed' && <CalendarDownload id={booking.id} title={booking.sessionTitle} start={booking.scheduledAt} minutes={booking.durationMinutes} />}
          {booking.status === 'completed' && <><Link href={`/teachers/${booking.teacherId}`} className="inline-flex min-h-11 items-center text-primary">같은 쌤 수업 다시 예약 →</Link><LessonFeedback enrollmentId={booking.id} /></>}
          <form onSubmit={submit} className="max-w-2xl space-y-4">
            <h2 className="text-xl font-bold">취소·변경·수업 문제</h2>
            <p className="text-on-surface-variant">
              결제 전 취소 외에는 요청 접수 후 확인을 거쳐 처리됩니다. 확인
              전까지 기존 예약이 유지됩니다. 카드 번호나 비밀번호를 입력하지
              마세요.
            </p>
            <label className="block font-semibold">
              요청 종류
              <select
                className={fieldClass}
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {Object.entries(kinds).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'reschedule' && booking.teacherLessonId && <RescheduleChoices lessonId={booking.teacherLessonId} value={desiredStart} onChange={setDesiredStart} />}
            <label className="block font-semibold">
              사유·희망 일정
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                className={fieldClass}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              disabled={busy || reason.trim().length < 10}
              className={actionClass}
            >
              {busy ? "접수 중..." : "요청 접수"}
            </button>
            {message && (
              <p role="status" className="text-primary">
                {message}
              </p>
            )}
          </form>
          <section className="space-y-3">
            <h2 className="text-xl font-bold">처리 내역</h2>
            {requests.length === 0 && (
              <p className="text-on-surface-variant">접수한 요청이 없습니다.</p>
            )}
            {requests.map((request) => (
              <article
                className="rounded-xl border border-outline-variant/30 p-5"
                key={request.id}
              >
                <p className="font-semibold">
                  {kinds[request.kind]} · {requestStatuses[request.status]}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {request.reason}
                </p>
                {request.response && (
                  <p className="mt-3 whitespace-pre-wrap text-primary">
                    운영자 답변: {request.response}
                  </p>
                )}
              </article>
            ))}
          </section>
        </>
      )}
      <Link
        className="inline-flex min-h-11 items-center text-primary"
        href="/student/bookings"
      >
        예약 목록으로
      </Link>
    </ServicePage>
  );
}
