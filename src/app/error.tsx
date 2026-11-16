"use client";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ServicePage
      title="잠시 문제가 발생했습니다"
      description="진행하던 결제나 예약은 내역을 먼저 확인해주세요."
    >
      <button className={actionClass} onClick={reset}>
        다시 시도
      </button>
    </ServicePage>
  );
}
