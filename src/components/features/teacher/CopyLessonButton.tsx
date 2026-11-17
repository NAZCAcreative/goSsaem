"use client";
import { useRouter } from "next/navigation";
import { useLessonDraftStore } from "@/stores/lesson-draft-store";
import type { TeacherLessonRow } from "@/lib/queries/teacherLessons";
export function CopyLessonButton({ lesson }: { lesson: TeacherLessonRow }) {
  const router = useRouter();
  const copy = () => {
    const store = useLessonDraftStore.getState();
    store.reset();
    // Only supported group lessons can enter the existing creation wizard.
    store.setType("group");
    store.setField("title", lesson.title);
    store.setField("description", lesson.description ?? "");
    store.setField("category", lesson.category);
    store.setField("level", lesson.level ?? "누구나");
    store.setField("language", lesson.language);
    store.setField("supportedLanguages", lesson.supportedLanguages);
    store.setField("imageUrl", lesson.imageUrl ?? "");
    store.setField("videoUrl", lesson.videoUrl ?? "");
    store.setField("price", String(lesson.price));
    store.setField("duration", String(lesson.durationMinutes));
    store.setField("capacity", lesson.capacity);
    store.setField("schedulingMode", lesson.schedulingMode);
    router.push("/teacher/lessons/new/details");
  };
  if (lesson.type !== "group") return null;
  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-11 px-3 text-sm font-semibold text-primary"
    >
      내용 복사해 새 수업 개설
    </button>
  );
}
