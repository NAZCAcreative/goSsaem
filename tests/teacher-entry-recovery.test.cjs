const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(responses) {
 const calls=[];
 const context={exports:{},require:()=>({createClient:()=>({rpc:async(name)=>{calls.push(name);return responses.shift();}})})};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/queries/teacherApplications.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {...context.exports,calls};
}
test('missing application is prepared before showing the application form',async()=>{
 const draft={status:'not_applied',updated_at:'2026-11-12T00:00:00Z'};
 const f=fixture([{data:null,error:null},{data:draft,error:null}]);
 assert.deepEqual(await f.getMyTeacherApplication(),draft);
 assert.deepEqual(f.calls,['my_teacher_application','ensure_my_teacher_application']);
});
test('existing review states are read without resetting them',async()=>{
 for(const status of ['review_pending','needs_changes','review_rejected','approved']){
  const f=fixture([{data:{status},error:null}]);
  assert.equal((await f.getMyTeacherApplication()).status,status);
  assert.deepEqual(f.calls,['my_teacher_application']);
 }
});
test('read failures and failed recovery do not become fabricated drafts',async()=>{
 const failedRead=fixture([{data:null,error:{message:'offline'}}]);
 await assert.rejects(failedRead.getMyTeacherApplication(),/심사 상태/);
 assert.deepEqual(failedRead.calls,['my_teacher_application']);
 const failedRecovery=fixture([{data:null,error:null},{data:null,error:{message:'offline'}}]);
 await assert.rejects(failedRecovery.getMyTeacherApplication(),/신청 준비/);
});
