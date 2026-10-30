import { redirect } from 'next/navigation';

export default function LegacyLessonRegistrationPage() {
  redirect('/teacher/lessons/new');
}
