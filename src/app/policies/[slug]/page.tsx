import { notFound } from "next/navigation";
import { ServicePage } from "@/components/shared/ServicePage";
import { serviceConfig } from "@/lib/service-config";

const documents: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  terms: {
    title: "이용약관",
    sections: [
      [
        "서비스 범위",
        "GoSsaem은 한국어 선생님 검색, 수업 예약과 참여, 회원 간 소통 기능을 제공합니다. 상품별 수업 조건은 예약 전에 확인해야 합니다.",
      ],
      [
        "회원의 책임",
        "정확한 계정 정보를 사용하고 다른 회원의 계정·자료·수업 링크를 무단 사용하거나 공유하지 않아야 합니다.",
      ],
      [
        "거래와 문제 처리",
        "예약 확정 여부는 내 예약에서 확인합니다. 취소·변경·환불과 수업 분쟁은 해당 정책과 고객센터를 통해 처리합니다.",
      ],
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    sections: [
      [
        "처리하는 정보",
        "가입·인증 정보, 이름·프로필, 수업·예약·결제 기록, 채팅·문의 내용 등 서비스 제공에 필요한 정보를 처리합니다.",
      ],
      [
        "접근과 보호",
        "수업·예약·문의 정보는 업무상 필요한 회원과 운영자에게 제한합니다. 결제 카드 정보는 결제사에서 처리하며 서비스가 카드 번호를 직접 입력받아 저장하지 않습니다.",
      ],
      [
        "권리 행사",
        "계정 화면에서 정보 수정과 탈퇴 요청을 할 수 있습니다. 거래·분쟁 등 보관 의무가 있는 정보는 삭제 대상과 구분해 처리합니다.",
      ],
    ],
  },
  refunds: {
    title: "취소·환불 안내",
    sections: [
      [
        "결제 전 예약",
        "결제 대기 예약은 예약 상세에서 취소할 수 있습니다. 대기 시간이 만료되면 좌석이 해제됩니다.",
      ],
      [
        "확정된 예약",
        "예약 상세에서 취소·일정 변경을 요청해주세요. 요청 접수만으로 취소나 환불이 확정되지는 않으며, 처리 결과를 확인해야 합니다.",
      ],
      [
        "수업 문제",
        "선생님 취소·미참여·접속 장애 등 문제가 발생하면 예약 번호와 발생 상황을 접수해주세요. 환불 금액과 처리 기준은 정식 정책 확정 후 안내합니다.",
      ],
    ],
  },
  teachers: {
    title: "선생님 운영·정산 안내",
    sections: [
      [
        "프로필과 수업",
        "실제 본인의 정보와 제공 가능한 수업을 등록하고, 수업 자료 사용 권한을 확보해야 합니다.",
      ],
      [
        "출석과 수업 완료",
        "수업 회차별 출석을 기록합니다. 결석은 정정할 수 있으며, 수업 종료와 기록을 기준으로 완료 상태가 반영됩니다.",
      ],
      [
        "정산과 지급",
        "정산 적립은 실제 은행 송금 완료와 다릅니다. 수수료·지급 주기·환불 차감 기준은 별도 확정된 계약과 안내를 따릅니다.",
      ],
    ],
  },
  community: {
    title: "커뮤니티·신고 안내",
    sections: [
      [
        "금지 행위",
        "사칭, 허위 경력·후기, 괴롭힘, 차별·위협, 불법 자료 공유, 결제·쿠폰 악용을 금지합니다.",
      ],
      [
        "신고",
        "고객센터에서 대상과 발생 시간·내용을 구체적으로 접수해주세요. 개인정보나 민감한 자료는 필요한 범위에서만 제출해주세요.",
      ],
      [
        "처리",
        "운영자는 신고 사실을 확인하고 필요한 이용 제한과 후속 조치를 안내합니다. 처리 결과에 대한 문의도 고객센터에서 접수할 수 있습니다.",
      ],
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(documents).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await paramsPromise;
  return {
    title: `${documents[params.slug]?.title || "정책"} | GoSsaem`,
    robots: { index: serviceConfig.policiesPublished },
  };
}
export default async function Page({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await paramsPromise;
  const doc = documents[params.slug];
  if (!doc) notFound();
  return (
    <ServicePage
      title={doc.title}
      description={`문서 버전 ${serviceConfig.policyVersion}`}
    >
      {!serviceConfig.policiesPublished && (
        <p
          role="status"
          className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5"
        >
          정식 정책 확정 전의 안내입니다. 사업자 정보·세부 조건을 확정한 후 정식
          문서가 공개됩니다. 현재 유료 서비스 개시 전입니다.
        </p>
      )}
      {doc.sections.map(([title, body]) => (
        <section key={title}>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-3 leading-8 text-on-surface-variant">{body}</p>
        </section>
      ))}
    </ServicePage>
  );
}
