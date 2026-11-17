import { createClient } from "@/lib/supabase/client";

export type WrittenReviewRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatarUrl: string | null;
  meta: string;
  stars: number;
  text: string;
  teacherReply: string | null;
  tags: string[];
};

export async function listMyWrittenReviews(
  studentId: string,
  page = 1,
): Promise<WrittenReviewRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, teacher_id, rating, text, tags, teacher_reply, created_at, profiles!teacher_id(name, avatar_url), lesson_sessions(title)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const teacherProfile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const session = Array.isArray(row.lesson_sessions)
      ? row.lesson_sessions[0]
      : row.lesson_sessions;
    const dateLabel = new Date(row.created_at).toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    return {
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: teacherProfile?.name ?? "선생님",
      teacherAvatarUrl: teacherProfile?.avatar_url ?? null,
      meta: session?.title ? `${dateLabel} • ${session.title}` : dateLabel,
      stars: row.rating,
      text: row.text ?? "",
      teacherReply: row.teacher_reply,
      tags: row.tags,
    };
  });
}

export async function updateReviewText(
  reviewId: string,
  text: string,
): Promise<void> {
  validateReview(text);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update({ text: text.trim() })
    .eq("id", reviewId)
    .select("id")
    .single();
  if (error || !data)
    throw new Error(error?.message || "수정할 후기를 찾을 수 없습니다.");
}

export type PendingReviewTarget = {
  sessionId: string;
  teacherId: string;
  teacherName: string;
  teacherAvatarUrl: string | null;
  scheduledAt: string;
  sessionTitle: string;
};

export async function listPendingReviewTargets(
  studentId: string,
  page = 1,
): Promise<PendingReviewTarget[]> {
  const { data, error } = await createClient().rpc("my_pending_reviews", {
    p_page: page,
  });
  if (error) throw new Error(error.message);
  return data as PendingReviewTarget[];
}

export async function getPendingReviewTarget(
  sessionId: string,
): Promise<PendingReviewTarget | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const { data, error } = await createClient().rpc("my_pending_review_target", {
    p_session: sessionId,
  });
  if (error) throw new Error(error.message);
  return data as PendingReviewTarget | null;
}

export type CreateReviewInput = {
  studentId: string;
  teacherId: string;
  sessionId: string;
  rating: number;
  text: string;
  tags?: string[];
};

export async function createReview(input: CreateReviewInput): Promise<void> {
  validateReview(input.text, input.rating);
  const supabase = createClient();
  const { error } = await supabase.from("reviews").insert({
    student_id: input.studentId,
    teacher_id: input.teacherId,
    session_id: input.sessionId,
    rating: input.rating,
    text: input.text.trim(),
    tags: input.tags ?? [],
  });
  if (error)
    throw new Error(
      error.code === "23505"
        ? "이미 작성한 후기입니다. 작성한 후기 목록을 확인해주세요."
        : error.code === "42501"
          ? "수강 완료된 본인 수업에만 후기를 작성할 수 있습니다."
          : "후기를 등록하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.",
    );
}

export type TeacherReviewRow = {
  id: string;
  studentName: string;
  studentAvatarUrl: string | null;
  createdAt: string;
  rating: number;
  text: string;
  teacherReply: string | null;
};

export async function listTeacherReviews(
  teacherId: string,
  page = 1,
  sort = "최신순",
): Promise<TeacherReviewRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, text, created_at, teacher_reply, profiles!student_id(name, avatar_url)",
    )
    .eq("teacher_id", teacherId)
    .order(
      sort === "높은 평점순"
        ? "rating"
        : sort === "미답변순"
          ? "teacher_reply"
          : "created_at",
      { ascending: sort === "미답변순", nullsFirst: true },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const studentProfile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    return {
      id: row.id,
      studentName: studentProfile?.name ?? "학생",
      studentAvatarUrl: studentProfile?.avatar_url ?? null,
      createdAt: row.created_at,
      rating: row.rating,
      text: row.text ?? "",
      teacherReply: row.teacher_reply,
    };
  });
}

export async function updateTeacherReply(
  reviewId: string,
  reply: string,
): Promise<void> {
  validateReview(reply);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update({
      teacher_reply: reply,
      teacher_reply_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select("id")
    .single();
  if (error || !data)
    throw new Error(error?.message || "답변할 후기를 찾을 수 없습니다.");
}

export const reviewTags: Record<string, string> = {
  clear: "설명이 이해하기 쉬워요",
  speaking: "말할 기회가 많아요",
  materials: "자료가 유용해요",
  kind: "친절해요",
  prepared: "준비가 꼼꼼해요",
};
export function validateReview(text: string, rating?: number) {
  if (!text.trim() || text.trim().length > 2000)
    throw new Error("내용은 1~2,000자로 입력해주세요.");
  if (
    rating !== undefined &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  )
    throw new Error("별점을 선택해주세요.");
}
export type ReviewSummary = {
  total: number;
  average: number;
  unanswered: number;
};
export async function getReviewSummary(): Promise<ReviewSummary> {
  const { data, error } = await createClient().rpc("my_review_summary");
  if (error) throw new Error(error.message);
  return data as unknown as ReviewSummary;
}
export type PublicReview = {
  id: string;
  name: string;
  rating: number;
  text: string;
  tags: string[];
  reply: string | null;
  createdAt: string;
  edited: boolean;
  lessonType: string | null;
  verified: boolean;
};
export async function getPublicReviews(
  teacherId: string,
  page: number,
  sort: string,
) {
  const { data, error } = await createClient().rpc("public_teacher_reviews", {
    p_teacher: teacherId,
    p_page: page,
    p_sort: sort,
  });
  if (error) throw new Error(error.message);
  return data as unknown as {
    total: number;
    average: number;
    rows: PublicReview[];
  };
}
export async function reportReview(
  reviewId: string,
  reason: string,
  requestId: string,
) {
  if (reason.trim().length < 10 || reason.trim().length > 1000)
    throw new Error("신고 사유를 10~1,000자로 입력해주세요.");
  const { error } = await createClient().rpc("report_review", {
    p_review: reviewId,
    p_reason: reason.trim(),
    p_request: requestId,
  });
  if (error)
    throw new Error("신고를 접수하지 못했습니다. 잠시 후 다시 시도해주세요.");
}
