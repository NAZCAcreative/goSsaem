const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb, asUser } = require("./helpers/local-db.cjs");
const teacher = "10000000-0000-4000-8000-000000000021",
  student = "20000000-0000-4000-8000-000000000021",
  other = "20000000-0000-4000-8000-000000000022";
const device = "30000000-0000-4000-8000-000000000021",
  second = "30000000-0000-4000-8000-000000000022",
  project = "40000000-0000-4000-8000-000000000021";
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
        [id, `${id}@example.test`, JSON.stringify({ role, name: role })],
      );
    await asUser(db, teacher);
    await register(db);
    await run(db);
  } finally {
    await db.close();
  }
}
async function register(
  db,
  id = device,
  token = "ExpoPushToken[teacherToken]",
) {
  await db.query(
    `select public.register_mobile_push_device($1,$2,$3,'android','0.1.0')`,
    [id, token, project],
  );
}
async function notify(db, kind = "booking_status") {
  return (
    await db.query(
      `insert into public.notifications(user_id,type,title,body,link_url) values($1,$2,'Test notification','Private content','/teacher/lessons') returning id`,
      [teacher, kind],
    )
  ).rows[0].id;
}
const claim = async (db) =>
  (await db.query(`select public.claim_mobile_push() value`)).rows[0].value;
test("mobile registration hides tokens and isolates settings, logout cancels queued deliveries", () =>
  fixture(async (db) => {
    await notify(db);
    await asUser(db, other);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(`select * from public.mobile_push_devices`),
      /permission denied/,
    );
    assert.equal(
      (await db.query(`select * from public.mobile_push_settings`)).rows.length,
      0,
    );
    await db.query(`select public.unregister_mobile_push_device($1)`, [device]);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          `select active from public.mobile_push_devices where id=$1`,
          [device],
        )
      ).rows[0].active,
      true,
    );
    await asUser(db, teacher);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(`select public.claim_mobile_push()`),
      /permission denied/,
    );
    await db.query(`select public.unregister_mobile_push_device($1)`, [device]);
    await db.exec("reset role");
    assert.equal(
      (await db.query(`select status from public.mobile_push_deliveries`))
        .rows[0].status,
      "skipped",
    );
    assert.equal((await claim(db)).length, 0);
  }));
test("chat and booking requests create recipient-specific push jobs without replay on unchanged status", () =>
  fixture(async (db) => {
    const room = (
      await db.query(
        `insert into public.chat_rooms(teacher_id,student_id) values($1,$2) returning id`,
        [teacher, student],
      )
    ).rows[0].id;
    await asUser(db, student);
    await db.query(
      `insert into public.chat_messages(room_id,sender_id,text) values($1,$2,'Hello teacher')`,
      [room, student],
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.mobile_push_deliveries where user_id=$1`,
          [teacher],
        )
      ).rows[0].n,
      1,
    );
    await asUser(db, "");
    const session = (
      await db.query(
        `insert into public.lesson_sessions(teacher_id,title,type,scheduled_at,duration_minutes,capacity) values($1,'Korean lesson','group',now()+interval '2 days',50,2) returning id`,
        [teacher],
      )
    ).rows[0].id;
    const enrollment = (
      await db.query(
        `insert into public.enrollments(session_id,student_id,status) values($1,$2,'pending_payment') returning id`,
        [session, student],
      )
    ).rows[0].id;
    await db.query(
      `update public.enrollments set status='confirmed' where id=$1`,
      [enrollment],
    );
    await db.query(
      `update public.enrollments set status='confirmed' where id=$1`,
      [enrollment],
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.mobile_push_deliveries where user_id=$1`,
          [teacher],
        )
      ).rows[0].n,
      3,
    );
    await asUser(db, teacher);
    assert.equal(
      (await db.query(`select public.my_mobile_bookings() value`)).rows[0]
        .value[0].id,
      enrollment,
    );
    await asUser(db, other);
    assert.deepEqual(
      (await db.query(`select public.my_mobile_bookings() value`)).rows[0]
        .value,
      [],
    );
  }));
test("quiet hours defer sends, preferences suppress them and uncertain leases are not repeated", () =>
  fixture(async (db) => {
    await notify(db);
    await db.exec(
      `update public.mobile_push_settings set quiet_start=extract(hour from now() at time zone 'Asia/Seoul')::int*60+extract(minute from now() at time zone 'Asia/Seoul')::int,quiet_end=(extract(hour from now() at time zone 'Asia/Seoul')::int*60+extract(minute from now() at time zone 'Asia/Seoul')::int+1)%1440`,
    );
    assert.equal((await claim(db)).length, 0);
    await db.exec(
      `update public.mobile_push_settings set quiet_start=null,quiet_end=null`,
    );
    const first = await claim(db);
    assert.equal(first.length, 1);
    assert.equal((await claim(db)).length, 0);
    await db.exec(
      `update public.mobile_push_deliveries set lease_until=now()-interval '1 second' where status='sending'`,
    );
    assert.equal((await claim(db)).length, 0);
    assert.equal(
      (await db.query(`select status from public.mobile_push_deliveries`))
        .rows[0].status,
      "uncertain",
    );
    await db.exec(`update public.mobile_push_settings set chat_message=false`);
    await notify(db, "chat_message");
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.mobile_push_deliveries`,
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      db.exec(`update public.mobile_push_settings set time_zone='not-a-zone'`),
      /Invalid timezone/,
    );
  }));
test("account switches discard old jobs and push tests target one own device without emails or real bookings", () =>
  fixture(async (db) => {
    const old = await notify(db);
    await asUser(db, student);
    await register(db, second); // same token, new account
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.mobile_push_deliveries where notification_id=$1`,
          [old],
        )
      ).rows[0].n,
      0,
    );
    await asUser(db, teacher);
    await register(db, device, "ExpoPushToken[newTeacherToken]");
    await register(
      db,
      "30000000-0000-4000-8000-000000000023",
      "ExpoPushToken[secondTeacherToken]",
    );
    const id = (
      await db.query(
        `select public.request_mobile_push_test($1,'booking_status') value`,
        [device],
      )
    ).rows[0].value;
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.mobile_push_deliveries where notification_id=$1`,
          [id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.delivery_outbox where notification_id=$1`,
          [id],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query(`select count(*)::int n from public.enrollments`)).rows[0]
        .n,
      0,
    );
    await asUser(db, other);
    await assert.rejects(
      db.query(`select public.request_mobile_push_test($1,'chat_message')`, [
        device,
      ]),
      /own device/,
    );
    assert.deepEqual(
      (
        await db.query(`select public.my_mobile_push_diagnostics($1) value`, [
          device,
        ])
      ).rows[0].value,
      [],
    );
  }));

test("teacher start and preparation reminders are generated once and do not send extra emails", () =>
  fixture(async (db) => {
    await asUser(db, "");
    await db.query(
      `insert into public.lesson_sessions(teacher_id,title,type,scheduled_at,duration_minutes,capacity) values($1,'Starting soon','group',now()+interval '10 minutes',50,2)`,
      [teacher],
    );
    assert.equal(
      (await db.query(`select public.enqueue_teacher_mobile_reminders() n`))
        .rows[0].n,
      2,
    );
    assert.equal(
      (await db.query(`select public.enqueue_teacher_mobile_reminders() n`))
        .rows[0].n,
      0,
    );
    assert.equal(
      (await db.query(`select count(*)::int n from public.delivery_outbox`))
        .rows[0].n,
      0,
    );
    const jobs = await claim(db);
    assert.equal(jobs.length, 2);
    assert.ok(jobs.some((job) => job.kind === "lesson_reminder"));
    assert.ok(jobs.some((job) => job.kind === "booking_status"));
  }));
