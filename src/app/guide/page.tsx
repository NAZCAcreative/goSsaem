import Link from "next/link";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
import { serviceConfig } from "@/lib/service-config";
export const metadata = {
  title: "이용 안내 | GoSsaem",
  description: "쌤 찾기부터 예약, 수업 참여와 고객지원까지 안내합니다.",
};
export default function Page() {
  return (
    <ServicePage
      title="쌤과 함께 시작하는 한국어"
      description="수업 상품과 시간을 확인하고, 예약 내역에서 수업에 참여하세요."
    >
      <ol className="grid gap-5 sm:grid-cols-2">
        {[
          [
            "1. 쌤 찾기",
            "목적·가격·가능 시간으로 검색하고 소개와 후기를 확인하세요. 검색 시간대는 한국 시간 기준입니다.",
          ],
          [
            "2. 상품과 시간 선택",
            "수업 유형·정원·금액·시간을 확인하세요. 결제 대기 좌석은 최대 15분 동안 유지됩니다.",
          ],
          [
            "3. 예약 확정",
            "무료 예약은 확인 후 확정됩니다. 유료 예약은 결제 완료와 예약 확정 상태를 모두 확인하세요.",
          ],
          [
            "4. 수업 참여",
            "내 예약의 상세 화면에서 입장하세요. 확정된 예약은 시작 10분 전부터 종료 30분 후까지 입장할 수 있습니다.",
          ],
        ].map(([title, body]) => (
          <li
            key={title}
            className="rounded-xl border border-outline-variant/30 bg-surface p-6"
          >
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-3 leading-relaxed text-on-surface-variant">
              {body}
            </p>
          </li>
        ))}
      </ol>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">수업 준비</h2>
        <p>
          안정적인 인터넷과 카메라·마이크를 준비해주세요. 쌤이 안내하는
          Google Meet·Zoom·Teams에서 수업을 진행하며, 링크를 다른 사람에게
          공유하지 마세요.
        </p>
        <p>
          취소·일정 변경·접속 문제는 예약 상세에서 요청할 수 있습니다. 요청
          접수만으로 일정 변경이나 환불이 확정되지는 않습니다.
        </p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href="/student/search" className={actionClass}>
          쌤 찾기
        </Link>
        <Link
          href="/faq"
          className="inline-flex min-h-12 items-center px-5 text-primary"
        >
          자주 묻는 질문
        </Link>
        <Link
          href="/teach"
          className="inline-flex min-h-12 items-center px-5 text-primary"
        >
          쌤으로 참여하기
        </Link>
      </div>
      <section className="border-t border-outline-variant/30 pt-5 text-sm leading-relaxed text-on-surface-variant">
        <h2 className="font-bold">운영 정보</h2>
        {serviceConfig.operator ? (
          <>
            <p>
              {serviceConfig.operator} · {serviceConfig.registration}
            </p>
            <p>{serviceConfig.address}</p>
          </>
        ) : (
          <p>정식 유료 서비스 개시 전입니다.</p>
        )}
        {serviceConfig.supportEmail && (
          <a
            className="inline-flex min-h-11 items-center text-primary"
            href={`mailto:${serviceConfig.supportEmail}`}
          >
            {serviceConfig.supportEmail}
          </a>
        )}
      </section>
    </ServicePage>
  );
}
