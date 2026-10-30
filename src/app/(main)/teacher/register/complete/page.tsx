import { redirect } from 'next/navigation';

export default function LegacyLessonCompletePage() {
  redirect('/teacher/lessons/new/complete');
}
