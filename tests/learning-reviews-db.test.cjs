const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb, asUser } = require("./helpers/local-db.cjs");
const teacher = "10000000-0000-4000-8000-000000000011";
const student = "20000000-0000-4000-8000-000000000011";
const other = "20000000-0000-4000-8000-000000000012";
async function fixture(run) {
  const db = await createTestDb();
  try {
    for (const [id, role] of [
      [teacher, "teacher"],
      [student, "student"],
      [other, "student"],
    ])
      await db.query(
        `insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,
        [
          id,
          `${id}@example.test`,
          JSON.stringify({ role, name: "Test Person" }),
        ],
      );
    await db.exec(
      `update public.teacher_applications set status='review_pending';update public.teacher_applications set status='approved';`,
    );
    const session = (
      await db.query(
        `insert into public.lesson_sessions(teacher_id,title,type,scheduled_at,duration_minutes,capacity,status) values($1,'Completed Korean','group',now()-interval '2 days',50,2,'completed') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const enrollment = (
      await db.query(
        `insert into public.enrollments(session_id,student_id,status) values($1,$2,'completed') returning id`,
        [session, student],
      )
    ).rows[0].id;
    await run(db, { session, enrollment });
  } finally {
    await db.close();
  }
}
test("reviews preserve selected ratings, prevent forged/duplicate reviews, notify and return masked public data", () =>
  fixture(async (db, f) => {
    await asUser(db, other);
    await assert.rejects(
      db.query(
        `insert into public.reviews(session_id,student_id,teacher_id,rating,text) values($1,$2,$3,2,'Useful lesson')`,
        [f.session, other, teacher],
      ),
      /Completed enrollment/,
    );
    await asUser(db, student);
    const review = (
      await db.query(
        `insert into public.reviews(session_id,student_id,teacher_id,rating,text,tags) values($1,$2,$3,2,'Useful lesson',array['clear']) returning id`,
        [f.session, student, teacher],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        `insert into public.reviews(session_id,student_id,teacher_id,rating,text) values($1,$2,$3,5,'Duplicate')`,
        [f.session, student, teacher],
      ),
      /already exists/,
    );
    await assert.rejects(
      db.query(`update public.reviews set text='   ' where id=$1`, [review]),
      /1-2000/,
    );
    await assert.rejects(
      db.query(`update public.reviews set tags=array['fake'] where id=$1`, [
        review,
      ]),
      /Invalid review tags/,
    );
    await asUser(db, teacher);
    assert.deepEqual(
      (await db.query(`select public.my_review_summary() value`)).rows[0].value,
      { total: 1, average: 2, unanswered: 1 },
    );
    await assert.rejects(
      db.query(`update public.reviews set rating=5 where id=$1`, [review]),
      /Only reply/,
    );
    await db.query(
      `update public.reviews set teacher_reply='Thank you for the feedback' where id=$1`,
      [review],
    );
    assert.equal(
      (await db.query(`select public.my_review_summary() value`)).rows[0].value
        .unanswered,
      0,
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.notifications where user_id=$1 and title like '%답변%'`,
          [student],
        )
      ).rows[0].n,
      1,
    );
    await asUser(db, student);
    await db.query(
      `update public.reviews set text='Updated experience' where id=$1`,
      [review],
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query(`select * from public.reviews`)).rows.length,
      0,
    );
    const result = (
      await db.query(`select public.public_teacher_reviews($1) value`, [
        teacher,
      ])
    ).rows[0].value;
    assert.equal(result.average, 2);
    assert.equal(result.rows[0].name, "T***");
    assert.equal(result.rows[0].verified, true);
    assert.equal(result.rows[0].edited, true);
    assert.equal(result.rows[0].reply, "Thank you for the feedback");
    assert.equal(result.rows[0].student_id, undefined);
    await assert.rejects(
      db.query(`select public.my_review_summary()`),
      /permission denied/,
    );
    await db.exec("reset role");
    await asUser(db, other);
    await db.exec("set role authenticated");
    assert.equal((await db.query(`select * from public.reviews`)).rows.length,0);
    await db.exec("reset role");
    await asUser(db, student);
    await db.exec("set role authenticated");
    assert.equal((await db.query(`select * from public.reviews`)).rows.length,1);
    await db.exec("reset role");
    await assert.rejects(
      db.query(`select public.report_review($1,'short',gen_random_uuid())`, [
        review,
      ]),
      /10-1000/,
    );
    const request = "30000000-0000-4000-8000-000000000011";
    const first = (
      await db.query(
        `select public.report_review($1,'Personal information was exposed',$2) value`,
        [review, request],
      )
    ).rows[0].value;
    const second = (
      await db.query(
        `select public.report_review($1,'Personal information was exposed',$2) value`,
        [review, request],
      )
    ).rows[0].value;
    assert.equal(first, second);
  }));
test("feedback drafts stay private, publication notifies once and changed practice resets completion", () =>
  fixture(async (db, f) => {
    await asUser(db, other);
    await assert.rejects(
      db.query(
        `select public.save_lesson_feedback($1,'Good','Practice','Next',true)`,
        [f.enrollment],
      ),
      /ownership/,
    );
    await asUser(db, teacher);
    await db.query(
      `select public.save_lesson_feedback($1,'Good speaking','Practice ordering','Travel next',false)`,
      [f.enrollment],
    );
    await asUser(db, student);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query(`select * from public.lesson_feedback`)).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`select public.set_practice_done($1,true)`, [f.enrollment]),
      /Published feedback/,
    );
    await db.exec("reset role");
    await asUser(db, teacher);
    await db.query(
      `select public.save_lesson_feedback($1,'Good speaking','Practice ordering','Travel next',true)`,
      [f.enrollment],
    );
    await db.query(
      `select public.save_lesson_feedback($1,'Good speaking','Practice ordering','Travel next',true)`,
      [f.enrollment],
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.notifications where user_id=$1 and title like '%피드백%'`,
          [student],
        )
      ).rows[0].n,
      1,
    );
    await asUser(db, other);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query(`select * from public.lesson_feedback`)).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`select public.set_practice_done($1,true)`, [f.enrollment]),
      /Access denied/,
    );
    await db.exec("reset role");
    await asUser(db, student);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query(`select * from public.lesson_feedback`)).rows.length,
      1,
    );
    await db.query(`select public.set_practice_done($1,true)`, [f.enrollment]);
    await db.exec("reset role");
    await asUser(db, teacher);
    await db.query(
      `select public.save_lesson_feedback($1,'Good speaking','New practice','Travel next',true)`,
      [f.enrollment],
    );
    assert.equal(
      (await db.query(`select practice_done from public.lesson_feedback`))
        .rows[0].practice_done,
      false,
    );
  }));
test("next lesson and preparation use server time and metrics count completed enrollments only", () =>
  fixture(async (db, f) => {
    await asUser(db, "");
    const upcoming = (
      await db.query(
        `insert into public.lesson_sessions(teacher_id,title,type,scheduled_at,duration_minutes,capacity,status) values($1,'Upcoming Korean','group',now()+interval '2 days',50,2,'scheduled') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into public.enrollments(session_id,student_id,status) values($1,$2,'confirmed')`,
      [upcoming, student],
    );
    await asUser(db, other);
    assert.equal(
      (await db.query(`select public.my_next_lesson() value`)).rows[0].value,
      null,
    );
    await asUser(db, student);
    assert.equal(
      (await db.query(`select public.my_next_lesson() value`)).rows[0].value
        .sessionId,
      upcoming,
    );
    await asUser(db, teacher);
    const prep = (
      await db.query(`select public.my_teacher_preparation() value`)
    ).rows[0].value;
    assert.ok(
      prep.some((row) => row.id === upcoming && row.kind === "meeting"),
    );
    assert.deepEqual(
      (await db.query(`select public.my_teacher_metrics() value`)).rows[0]
        .value,
      { completed: 1, students: 1, returning: 0 },
    );
    await db.query(
      `select public.set_session_meeting($1,'https://meet.google.com/abc-defg-hij')`,
      [upcoming],
    );
    assert.ok(
      !(
        await db.query(`select public.my_teacher_preparation() value`)
      ).rows[0].value.some((row) => row.id === upcoming),
    );
  }));
