// Real Next pages with public catalogue RPC fixtures. SQL privacy/filter tests run separately.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://localhost:3006';
const first='11111111-1111-4111-8111-111111111111';
const teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const start=new Date(Date.now()+3*86400000).toISOString();
const day=new Date(Date.parse(start)+9*3600000).toISOString().slice(0,10);
const common={teacher_id:teacher,teacher_name:'수업 선생님',description:'여행에서 쓰는 주문과 길 찾기 표현',category:'여행',level:'초급',price:15000,currency:'KRW',duration_minutes:60,capacity:4,image_url:null,scheduling_mode:'fixed',supported_languages:['한국어'],next_start:start};
const lessons=[{...common,id:first,title:'카페에서 주문하는 여행 회화',type:'group',sessions:[{id:'session1',start,duration:60,capacity:4,remaining:2}]},{...common,id:'22222222-2222-4222-8222-222222222222',title:'노래로 배우는 표현',description:'노래 가사 배우기',category:'음악',type:'group',price:25000,sessions:[],next_start:null},{...common,id:'33333333-3333-4333-8333-333333333333',title:'맞춤 여행 회화',type:'1on1',capacity:1,scheduling_mode:'request',sessions:[]}];
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultNavigationTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const visit=url=>page.goto(url,{waitUntil:'domcontentloaded'});
  let fail=false;
  await page.route('**/rest/v1/rpc/public_lesson_catalog',async route=>{
   if(fail)return route.fulfill({status:500,json:{message:'fixture unavailable'}});
   const body=route.request().postDataJSON(),f=body.p_filters||{};
   let items=body.p_lesson ? lessons.filter(l=>l.id===body.p_lesson) : lessons.filter(l=>(!f.type||f.type==='all'||l.type===f.type)&&(!f.q||[l.title,l.category,l.description].join(' ').includes(f.q))&&(!f.category||l.category===f.category)&&(!f.level||l.level===f.level)&&(!f.day||l.sessions.some(s=>s.remaining>0&&new Date(Date.parse(s.start)+9*3600000).toISOString().slice(0,10)===f.day))&&(!f.scheduled||l.sessions.some(s=>s.remaining>0))&&(f.price!=='free'||l.price===0));
   if(f.sort==='price')items.sort((a,b)=>a.price-b.price);
   return route.fulfill({json:{items,total:items.length,categories:['여행','음악'],levels:['초급']}});
  });
  fs.mkdirSync('.tmp/course-discovery',{recursive:true});
  for(const width of [320,390,1024,1440]){
   await page.setViewportSize({width,height:900});
   await visit(base+'/student/search');
   await page.getByRole('heading',{name:'카페에서 주문하는 여행 회화',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'그룹수업',exact:true}).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('article').count(),2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:`.tmp/course-discovery/search-${width}.png`,fullPage:true});
  }
  await page.getByRole('searchbox').fill('카페');await page.getByRole('button',{name:'수업 검색',exact:true}).click();
  await page.waitForURL('**/student/search?q=*');await page.getByText('1개의 수업',{exact:true}).waitFor();
  await page.getByLabel('주제',{exact:true}).selectOption('여행');await page.waitForURL('**category=*');
  assert.equal(new URL(page.url()).searchParams.get('q'),'카페');
  await page.reload();await page.getByRole('heading',{name:'카페에서 주문하는 여행 회화',exact:true}).waitFor();
  assert.equal(await page.getByRole('searchbox').inputValue(),'카페');
  await page.getByLabel('수업 날짜',{exact:true}).fill(day);
  await page.waitForURL('**day=*');await page.getByText('1개의 수업',{exact:true}).waitFor();
  await page.locator('article a').click();await page.waitForURL('**/lessons/**');
  await page.getByRole('heading',{name:'참여할 일정 선택'}).waitFor();
  const booking=new URL(await page.getByRole('link',{name:'이 일정으로 예약'}).getAttribute('href'),base);
  assert.equal(booking.searchParams.get('teacher'),teacher);assert.equal(booking.searchParams.get('lesson'),first);assert.equal(booking.searchParams.get('start'),start);
  for(const width of [320,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`.tmp/course-discovery/detail-${width}.png`,fullPage:true});}
  await page.getByRole('link',{name:'이 일정으로 예약'}).click();await page.waitForURL('**/login?**');
  const next=new URL(new URL(page.url()).searchParams.get('next'),base);assert.equal(next.searchParams.get('lesson'),first);assert.equal(next.searchParams.get('start'),start);
  await page.goto(base+'/student/search?type=1on1');await page.getByRole('heading',{name:'맞춤 여행 회화',exact:true}).waitFor();assert.equal(await page.locator('article').count(),1);
  await page.getByRole('button',{name:'무료 체험',exact:true}).click();await page.getByRole('heading',{name:'조건에 맞는 수업이 아직 없어요'}).waitFor();
  fail=true;await visit(base+'/student/search');await page.getByRole('alert').filter({hasText:'수업을 불러오지 못했습니다'}).waitFor();assert.equal(await page.getByRole('heading',{name:'조건에 맞는 수업이 아직 없어요'}).count(),0);
  fail=false;await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.getByRole('heading',{name:'카페에서 주문하는 여행 회화',exact:true}).waitFor();
  await page.goto(base+'/lessons/44444444-4444-4444-8444-444444444444');await page.getByRole('heading',{name:'현재 공개된 수업이 아닙니다'}).waitFor();
  for(const width of [320,1440]){
   await page.setViewportSize({width,height:900});await visit(base+'/student/home');
   await page.getByRole('heading',{name:'함께 배우는 그룹수업',exact:true}).waitFor();
   await page.getByRole('heading',{name:'카페에서 주문하는 여행 회화',exact:true}).waitFor();
   assert.equal(await page.getByRole('navigation',{name:'배우는 방법'}).getByRole('link',{name:'1:1 수업 나의 목표에 맞게'}).getAttribute('href'),'/student/search?type=1on1');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:`.tmp/course-discovery/home-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('Course discovery: 320–1440px, search/filter URLs, reload, detail, exact booking/login destination, error/retry and hidden detail passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
