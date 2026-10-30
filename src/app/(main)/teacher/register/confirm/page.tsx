import { redirect } from 'next/navigation';

export default function LegacyLessonConfirmPage() {
  redirect('/teacher/lessons/new/confirm');
}
