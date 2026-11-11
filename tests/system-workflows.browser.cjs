// Actual React components, local RPC fixtures only. No real account or financial writes.
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3005';
const sources = {
  settings: 'src/app/(main)/notification-settings/page.tsx',
  payment: 'src/app/(main)/student/payment/page.tsx',
  booking: 'src/app/(main)/student/booking/confirm/page.tsx',
  withdraw: 'src/app/(main)/teacher/settlement/page.tsx',
  '@/components/shared/ListPager': 'src/components/shared/ListPager.tsx',
};
const code = Object.entries(sources).map(([id, path]) => `modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText}};`).join('\n');
async function mount(page, mode, amount = 0) {
  await page.goto(base + '/__integrity_fixture');
  await page.setContent(`<html lang="ko" data-design="gossaem"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${base}/_next/static/css/app/layout.css"></head><body><div id="fixture"></div></body></html>`);
  await page.addScriptTag({path:require.resolve('react').replace(/index\.js$/,'umd/react.development.js')});
  await page.addScriptTag({path:require.resolve('react-dom').replace(/index\.js$/,'umd/react-dom.development.js')});
  await page.evaluate(({code,mode,amount}) => {
    const R=window.React, prefs={lesson_start:true,chat_message:true,marketing:false};
    window.fixtureCalls=[]; window.fixtureNavigation=[];
    const rpc=async(name,args)=>{
      window.fixtureCalls.push({name,args});
      if(name==='set_notification_preference'){prefs[args.p_key]=args.p_enabled;return {error:null};}
      if(name==='lesson_booking_slots')return {data:[{start:args.p_day+'T10:30:00+09:00',duration:50}],error:null};
      throw Error('Unexpected RPC '+name);
    };
    const client={rpc,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{...prefs},error:null})})})})};
    const imports={
      react:R,'react/jsx-runtime':{jsx:(type,props,key)=>R.createElement(type,{...props,key}),jsxs:(type,props,key)=>R.createElement(type,{...props,key}),Fragment:R.Fragment},
      'next/link':{default:({href,children,...props})=>R.createElement('a',{href,...props},children)},
      'next/navigation':{useRouter:()=>({push:url=>window.fixtureNavigation.push(url),back(){}}),useSearchParams:()=>new URLSearchParams('enrollment=fixture-enrollment&teacher=fixture-teacher')},
      '@/stores/auth-store':{useAuthStore:selector=>selector({user:fixtureUser,isHydrated:true,activeRole:'student'})},
      '@/components/shared/Toast':{showToast:message=>window.fixtureCalls.push({name:'toast',message})},
      '@/lib/supabase/client':{createClient:()=>client},
      '@/lib/queries/teachers':{getTeacherDetail:async()=>({name:'샘플',headline:'한국어 선생님'}),listWishlistedTeacherIds:async()=>new Set(),addWishlist:async()=>{},removeWishlist:async()=>{}},
      '@/lib/queries/bookings':{
        listTeacherLessons:async()=>[{id:'fixture-lesson',title:'샘플 회화 수업',price:0,type:'1on1',capacity:1}],hasUsedFreeTrial:async()=>false,
        createBookingDraft:async input=>{window.fixtureCalls.push({name:'reserve',input});return {enrollmentId:'fixture-enrollment'};},
        getEnrollmentDetail:async()=>({id:'fixture-enrollment',teacherId:'fixture-teacher',teacherName:'샘플',sessionTitle:'회화 수업',scheduledAt:'2026-12-10T01:30:00Z',durationMinutes:50,price:amount,currency:'KRW'}),
        confirmPayment:async input=>{window.fixtureCalls.push({name:'checkout',input});},
      },
      '@/lib/queries/coupons':{listMyCoupons:async()=>[],computeDiscount:()=>0},
      '@/lib/queries/settlement':{
        getBalanceSummary:async()=>({totalSettled:10000,totalWithdrawn:0,availableBalance:10000,totalGross:12500,totalFee:2500,thisMonthSettled:10000}),
        getSettlementAccount:async()=>({bankName:'Fixture'}),
        listSettlements:async()=>[{id:'settlement',periodStart:'2026-09-01',periodEnd:'2026-09-07',netAmount:10000,status:'paid'}],
        listWithdrawals:async()=>[],requestWithdrawal:async(...args)=>window.fixtureCalls.push({name:'withdraw',args}),
      },
    };
    const fixtureUser={id:'fixture-user',role:'student'};
    const modules={},cache={};new Function('modules',code)(modules);
    const req=id=>{if(imports[id])return imports[id];if(!cache[id]){cache[id]={};modules[id](cache[id],req);}return cache[id];};
    const Component=req(mode).default;const root=window.ReactDOM.createRoot(document.getElementById('fixture'));let revision=0;
    window.remountFixture=()=>root.render(R.createElement(Component,{key:++revision}));
    window.remountFixture();
  },{code,mode,amount});
}
(async()=>{
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    await page.route(base+'/__integrity_fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
    await mount(page,'settings');
    await page.getByText('알림 설정을 불러오는 중...').waitFor({state:'hidden'});
    await page.getByRole('switch',{name:'채팅 메시지 알림'}).click();
    await page.waitForFunction(()=>document.querySelector('[aria-label="채팅 메시지 알림"]').getAttribute('aria-checked')==='false');
    await page.evaluate(()=>window.remountFixture());
    await page.getByText('알림 설정을 불러오는 중...').waitFor({state:'hidden'});
    assert.equal(await page.getByRole('switch',{name:'채팅 메시지 알림'}).getAttribute('aria-checked'),'false');
    console.log('PASS notification preference save and remount');

    await mount(page,'payment',10000);
    await page.getByRole('button',{name:'유료 결제 준비 중'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'유료 결제 준비 중'}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.fixtureCalls.filter(call=>call.name==='checkout').length),0);
    await page.screenshot({path:'.tmp/paid-checkout-390.png',fullPage:true,animations:'disabled'});
    await mount(page,'payment',0);
    await page.getByRole('button',{name:'무료 예약 확정하기'}).click();
    await page.waitForFunction(()=>window.fixtureNavigation.some(url=>url.includes('/student/confirmation')));
    console.log('PASS paid checkout blocked and free confirmation path');

    await mount(page,'booking');
    await page.getByRole('button',{name:'10:30',exact:true}).click();
    await page.getByRole('button',{name:'결제 단계로 계속하기'}).click();
    await page.waitForFunction(()=>window.fixtureCalls.some(call=>call.name==='reserve'));
    const start=await page.evaluate(()=>window.fixtureCalls.find(call=>call.name==='reserve').input.scheduledAt);
    assert.ok(start.endsWith('T01:30:00.000Z'),'Seoul time must map to UTC');
    console.log('PASS actual availability slots and Korean-time reservation');

    await mount(page,'withdraw');
    await page.getByRole('heading',{name:'정산 적립 내역'}).waitFor();
    await page.getByText('10,000원 · 적립 완료').waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Withdrawal page overflows mobile viewport');
    await page.screenshot({path:'.tmp/withdrawal-390.png',fullPage:true,animations:'disabled'});
    console.log('PASS real balance/ledger presentation and mobile layout');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
