import { ServicePage } from "@/components/shared/ServicePage";
import { serviceConfig } from "@/lib/service-config";
export const metadata = { title: "자주 묻는 질문 | GoSsaem" };
export default function Page() {
  return (
    <ServicePage title="자주 묻는 질문">
      {[
        [
          "인증 메일이 오지 않아요.",
          "스팸함과 입력한 이메일을 확인하고 로그인 화면의 인증 메일 재발송을 이용하세요.",
        ],
        [
          "수업 시간은 어떤 기준인가요?",
          "검색·예약 시간표는 한국 시간 기준입니다. 예약 상세에서는 계정에 저장한 시간대로도 확인할 수 있습니다.",
        ],
        [
          "예약 대기와 예약 확정은 다른가요?",
          "예약 대기는 좌석을 잠시 확보한 상태입니다. 결제 또는 무료 예약 확정 후 내 예약에서 확정 상태를 확인해주세요.",
        ],
        [
          "수업방이 열리지 않아요.",
          "확정된 예약인지, 입장 가능한 시간인지 확인하세요. 선생님의 링크가 아직 등록되지 않았다면 채팅 또는 고객센터로 문의해주세요.",
        ],
        [
          "일정을 바꾸거나 취소하고 싶어요.",
          "예약 상세에서 사유를 작성해 요청하세요. 결제 전 예약 취소는 즉시 반영되며, 확정된 예약의 변경·취소는 확인 후 처리됩니다.",
        ],
        [
          "수업에 문제가 있었어요.",
          "예약 상세의 수업 문제 접수 또는 고객센터를 이용하세요. 예약 번호와 발생 시간을 알려주시면 확인에 도움이 됩니다.",
        ],
      ].map(([q, a]) => (
        <details
          key={q}
          className="rounded-xl border border-outline-variant/30 bg-surface p-5"
        >
          <summary className="min-h-11 cursor-pointer font-semibold">
            {q}
          </summary>
          <p className="mt-3 leading-relaxed text-on-surface-variant">{a}</p>
        </details>
      ))}
      {serviceConfig.supportEmail && (
        <p>
          로그인이 어려운 경우{" "}
          <a
            className="text-primary underline"
            href={`mailto:${serviceConfig.supportEmail}`}
          >
            {serviceConfig.supportEmail}
          </a>
          로 문의해주세요.
        </p>
      )}
    </ServicePage>
  );
}
