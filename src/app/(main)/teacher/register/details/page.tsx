import { redirect } from 'next/navigation';

export default function LegacyLessonDetailsPage() {
  redirect('/teacher/lessons/new/details');
}
