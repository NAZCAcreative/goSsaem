export const ADMIN_SECTIONS = [
  { id: 'dashboard', label: '운영 현황', icon: 'dashboard', group: '개요' },
  { id: 'members', label: '회원 관리', icon: 'manage_accounts', group: '회원' },
  { id: 'students', label: '학생 관리', icon: 'groups', group: '회원' },
  { id: 'teachers', label: '선생님 관리', icon: 'school', group: '회원' },
  { id: 'teacher_pending', label: '승인 대기 선생님', icon: 'school', group: '회원' },
  { id: 'lessons', label: '수업 상품', icon: 'menu_book', group: '수업·예약' },
  { id: 'lesson_config', label: '수업 등록 관리', icon: 'tune', group: '수업·예약' },
  { id: 'sessions', label: '수업 일정', icon: 'event', group: '수업·예약' },
  { id: 'bookings', label: '예약 내역', icon: 'event_available', group: '수업·예약' },
  { id: 'payments', label: '결제 내역', icon: 'payments', group: '결제·정산' },
  { id: 'settlements', label: '정산 내역', icon: 'account_balance', group: '결제·정산' },
  { id: 'withdrawals', label: '출금 요청', icon: 'account_balance_wallet', group: '결제·정산' },
  { id: 'reviews', label: '리뷰 모니터링', icon: 'rate_review', group: '운영' },
  { id: 'coupons', label: '쿠폰 관리', icon: 'confirmation_number', group: '운영' },
  { id: 'tickets', label: '신고·문의', icon: 'rate_review', group: '운영' },
  { id: 'audit', label: '관리 변경 이력', icon: 'history', group: '운영' },
  { id: 'menus', label: '메뉴 관리', icon: 'menu', group: '운영' },
  { id: 'home', label: '메인 화면 관리', icon: 'campaign', group: '운영' },
] as const;

export const ADMIN_NAVIGATION = ADMIN_SECTIONS.filter((item) => item.id !== 'students' && item.id !== 'teachers');

export type AdminSection = typeof ADMIN_SECTIONS[number]['id'];
export type AdminRow = { id: string; [key: string]: unknown };
export type AdminList = { rows: AdminRow[]; total: number; page: number; pageSize: number };
export type AdminMember = {
  application: Record<string, unknown> | null; profile: AdminRow; teacher: Record<string, unknown> | null; email: string;
  lastSignInAt: string | null; note: string; noteUpdatedAt: string | null;
  bookings: number; lessons: number; sessions: number; reviews: number;
};
export type AdminDashboard = {
  systemJobs?: { jobname: string; active: boolean; status: string | null; start_time: string | null }[];
  openTickets: number; processingTickets: number; members: number; students: number; teachers: number; newMembers: number;
  unverifiedTeachers: number; lessons: number; unpublishedLessons: number;
  upcomingSessions: number; pendingBookings: number; pendingPayments: number;
  pendingWithdrawals: number; pendingSettlements: number; lowReviews: number; missingPortraits: number;
  revenue: { currency: string; succeeded: number; refunded: number }[]; generatedAt: string;
};
export type AdminAction = {
  kind: 'profile' | 'note' | 'teacher_review' | 'support_ticket' | 'lesson_published' | 'coupon_active' | 'teacher_featured' | 'home_banner';
  id: string; title: string; description: string; data: Record<string, unknown>; expected: Record<string, unknown>;
};
export type HomeBanner = {
  tag: string; title: string; cta_label: string; cta_href: string; image_scene: 'cafe' | 'desk' | 'seoul'; is_active: boolean; updated_at: string;
};
export type HomeFeaturedTeacher = { profile_id: string; featured_rank: number; is_verified: boolean; name: string };
export type HomeData = { banner: HomeBanner; featured: HomeFeaturedTeacher[] };

export const STATUS_LABELS: Record<string, string> = {
  not_applied: '신청 전', review_pending: '심사 대기', needs_changes: '보완 요청', approved: '승인', review_rejected: '반려',
  ticket_open: '접수', ticket_processing: '처리 중', ticket_resolved: '처리 완료',
  inquiry: '문의', report: '신고', booking: '예약·취소', payment: '결제·환불', account: '계정·로그인', lesson: '수업 이용', other: '기타',
  teacher_review: '선생님 심사', teacher_resubmit: '선생님 재심사 요청', support_ticket: '신고·문의 처리',
  verified: '인증 완료', unverified: '미인증', published: '공개', unpublished: '비공개',
  scheduled: '예정', ongoing: '진행 중', completed: '완료', cancelled: '취소',
  pending_payment: '결제 대기', confirmed: '예약 확정', no_show: '미참석',
  pending: '대기', succeeded: '결제 완료', refunded: '환불', requested: '출금 요청', processing: '처리 중', rejected: '거절', paid: '정산 적립',
  low: '별점 2점 이하', unanswered: '답변 대기 (3점 이상)', replied: '답변 완료 (3점 이상)',
  active: '사용 가능', inactive: '사용 중지', expired: '기간 만료',
  profile: '회원 정보 수정', note: '관리 메모 수정', teacher_verified: '선생님 인증 변경', lesson_published: '수업 공개 변경', coupon_active: '쿠폰 상태 변경',
  teacher_featured: '메인 노출 설정', home_banner: '메인 배너 수정',
  student: '학생', teacher: '선생님', admin: '관리자', group: '그룹 수업', '1on1': '1:1 수업', free_trial: '무료 체험',
  beginner: '입문', elementary: '초급', intermediate: '중급', advanced: '고급', topik1: 'TOPIK I', topik2: 'TOPIK II',
  card: '카드', paypal: 'PayPal', kakaopay: '카카오페이', fixed: '정액 할인', percent: '정률 할인',
  seoul: '서울 골목', cafe: '카페', desk: '학습 책상',
};
export const ADMIN_FILTERS: Partial<Record<AdminSection, string[]>> = {
  teachers: ['review_pending', 'needs_changes', 'approved', 'review_rejected'], lessons: ['published', 'unpublished'],
  sessions: ['scheduled', 'ongoing', 'completed', 'cancelled'],
  bookings: ['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show'],
  payments: ['pending', 'succeeded', 'refunded', 'cancelled'], settlements: ['pending', 'paid'],
  withdrawals: ['requested', 'processing', 'completed', 'rejected'], reviews: ['low', 'unanswered', 'replied'],
  tickets: ['ticket_open', 'ticket_processing', 'ticket_resolved'],
  coupons: ['active', 'inactive', 'expired'], audit: ['teacher_review', 'teacher_resubmit', 'support_ticket', 'profile', 'note', 'teacher_verified', 'lesson_published', 'coupon_active', 'teacher_featured', 'home_banner'],
};
export const ADMIN_COLUMNS: Record<Exclude<AdminSection, 'dashboard' | 'home' | 'menus' | 'lesson_config'>, [string, string][]> = {
  teacher_pending: [['name', '선생님'], ['email', '이메일'], ['headline', '한 줄 소개'], ['specialties', '전문 분야'], ['review_status', '심사 상태']],
  members: [['name', '회원'], ['role', '계정 유형'], ['native_language', '모국어'], ['bookings', '예약 수'], ['lessons', '수업 수'], ['created_at', '가입일']],
  students: [['name', '학생'], ['korean_level', '한국어 수준'], ['native_language', '모국어'], ['bookings', '예약 수'], ['has_note', '관리 메모'], ['created_at', '가입일']],
  teachers: [['name', '선생님'], ['review_status', '심사 상태'], ['featured_rank', '메인 노출'], ['specialties', '전문 분야'], ['rating_avg', '평점'], ['lessons', '수업 수'], ['created_at', '가입일']],
  lessons: [['title', '수업명'], ['teacher_name', '선생님'], ['type', '유형'], ['price', '가격'], ['capacity', '정원'], ['is_published', '공개 상태'], ['created_at', '등록일']],
  sessions: [['title', '수업명'], ['teacher_name', '선생님'], ['scheduled_at', '수업 시간'], ['enrolled_count', '참여 인원'], ['capacity', '정원'], ['status', '상태']],
  bookings: [['student_name', '학생'], ['teacher_name', '선생님'], ['title', '수업명'], ['scheduled_at', '수업 시간'], ['status', '예약 상태'], ['created_at', '예약일']],
  payments: [['student_name', '학생'], ['title', '수업명'], ['amount', '결제 금액'], ['method', '결제 수단'], ['verified_payment', '결제 검증'], ['status', '상태'], ['created_at', '결제일']],
  settlements: [['teacher_name', '선생님'], ['period_start', '기간 시작'], ['period_end', '기간 종료'], ['gross_amount', '총액'], ['platform_fee', '수수료'], ['net_amount', '정산액'], ['verified_settlement', '정산 검증'], ['status', '상태']],
  withdrawals: [['teacher_name', '선생님'], ['amount', '신청 금액'], ['bank_name', '은행'], ['account_number', '계좌 끝 4자리'], ['status', '상태'], ['created_at', '신청일']],
  reviews: [['student_name', '학생'], ['teacher_name', '선생님'], ['rating', '별점'], ['text', '리뷰'], ['teacher_reply', '선생님 답변'], ['created_at', '작성일']],
  coupons: [['code', '쿠폰 코드'], ['title', '쿠폰명'], ['discount_type', '할인 유형'], ['discount_value', '할인 값'], ['issued', '등록 수'], ['is_active', '사용 허용'], ['expires_at', '만료일']],
  tickets: [['title', '제목'], ['requester_name', '접수자'], ['requester_role', '가입 역할'], ['kind', '유형'], ['category', '분야'], ['status', '상태'], ['created_at', '접수일']],
  audit: [['actor_name', '작업자'], ['action', '작업'], ['reason', '변경 사유'], ['target_id', '대상 ID'], ['created_at', '변경일']],
};

export const DETAIL_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.values(ADMIN_COLUMNS).flat()),
  body: '접수 내용', response: '회원에게 공개되는 답변', internal_note: '관리자 내부 메모', feedback: '선생님에게 공개되는 심사 안내', reviewed_at: '심사일', requester_id: '접수자 ID', review_updated_at: '심사 갱신일',
  id: '고유 ID', updated_at: '수정일', avatar_url: '프로필 사진 URL', avatar_is_generated: 'AI 생성 사진',
  role: '계정 유형', profile_id: '회원 ID', teacher_id: '선생님 ID', student_id: '학생 ID',
  headline: '한 줄 소개', bio: '자기소개', country: '국가', years_experience: '경력(년)', rating_count: '리뷰 수',
  duration_minutes: '수업 시간(분)', package_type: '예약 유형', currency: '통화',
  pg_transaction_id: '결제 거래 ID', paid_at: '지급일', processed_at: '처리일', account_holder: '예금주',
  actor_id: '관리자 ID', note: '관리 메모', updated_by: '메모 수정자', min_order_amount: '최소 주문액',
  featured_rank: '메인 노출 순서', tag: '배너 태그', cta_label: '배너 버튼 문구', cta_href: '배너 버튼 링크', image_scene: '배너 배경 이미지',
};

export function adminDisplay(key: string, value: unknown, row: Record<string, unknown> = {}): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') {
    if (key === 'verified_payment' || key === 'verified_settlement') return value ? '검증 완료' : '미검증 기록';
    if (key === 'is_verified') return value ? '인증 완료' : '미인증';
    if (key === 'is_published') return value ? '공개' : '비공개';
    if (key === 'has_note') return value ? '메모 있음' : '없음';
    return value ? '예' : '아니요';
  }
  if (Array.isArray(value)) return value.map(String).join(', ') || '—';
  if (typeof value === 'object') return '상세 내역';
  if (/_at$/.test(key)) {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  if (['amount', 'price', 'gross_amount', 'platform_fee', 'net_amount', 'min_order_amount'].includes(key)) {
    return `${Number(value).toLocaleString('ko-KR')} ${String(row.currency || 'KRW')}`;
  }
  if (key === 'discount_value') return `${Number(value).toLocaleString()}${row.discount_type === 'percent' ? '%' : '원'}`;
  if (['status', 'review_status', 'requester_role', 'kind', 'category', 'action', 'role', 'active_role', 'type', 'korean_level', 'method', 'discount_type', 'image_scene'].includes(key)) return STATUS_LABELS[String(value)] || String(value);
  return String(value);
}
