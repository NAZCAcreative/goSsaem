const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb, asUser } = require("./helpers/local-db.cjs");
const teacher = "10000000-0000-4000-8000-000000000001",
  student = "20000000-0000-4000-8000-000000000001",
  other = "20000000-0000-4000-8000-000000000002",
  admin = "3429c1b9-9b35-45dd-87fb-64fccf769a9a";
async function fixture(run) {
  const db = await createTestDb();
  try {
    for (const [id, role] of [
      [teacher, "teacher"],
      [student, "student"],
      [other, "student"],
      [admin, "student"],
    ])
      await db.query(
        `insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,
        [id, `${id}@example.test`, JSON.stringify({ name: role, role })],
      );
    await db.exec(
      `insert into public.admin_members(profile_id) values('${admin}');update public.teacher_applications set status='review_pending';update public.teacher_applications set status='approved';insert into public.teacher_availability(teacher_id,weekday,start_time,end_time) select '${teacher}',i,'00:00','23:59' from generate_series(0,6) i;`,
    );
    const lesson = (
      await db.query(
        `insert into public.teacher_lessons(teacher_id,title,type,category,price,capacity,is_published,scheduling_mode,duration_minutes,availability) values($1,'Korean lesson','1on1','conversation',10000,1,true,'request',50,(select jsonb_agg(jsonb_build_object('weekday',i,'start','00:00','end','23:59')) from generate_series(0,6) i)) returning id`,
        [teacher],
      )
    ).rows[0].id;
    const start = (
      await db.query(
        `select date_trunc('day',now())+interval '2 days 9 hours' as start`,
      )
    ).rows[0].start;
    await asUser(db, student);
    await run(db, { lesson, start, teacher, student, other, admin });
  } finally {
    await db.close();
  }
}
async function reserve(db, f) {
  return (
    await db.query(`select public.reserve_lesson($1,$2) as value`, [
      f.lesson,
      f.start,
    ])
  ).rows[0].value.enrollmentId;
}

test('integrated lesson discovery excludes demo and restricted teachers', () => fixture(async (db, f) => {
  const catalog = async () => (await db.query(`select public.public_lesson_catalog('{"type":"all"}') value`)).rows[0].value;
  assert.equal((await catalog()).total, 1);
  await db.query(`insert into public.teacher_launch_flags(teacher_id,is_demo) values($1,true) on conflict(teacher_id) do update set is_demo=true`, [f.teacher]);
  assert.equal((await catalog()).total, 0);
  assert.deepEqual((await db.query(`select public.my_lesson_recommendations() value`)).rows[0].value, []);
  await db.query(`update public.teacher_launch_flags set is_demo=false where teacher_id=$1`, [f.teacher]);
  await asUser(db, f.admin);
  await db.exec(`select set_config('request.jwt.claim.aal','aal2',false)`);
  await db.query(`select public.admin_set_restriction($1,true,null,'Integration restriction check')`, [f.teacher]);
  await asUser(db, f.student);
  assert.equal((await catalog()).total, 0);
}));

test('integrated request lessons preserve duration and fixed lessons reject invented slots', () => fixture(async (db, f) => {
  await db.query(`delete from public.teacher_availability where teacher_id=$1`, [f.teacher]);
  assert.equal((await db.query(`select public.search_teachers(p_periods=>array['evening']) value`)).rows[0].value.total, 1);
  await db.query(`update public.teacher_lessons set duration_minutes=70 where id=$1`, [f.lesson]);
  const enrollment = await reserve(db, f);
  assert.equal((await db.query(`select s.duration_minutes n from public.enrollments e join public.lesson_sessions s on s.id=e.session_id where e.id=$1`, [enrollment])).rows[0].n, 70);
  await db.query(`update public.teacher_lessons set scheduling_mode='fixed' where id=$1`, [f.lesson]);
  await assert.rejects(db.query(`select public.reserve_lesson($1,$2::timestamptz+interval '1 day')`, [f.lesson, f.start]), /unavailable/);
}));

test('remote meeting editor stores private credentials and booked products retain history', () => fixture(async (db, f) => {
  const enrollment = await reserve(db, f);
  const session = (await db.query(`select session_id from public.enrollments where id=$1`, [enrollment])).rows[0].session_id;
  await asUser(db, f.teacher);
  await db.query(`select public.update_teacher_meeting_link($1,'https://meet.google.com/abc-defg-hij')`, [session]);
  assert.equal((await db.query(`select meeting_link from public.lesson_sessions where id=$1`, [session])).rows[0].meeting_link, null);
  assert.equal((await db.query(`select count(*)::int n from public.session_meetings where session_id=$1`, [session])).rows[0].n, 1);
  await assert.rejects(db.query(`update public.lesson_sessions set meeting_link='https://meet.example.test/leaked' where id=$1`, [session]), /private session/);
  await assert.rejects(db.query(`select public.delete_teacher_lesson($1)`, [f.lesson]), /Booked lesson/);
  await asUser(db, f.other);
  await assert.rejects(db.query(`select public.update_teacher_meeting_link($1,'https://meet.example.test/other')`, [session]), /access denied/);
}));
async function prepare(db, f) {
  const enrollment = await reserve(db, f);
  await db.query(`select public.accept_service_policies('2026-11-16')`);
  const order = (
    await db.query(`select public.prepare_checkout($1) as value`, [enrollment])
  ).rows[0].value;
  return { enrollment, order };
}
function payment(order, status = "DONE") {
  return {
    orderId: order.orderId,
    paymentKey: `key-${order.orderId}`,
    totalAmount: 10000,
    balanceAmount: status === "CANCELED" ? 0 : 10000,
    currency: "KRW",
    status,
  };
}
async function record(db, order, status = "DONE") {
  await asUser(db, null, "service_role");
  return (
    await db.query(`select public.record_provider_payment($1,$2) as value`, [
      order.orderId,
      JSON.stringify(payment(order, status)),
    ])
  ).rows[0].value;
}

test('sandbox checkout works before policy publication and never bypasses consent for live checkout', () => fixture(async (db, f) => {
  const enrollment = await reserve(db, f);
  await assert.rejects(db.query(`select public.prepare_checkout($1)`, [enrollment]), /consent/);
  const order = (await db.query(`select public.prepare_test_checkout($1) value`, [enrollment])).rows[0].value;
  assert.equal(order.mode, 'test');
  assert.equal(order.amount, 10000);
  assert.equal((await db.query(`select public.prepare_test_checkout($1) value`, [enrollment])).rows[0].value.orderId, order.orderId);
  await assert.rejects(db.query(`select public.prepare_checkout($1)`, [enrollment]), /consent/);
  await db.query(`select public.accept_service_policies('2026-11-16')`);
  await assert.rejects(db.query(`select public.prepare_checkout($1)`, [enrollment]), /environment mismatch/);
  await asUser(db, f.other);
  await assert.rejects(db.query(`select public.prepare_test_checkout($1)`, [enrollment]), /not found/);
}));

test('sandbox webhook receipts keep their environment before key binding and support verified refunds', () => fixture(async (db, f) => {
  const enrollment = await reserve(db, f);
  const order = (await db.query(`select public.prepare_test_checkout($1) value`, [enrollment])).rows[0].value;
  assert.equal((await record(db, order)).status, 'paid');
  const row = (await db.query(`select id,payment_environment from public.payments where enrollment_id=$1`, [enrollment])).rows[0];
  assert.equal(row.payment_environment, 'test');
  await assert.rejects(db.query(`update public.payments set payment_environment='live' where id=$1`, [row.id]), /immutable/);
  await asUser(db, f.student);
  assert.equal((await db.query(`select public.my_payment_detail($1) value`, [row.id])).rows[0].value.mode, 'test');
  await asUser(db, f.admin);
  await db.query(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);
  await db.query(`select public.admin_prepare_refund($1,'Sandbox refund test')`, [order.orderId]);
  assert.equal((await record(db, order, 'CANCELED')).status, 'refunded');
  assert.equal((await db.query(`select status from public.enrollments where id=$1`, [enrollment])).rows[0].status, 'cancelled');
}));

test('sandbox payments do not create settlements, withdrawable balances or real revenue', () => fixture(async (db, f) => {
  const enrollment = await reserve(db, f);
  const order = (await db.query(`select public.prepare_test_checkout($1) value`, [enrollment])).rows[0].value;
  await record(db, order);
  await db.query(`update public.lesson_sessions set scheduled_at=now()-interval '3 days' where id=(select session_id from public.enrollments where id=$1)`, [enrollment]);
  await db.query(`update public.enrollments set status='completed' where id=$1`, [enrollment]);
  await db.exec(`select public.run_weekly_settlement(current_date-5,current_date-1)`);
  assert.equal((await db.query(`select count(*)::int n from public.settlement_payment_items`)).rows[0].n, 0);
  await asUser(db, f.teacher);
  assert.equal((await db.query(`select public.my_balance() value`)).rows[0].value.availableBalance, 0);
  await asUser(db, f.admin);
  assert.deepEqual((await db.query(`select public.admin_dashboard() value`)).rows[0].value.revenue, []);

  // Positive control: the same settlement job still credits an actual receipt.
  await asUser(db, f.student);
  const start = (await db.query(`select $1::timestamptz+interval '1 day' start`, [f.start])).rows[0].start;
  const live = await prepare(db, { ...f, start });
  await record(db, live.order);
  await db.query(`update public.lesson_sessions set scheduled_at=now()-interval '2 days' where id=(select session_id from public.enrollments where id=$1)`, [live.enrollment]);
  await db.query(`update public.enrollments set status='completed' where id=$1`, [live.enrollment]);
  await db.exec(`select public.run_weekly_settlement(current_date-5,current_date-1)`);
  assert.equal((await db.query(`select sum(gross_amount)::int n from public.settlements`)).rows[0].n, 10000);
  assert.equal((await db.query(`select count(*)::int n from public.settlement_payment_items`)).rows[0].n, 1);
  await assert.rejects(db.query(`insert into public.settlement_payment_items(payment_id,settlement_id) select p.id,s.id from public.payments p cross join public.settlements s where p.enrollment_id=$1 limit 1`, [enrollment]), /Test payments cannot be settled/);
  await asUser(db, f.teacher);
  assert.equal((await db.query(`select public.my_balance() value`)).rows[0].value.availableBalance, 8000);
}));

test("API budgets are per-account and outbox claims do not duplicate active leases", () =>
  fixture(async (db, f) => {
    for (let i = 0; i < 20; i++)
      assert.equal(
        (
          await db.query(
            `select public.consume_action_budget('confirm') allowed`,
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (await db.query(`select public.consume_action_budget('confirm') allowed`))
        .rows[0].allowed,
      false,
    );
    await asUser(db, f.other);
    assert.equal(
      (await db.query(`select public.consume_action_budget('confirm') allowed`))
        .rows[0].allowed,
      true,
    );
    await asUser(db, f.student);
    const { order } = await prepare(db, f);
    await record(db, order);
    const first = (
      await db.query(`select public.claim_notification_emails(20) value`)
    ).rows[0].value;
    assert.equal(first.length, 2);
    assert.equal(
      (await db.query(`select public.claim_notification_emails(20) value`))
        .rows[0].value.length,
      0,
    );
    await db.exec(
      `update public.delivery_outbox set lease_until=now()-interval '1 minute',first_attempt_at=now()-interval '25 hours'`,
    );
    assert.equal(
      (await db.query(`select public.claim_notification_emails(20) value`))
        .rows[0].value.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.delivery_outbox where status='failed' and attempts=8`,
        )
      ).rows[0].n,
      2,
    );
  }));

test("payment details are private and the order key is never returned", () =>
  fixture(async (db, f) => {
    const { order } = await prepare(db, f);
    await record(db, order);
    const id = (await db.query(`select id from public.payments limit 1`))
      .rows[0].id;
    await asUser(db, f.student);
    const detail = (
      await db.query(`select public.my_payment_detail($1) value`, [id])
    ).rows[0].value;
    assert.equal(detail.amount, 10000);
    assert.equal(detail.verified, true);
    assert.equal("paymentKey" in detail, false);
    await asUser(db, f.other);
    await assert.rejects(
      db.query(`select public.my_payment_detail($1)`, [id]),
      /not found/,
    );
  }));

test('payout recording requires MFA, a processing step and a unique bank reference',()=>fixture(async(db,f)=>{
  await asUser(db,null,'service_role');await db.query(`insert into public.settlements(teacher_id,period_start,period_end,gross_amount,platform_fee,net_amount,status,currency,verified_settlement) values($1,current_date-7,current_date-1,20000,0,20000,'paid','KRW',true)`,[f.teacher]);
  await db.query(`insert into public.settlement_accounts(teacher_id,bank_name,account_holder,account_number) values($1,'Fixture bank','Teacher','1234567890')`,[f.teacher]);
  await asUser(db,f.teacher);const first='30000000-0000-4000-8000-000000000001',second='30000000-0000-4000-8000-000000000002';
  await db.query(`select public.request_withdrawal(5000,$1)`,[first]);await db.query(`select public.request_withdrawal(5000,$1)`,[second]);
  await asUser(db,f.admin);await assert.rejects(db.query(`select public.admin_record_payout($1,'processing','','Preparing transfer')`,[first]),/MFA/);
  await db.query(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);
  await assert.rejects(db.query(`select public.admin_record_payout($1,'completed','bank-ref-001','Transfer confirmed')`,[first]),/transition/);
  for(const id of [first,second])await db.query(`select public.admin_record_payout($1,'processing','','Preparing transfer')`,[id]);
  await db.query(`select public.admin_record_payout($1,'completed','bank-ref-001','Transfer confirmed')`,[first]);
  await assert.rejects(db.query(`select public.admin_record_payout($1,'completed','bank-ref-001','Transfer confirmed')`,[second]),/unique constraint/);
  assert.equal((await db.query(`select status from public.withdrawal_requests where id=$1`,[second])).rows[0].status,'processing');
}));

test("all migrations apply to a clean PostgreSQL database", async () => {
  const db = await createTestDb();
  try {
    const { rows } = await db.query(
      `select proname from pg_proc where proname in ('search_teachers','prepare_checkout','session_access','admin_operations')`,
    );
    assert.equal(rows.length, 4);
  } finally {
    await db.close();
  }
});

test("server search is paged and public counts exclude pending reservations", () =>
  fixture(async (db, f) => {
    await reserve(db, f);
    await asUser(db, null, "anon");
    const search = (await db.query(`select public.search_teachers() as value`))
      .rows[0].value;
    assert.equal(search.total, 1);
    assert.equal(search.items[0].recentBookings, 0);
    assert.deepEqual(
      (await db.query(`select public.public_booking_counts() as value`)).rows[0]
        .value,
      [],
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query(`select count(*)::int as n from public.teacher_profiles`))
        .rows[0].n,
      1,
    );
    await db.exec("reset role");
  }));

test("checkout requires consent, ignores client prices and is idempotent", () =>
  fixture(async (db, f) => {
    const enrollment = await reserve(db, f);
    await assert.rejects(
      db.query(`select public.prepare_checkout($1)`, [enrollment]),
      /consent/,
    );
    await db.query(`select public.accept_service_policies('2026-11-16')`);
    const first = (
      await db.query(`select public.prepare_checkout($1) value`, [enrollment])
    ).rows[0].value;
    const second = (
      await db.query(`select public.prepare_checkout($1) value`, [enrollment])
    ).rows[0].value;
    assert.equal(first.orderId, second.orderId);
    assert.equal(first.amount, 10000);
    await asUser(db, f.other);
    await assert.rejects(
      db.query(`select public.my_checkout_order($1)`, [first.orderId]),
      /access denied/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(`select public.begin_payment_confirmation($1,'key')`, [
        first.orderId,
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
  }));

test("provider amount mismatch is rejected and duplicate DONE creates one payment", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await asUser(db, null, "service_role");
    await assert.rejects(
      db.query(`select public.record_provider_payment($1,$2)`, [
        order.orderId,
        JSON.stringify({ ...payment(order), totalAmount: 1 }),
      ]),
      /mismatch/,
    );
    assert.equal((await record(db, order)).status, "paid");
    assert.equal((await record(db, order)).status, "paid");
    assert.equal(
      (await db.query(`select count(*)::int n from public.payments`)).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (await db.query(`select count(*)::int n from public.delivery_outbox`))
        .rows[0].n,
      2,
    );
  }));

test("late approved payment is queued for refund and stale DONE never resurrects it", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await db.query(
      `update public.enrollments set status='cancelled' where id=$1`,
      [enrollment],
    );
    assert.equal((await record(db, order)).status, "refund_pending");
    assert.equal((await record(db, order, "CANCELED")).status, "refunded");
    assert.equal((await record(db, order)).status, "refunded");
    assert.equal(
      (await db.query(`select status from public.payments`)).rows[0].status,
      "refunded",
    );
  }));

test("full refund requires operator MFA and cancels booking after provider verification", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await record(db, order);
    await asUser(db, f.admin);
    await assert.rejects(
      db.query(`select public.admin_prepare_refund($1,'Approved refund')`, [
        order.orderId,
      ]),
      /MFA/,
    );
    await db.query(
      `select set_config('request.jwt.claims','{"aal":"aal2"}',false)`,
    );
    await db.query(`select public.admin_prepare_refund($1,'Approved refund')`, [
      order.orderId,
    ]);
    assert.equal((await record(db, order, "CANCELED")).status, "refunded");
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "cancelled",
    );
  }));

test("meeting links require booking membership and an open entry window", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await record(db, order);
    const session = (
      await db.query(`select session_id from public.enrollments where id=$1`, [
        enrollment,
      ])
    ).rows[0].session_id;
    await asUser(db, f.teacher);
    await db.query(
      `select public.set_session_meeting($1,'https://meet.google.com/abc-defg-hij')`,
      [session],
    );
    await assert.rejects(
      db.query(
        `select public.set_session_meeting($1,'https://evil.example/meeting')`,
        [session],
      ),
      /check constraint/,
    );
    await asUser(db, f.student);
    const closed = (
      await db.query(`select public.session_access($1) value`, [session])
    ).rows[0].value;
    assert.equal(closed.meetingUrl, null);
    assert.equal(closed.canJoin, false);
    await db.query(
      `update public.lesson_sessions set scheduled_at=now()+interval '5 minutes' where id=$1`,
      [session],
    );
    const opened = (
      await db.query(`select public.session_access($1) value`, [session])
    ).rows[0].value;
    assert.equal(opened.canJoin, true);
    await asUser(db, f.other);
    await assert.rejects(
      db.query(`select public.session_access($1)`, [session]),
      /access denied/,
    );
    assert.equal(
      (
        await db.query(
          `select meeting_link from public.lesson_sessions where id=$1`,
          [session],
        )
      ).rows[0].meeting_link,
      null,
    );
  }));

test("attendance recorded before ending completes after ending and absence can be corrected", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await record(db, order);
    await asUser(db, f.teacher);
    await db.query(
      `insert into public.attendance_records(enrollment_id,status,recorded_by) values($1,'absent',$2)`,
      [enrollment, f.teacher],
    );
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "confirmed",
    );
    await db.query(
      `update public.lesson_sessions set scheduled_at=now()-interval '2 hours' where id=(select session_id from public.enrollments where id=$1)`,
      [enrollment],
    );
    await asUser(db, null, "service_role");
    await db.exec(`select public.maintain_reservations()`);
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "no_show",
    );
    await asUser(db, f.teacher);
    await db.query(
      `update public.attendance_records set status='present' where enrollment_id=$1`,
      [enrollment],
    );
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "completed",
    );
  }));

test("holiday blocks new reservations and invalid availability changes roll back atomically", () =>
  fixture(async (db, f) => {
    await asUser(db, f.teacher);
    await assert.rejects(
      db.query(`select public.save_teacher_availability($1,'{}')`, [
        JSON.stringify([
          { weekday: 1, start_time: "09:00", end_time: "12:00" },
          { weekday: 1, start_time: "11:00", end_time: "13:00" },
        ]),
      ]),
      /Overlapping/,
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.teacher_availability`,
        )
      ).rows[0].n,
      7,
    );
    await db.query(
      `insert into public.teacher_days_off(teacher_id,day) values($1,($2::timestamptz at time zone 'Asia/Seoul')::date)`,
      [f.teacher, f.start],
    );
    await asUser(db, f.student);
    await assert.rejects(reserve(db, f), /unavailable/);
  }));

test("demo and unapproved sellers are excluded from sale and anonymous search", () =>
  fixture(async (db, f) => {
    await asUser(db, f.admin);
    await db.query(
      `select public.admin_mark_demo($1,true,'Demo identity confirmed')`,
      [f.teacher],
    );
    await asUser(db, null, "anon");
    assert.equal(
      (await db.query(`select public.search_teachers() value`)).rows[0].value
        .total,
      0,
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query(`select count(*)::int n from public.teacher_profiles`))
        .rows[0].n,
      0,
    );
    await db.exec("reset role");
    await asUser(db, f.student);
    await assert.rejects(reserve(db, f), /not available/);
  }));

test("pending reservation cancellation is idempotent and closure is a request, not false erasure", () =>
  fixture(async (db, f) => {
    const id = await reserve(db, f);
    const args = [id, "cancel", "I no longer need this booking"];
    await db.query(`select public.request_booking_action($1,$2,$3)`, args);
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          id,
        ])
      ).rows[0].status,
      "cancelled",
    );
    const closure = (
      await db.query(
        `select public.request_account_closure('Please close my account') id`,
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query(
          `select public.request_account_closure('Please close my account') id`,
        )
      ).rows[0].id,
      closure,
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.profiles where id=$1`,
          [f.student],
        )
      ).rows[0].n,
      1,
    );
  }));

test("late approval for an expired order cannot take over a later reservation version", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await db.query(
      `update public.checkout_orders set status='expired' where id=$1`,
      [order.orderId],
    );
    await db.query(
      `update public.enrollments set status='cancelled' where id=$1`,
      [enrollment],
    );
    await asUser(db, f.student);
    const newId = await reserve(db, f);
    assert.equal(newId, enrollment);
    const newer = (
      await db.query(`select public.prepare_checkout($1) value`, [enrollment])
    ).rows[0].value;
    await record(db, newer);
    assert.equal((await record(db, order)).status, "refund_pending");
    assert.equal((await record(db, order, "CANCELED")).status, "refunded");
    assert.equal(
      (
        await db.query(`select status from public.enrollments where id=$1`, [
          enrollment,
        ])
      ).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.payments where status='succeeded'`,
        )
      ).rows[0].n,
      1,
    );
  }));

test("coupon holds prevent reuse while confirmation is in flight", () =>
  fixture(async (db, f) => {
    const enrollment = await reserve(db, f);
    await db.query(`select public.accept_service_policies('2026-11-16')`);
    const coupon = (
      await db.query(
        `insert into public.coupons(code,title,discount_type,discount_value) values('HALF','Half','percent',50) returning id`,
      )
    ).rows[0].id;
    const own = (
      await db.query(
        `insert into public.user_coupons(user_id,coupon_id) values($1,$2) returning id`,
        [f.student, coupon],
      )
    ).rows[0].id;
    const order = (
      await db.query(`select public.prepare_checkout($1,$2) value`, [
        enrollment,
        own,
      ])
    ).rows[0].value;
    assert.equal(order.amount, 5000);
    await assert.rejects(
      db.query(`update public.user_coupons set status='used' where id=$1`, [
        own,
      ]),
      /reserved/,
    );
    await asUser(db, null, "service_role");
    await db.query(
      `select public.begin_payment_confirmation($1,'coupon-key')`,
      [order.orderId],
    );
    await asUser(db, f.student);
    await assert.rejects(
      db.query(`update public.user_coupons set status='used' where id=$1`, [
        own,
      ]),
      /reserved/,
    );
    await asUser(db, null, "service_role");
    await db.query(`select public.record_provider_payment($1,$2)`, [
      order.orderId,
      JSON.stringify({
        ...payment(order),
        paymentKey: "coupon-key",
        totalAmount: 5000,
        balanceAmount: 5000,
      }),
    ]);
    assert.equal(
      (
        await db.query(`select status from public.user_coupons where id=$1`, [
          own,
        ])
      ).rows[0].status,
      "used",
    );
  }));

test("rescheduling changes both session counts and preserves the verified payment", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await record(db, order);
    const original = (
      await db.query(`select session_id from public.enrollments where id=$1`, [
        enrollment,
      ])
    ).rows[0].session_id;
    await asUser(db, f.student);
    const request = (
      await db.query(
        `select public.request_booking_action($1,'reschedule','Please move this class by two hours') id`,
        [enrollment],
      )
    ).rows[0].id;
    await asUser(db, f.admin);
    await db.query(
      `select public.admin_resolve_booking($1,$2::timestamptz+interval '2 hours','Teacher and student agreed to the new time')`,
      [request, f.start],
    );
    const current = (
      await db.query(
        `select session_id,status from public.enrollments where id=$1`,
        [enrollment],
      )
    ).rows[0];
    assert.notEqual(current.session_id, original);
    assert.equal(current.status, "confirmed");
    assert.equal(
      (
        await db.query(
          `select enrolled_count from public.lesson_sessions where id=$1`,
          [original],
        )
      ).rows[0].enrolled_count,
      0,
    );
    assert.equal(
      (
        await db.query(
          `select enrolled_count from public.lesson_sessions where id=$1`,
          [current.session_id],
        )
      ).rows[0].enrolled_count,
      1,
    );
    assert.equal(
      (await db.query(`select status from public.payments`)).rows[0].status,
      "succeeded",
    );
  }));

test("shared materials are scoped to enrolled students and cannot spoof another owner path", () =>
  fixture(async (db, f) => {
    const { enrollment, order } = await prepare(db, f);
    await record(db, order);
    const session = (
      await db.query(`select session_id from public.enrollments where id=$1`, [
        enrollment,
      ])
    ).rows[0].session_id;
    await asUser(db, f.teacher);
    await assert.rejects(
      db.query(
        `insert into public.materials(teacher_id,file_name,file_url) values($1,'x.pdf','someone-else/private.pdf')`,
        [f.teacher],
      ),
      /owner mismatch/,
    );
    const path = `${f.teacher}/lesson.pdf`;
    const material = (
      await db.query(
        `insert into public.materials(teacher_id,file_name,file_url) values($1,'lesson.pdf',$2) returning id`,
        [f.teacher, path],
      )
    ).rows[0].id;
    await db.query(`select public.share_session_material($1,$2,true)`, [
      session,
      material,
    ]);
    await asUser(db, f.student);
    assert.equal(
      (
        await db.query(`select public.can_download_material($1) allowed`, [
          path,
        ])
      ).rows[0].allowed,
      true,
    );
    await asUser(db, f.other);
    assert.equal(
      (
        await db.query(`select public.can_download_material($1) allowed`, [
          path,
        ])
      ).rows[0].allowed,
      false,
    );
    await assert.rejects(
      db.query(`select public.session_material_list($1)`, [session]),
      /access denied/,
    );
  }));

test("restrictions block new activity and can be lifted without erasing transaction history", () =>
  fixture(async (db, f) => {
    await asUser(db, f.admin);
    await db.query(
      `select public.admin_set_restriction($1,true,null,'Verified abuse report')`,
      [f.student],
    );
    await asUser(db, f.student);
    await assert.rejects(reserve(db, f), /restricted/);
    assert.equal(
      (
        await db.query(`select public.account_is_active($1) active`, [
          f.student,
        ])
      ).rows[0].active,
      false,
    );
    await asUser(db, f.admin);
    await db.query(
      `select public.admin_set_restriction($1,false,null,'Appeal accepted and restriction lifted')`,
      [f.student],
    );
    await asUser(db, f.student);
    assert.ok(await reserve(db, f));
  }));

test("chat blocks enforce both directions and invalid attachments never become messages", () =>
  fixture(async (db, f) => {
    const room = (
      await db.query(
        `insert into public.chat_rooms(teacher_id,student_id) values($1,$2) returning id`,
        [f.teacher, f.student],
      )
    ).rows[0].id;
    await db.query(`select public.set_chat_block($1,true)`, [f.teacher]);
    await asUser(db, f.teacher);
    await assert.rejects(
      db.query(
        `insert into public.chat_messages(room_id,sender_id,text) values($1,$2,'hello')`,
        [room, f.teacher],
      ),
      /blocked/,
    );
    await asUser(db, f.student);
    await db.query(`select public.set_chat_block($1,false)`, [f.teacher]);
    await assert.rejects(
      db.query(
        `insert into public.chat_messages(room_id,sender_id,type,file_url) values($1,$2,'file','javascript:bad')`,
        [room, f.student],
      ),
      /Text messages/,
    );
    await db.query(
      `insert into public.chat_messages(room_id,sender_id,text) values($1,$2,'hello')`,
      [room, f.student],
    );
    assert.equal(
      (await db.query(`select count(*)::int n from public.chat_messages`))
        .rows[0].n,
      1,
    );
  }));
