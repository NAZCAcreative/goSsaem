-- Refresh product-authored copy while preserving the installed function versions.
do $migration$
declare fn regprocedure; original text; revised text;
begin
  foreach fn in array array[
    to_regprocedure('public.notify_booking_confirmed()'),
    to_regprocedure('public.my_lesson_recommendations()'),
    to_regprocedure('public.ensure_my_teacher_application()'),
    to_regprocedure('public.review_notifications()'),
    to_regprocedure('public.lesson_revision_submitted()')
  ] loop
    if fn is null then continue; end if;
    original := pg_get_functiondef(fn);
    revised := replace(original, $$coalesce(teacher_name, '선생님') || '쌤과의$$, $$coalesce(teacher_name, '') || '쌤과의$$);
    revised := replace(revised, '선생님', '쌤');
    if revised <> original then execute revised; end if;
  end loop;
end $migration$;
