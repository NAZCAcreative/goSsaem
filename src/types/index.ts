// VORA 도메인 타입 — 튜터 예약/매칭 마켓플레이스
// supabase/migrations/0001_init.sql 스키마와 1:1 대응한다.
// 그룹 강의가 기본(capacity > 1)이고, 1:1은 capacity = 1인 특수 케이스로 같은 구조를 공유한다.

// ─── User / Auth ────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'teacher' | 'admin';
export type LanguageLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'topik1' | 'topik2';

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  nativeLanguage?: string;
  koreanLevel: LanguageLevel;
  createdAt: string;
  updatedAt: string;
}

// ─── Teacher ────────────────────────────────────────────────────────────────

export interface TeacherProfile {
  profileId: string;
  headline?: string;
  bio?: string;
  introVideoUrl?: string;
  yearsExperience?: number;
  specialties: string[];
  country?: string;
  isVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  weekday: number; // 0(일) ~ 6(토)
  startTime: string; // HH:mm
  endTime: string;
  createdAt: string;
}

// ─── Lesson offering / session ───────────────────────────────────────────────

export type LessonType = 'group' | '1on1' | 'free_trial';

export interface TeacherLesson {
  id: string;
  teacherId: string;
  type: LessonType;
  category: string;
  title: string;
  level?: string;
  price: number;
  currency: string;
  capacity: number;
  description?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface LessonSession {
  id: string;
  teacherLessonId?: string;
  teacherId: string;
  title: string;
  type: LessonType;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  enrolledCount: number;
  status: SessionStatus;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Enrollment / Attendance ──────────────────────────────────────────────────

export type EnrollmentStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Enrollment {
  id: string;
  sessionId: string;
  studentId: string;
  status: EnrollmentStatus;
  packageType?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  status: AttendanceStatus;
  recordedBy?: string;
  recordedAt: string;
}

// ─── Payment / Coupon ─────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'succeeded' | 'refunded' | 'cancelled';
export type PaymentMethod = 'card' | 'paypal' | 'kakaopay';

export interface Payment {
  id: string;
  enrollmentId?: string;
  studentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  userCouponId?: string;
  pgTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  minOrderAmount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export type CouponStatus = 'available' | 'used' | 'expired';

export interface UserCoupon {
  id: string;
  couponId: string;
  userId: string;
  status: CouponStatus;
  usedAt?: string;
  createdAt: string;
}

// ─── Review ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  sessionId?: string;
  teacherId: string;
  studentId: string;
  rating: number; // 1~5
  text?: string;
  teacherReply?: string;
  teacherReplyAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Wishlist ───────────────────────────────────────────────────────────────

export interface Wishlist {
  id: string;
  studentId: string;
  teacherId: string;
  createdAt: string;
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatRoom {
  id: string;
  teacherId: string;
  studentId: string;
  lastMessageAt?: string;
  createdAt: string;
}

export type MessageType = 'text' | 'file';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  readAt?: string;
  createdAt: string;
}

// ─── Notification ───────────────────────────────────────────────────────────

export type NotificationType = 'lesson_reminder' | 'booking_status' | 'chat_message' | 'payment' | 'settlement';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Settlement / Withdrawal ──────────────────────────────────────────────────

export interface SettlementAccount {
  teacherId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  createdAt: string;
  updatedAt: string;
}

export type SettlementStatus = 'pending' | 'paid';

export interface Settlement {
  id: string;
  teacherId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: SettlementStatus;
  paidAt?: string;
  createdAt: string;
}

export type WithdrawalStatus = 'requested' | 'processing' | 'completed' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  teacherId: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
}

// ─── Material ───────────────────────────────────────────────────────────────

export interface Material {
  id: string;
  teacherId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  folder?: string;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
