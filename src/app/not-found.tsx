import Link from "next/link";
import { ServicePage, actionClass } from "@/components/shared/ServicePage";
export default function NotFound() {
  return (
    <ServicePage
      title="페이지를 찾을 수 없습니다"
      description="주소가 변경되었거나 접근할 수 없는 페이지입니다."
    >
      <Link className={actionClass} href="/">
        홈으로
      </Link>
    </ServicePage>
  );
}
