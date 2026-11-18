const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createTestDb,asUser}=require('./helpers/local-db.cjs');

test('showcase visibility, style levels and referral attribution follow owner choices',async()=>{
  const db=await createTestDb();
  const teacher=randomUUID(), student=randomUUID(), stranger=randomUUID();
  try{
    for(const [id,role] of [[teacher,'teacher'],[student,'student'],[stranger,'student']]){
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",[id,id+'@example.test',{role,name:role}]);
    }
    await db.query("insert into public.teacher_profiles(profile_id) values($1) on conflict do nothing",[teacher]);
    await db.query("update public.teacher_applications set status='review_pending' where profile_id=$1",[teacher]);
    await db.query("update public.teacher_applications set status='approved' where profile_id=$1",[teacher]);
    await db.exec('set role authenticated');await asUser(db,teacher);
    const token=(await db.query('select public.my_teacher_share_token() token')).rows[0].token;
    await db.query("insert into public.teacher_portfolio_entries(teacher_id,kind,title,is_public,style_level) values($1,'movie','Private',false,null),($1,'drama','Public',true,null),($1,'pace','Speed',true,4)",[teacher]);
    await assert.rejects(db.query("insert into public.teacher_portfolio_entries(teacher_id,kind,title,style_level) values($1,'mood','Invalid',7)",[teacher]));
    await asUser(db,student);
    assert.deepEqual((await db.query('select title from public.teacher_portfolio_entries where teacher_id=$1 order by title',[teacher])).rows.map(x=>x.title),['Public','Speed']);
    for(let i=0;i<2;i++)await db.query('select public.record_profile_activity($1,$2)',[teacher,token]);
    await asUser(db,stranger);
    await db.query('select public.record_profile_activity($1,$2)',[teacher,randomUUID()]);
    await asUser(db,teacher);
    assert.deepEqual((await db.query('select public.my_profile_activity() stats')).rows[0].stats,{visitors:2,shared:1,clicked:0,booked:0});
    await db.query("update public.teacher_portfolio_entries set is_public=false where teacher_id=$1",[teacher]);
    await asUser(db,student);
    assert.equal((await db.query('select count(*)::int n from public.teacher_portfolio_entries where teacher_id=$1',[teacher])).rows[0].n,0);
  } finally {await db.close()}
});