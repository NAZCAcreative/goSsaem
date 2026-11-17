import Link from "next/link";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
export const metadata = { title: "선생님 참여 안내 | GoSsaem" };
export default function Page() {
  return (
    <ServicePage
      title="한국어 선생님으로 참여하세요"
      description="본인의 강점과 수업 방식을 구체적으로 소개해주세요."
    >
      <ol className="space-y-4">
        <li>
          1. 선생님 계정으로 가입하고 실제 이름·소개·경력·전문 분야를
          작성합니다.
        </li>
        <li>2. 운영자의 심사를 받고, 보완 요청이 있다면 내용을 수정합니다.</li>
        <li>3. 수업 상품과 가능한 일정을 등록합니다.</li>
        <li>4. 예약된 수업의 회의 링크를 등록하고 출석을 기록합니다.</li>
      </ol>
      <p className="leading-relaxed text-on-surface-variant">
        타인의 사진이나 확인되지 않은 경력을 사용하지 마세요. 수수료·지급 조건은
        선생님 정책과 운영자 안내를 확인한 뒤 참여를 결정해주세요.
      </p>
      <Link className={actionClass} href="/signup/teacher">
        선생님 가입
      </Link>
    </ServicePage>
  );
}
