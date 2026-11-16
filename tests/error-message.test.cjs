const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/error-message.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { errorMessage } = context.exports;

test('duplicate account errors explain login instead of showing server English', () => {
  for (const input of ['User already registered&#x20;', new Error('User already registered'), {code:'user_already_exists'}, {code:'email_exists'}]) {
    assert.match(errorMessage(input), /이미 가입된 이메일/);
    assert.match(errorMessage(input), /기존 계정으로 로그인/);
    assert.doesNotMatch(errorMessage(input), /already|&#/);
  }
});
test('known failures give distinct actionable Korean messages', () => {
  for (const [input, expected] of [
    [{code:'invalid_credentials'}, /이메일 또는 비밀번호/],
    [{code:'email_not_confirmed'}, /인증 메일/],
    [{code:'weak_password'}, /보안 조건/],
    [{code:'over_email_send_rate_limit'}, /잠시 기다린/],
    [{status:429}, /잠시 기다린/],
    ['Failed to fetch', /인터넷 연결/],
    [{code:'session_expired'}, /다시 로그인/],
    ['Email address invalid', /이메일 주소 형식/],
  ]) assert.match(errorMessage(input), expected);
});
test('unknown technical errors are hidden and existing Korean guidance is retained', () => {
  assert.equal(errorMessage('database error: secret_table', '가입을 완료하지 못했습니다.'), '가입을 완료하지 못했습니다.');
  assert.equal(errorMessage('이미 마감된 수업입니다. 다른 일정을 선택해주세요.'), '이미 마감된 수업입니다. 다른 일정을 선택해주세요.');
  assert.doesNotMatch(errorMessage(null), /undefined|null/);
});
