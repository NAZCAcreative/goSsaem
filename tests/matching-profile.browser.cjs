// Real editor/query/components with isolated persistence fixtures. RLS/ranking tested in SQL.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://localhost:3006';
const files={editor:'src/components/features/MatchingProfileEditor.tsx',recommendations:'src/components/features/LessonRecommendations.tsx','./LessonCard':'src/components/features/LessonCard.tsx','@/lib/queries/matching':'src/lib/queries/matching.ts','@/lib/queries/lessonCatalog':'src/lib/queries/lessonCatalog.ts'};
const code=Object.entries(files).map(([name,path])=>`modules[${JSON.stringify(name)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText}};`).join('\n');
async function mount(page){
 const response=await page.request.get(base+'/login');const html=await response.text();
 const urls=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(s=>/rel="stylesheet"/.test(s)).map(s=>new URL(s.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'),base).href).filter(s=>s.startsWith(base));
 assert.ok(urls.length);const css=await Promise.all(urls.map(async url=>(await page.request.get(url)).text()));
 await page.goto('about:blank');await page.setContent('<html lang="ko" data-design="gossaem"><body><div id="fixture"></div></body></html>');await page.addStyleTag({content:css.join('\n')});
 await page.addScriptTag({path:require.resolve('react').replace(/index\.js$/,'umd/react.development.js')});await page.addScriptTag({path:require.resolve('react-dom').replace(/index\.js$/,'umd/react-dom.development.js')});await page.evaluate(()=>{window.react=window.React;});await page.addScriptTag({path:'node_modules/lucide-react/dist/umd/lucide-react.js'});
 await page.evaluate(({code})=>{
  const R=window.React;window.user={id:'teacher',role:'teacher'};window.profiles={};window.failLoad=false;window.failSave=false;window.failRecommend=false;let version=0;
  const client={from:()=>{let payload=null,op='',filters={};const q={select:()=>q,eq:(key,value)=>{filters[key]=value;return q;},insert:value=>{payload=value;op='insert';return q;},update:value=>{payload=value;op='update';return q;},maybeSingle:async()=>window.failLoad?{error:{message:'offline'}}:{data:window.profiles[filters.profile_id]||null},single:async()=>{const id=payload.profile_id||filters.profile_id;if(window.failSave||op==='update'&&window.profiles[id]?.updated_at!==filters.updated_at)return {error:{message:'conflict'}};const row={...payload,profile_id:id,updated_at:String(++version)};window.profiles[id]=row;return {data:row};}};return q;},rpc:async()=>window.failRecommend?{error:{message:'offline'}}:{data:window.profiles.student?.matching_enabled&&window.profiles.teacher?.matching_enabled?[{lesson:{id:'lesson1',teacher_id:'teacher',teacher_name:'샘플',title:'여행에서 쓰는 한국어',description:'카페와 여행에서 쓰는 표현',type:'group',category:'여행',level:'초급',price:15000,currency:'KRW',duration_minutes:50,capacity:4,image_url:null,scheduling_mode:'request',sessions:[]},reasons:['관심사: 여행','학습 목표: 여행 회화','수업 방식: 대화 중심']}]:[]}};
  const imports={react:R,'react/jsx-runtime':{Fragment:R.Fragment,jsx:(type,props,key)=>R.createElement(type,{...props,key}),jsxs:(type,props,key)=>R.createElement(type,{...props,key})},'lucide-react':window.LucideReact,'next/link':{default:props=>R.createElement('a',props)},'@/lib/supabase/client':{createClient:()=>client},'@/stores/auth-store':{useAuthStore:selector=>selector({user:window.user})}};
  const modules={},cache={};new Function('modules',code)(modules);const req=id=>{if(imports[id])return imports[id];if(!cache[id]){cache[id]={};modules[id](cache[id],req);}return cache[id];};
  const root=window.ReactDOM.createRoot(document.getElementById('fixture'));let revision=0;window.renderMode=(mode='editor')=>{const m=req(mode);root.render(R.createElement(m.MatchingProfileEditor||m.LessonRecommendations,{key:++revision}));};window.renderMode();
 },{code});
}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('.tmp/matching',{recursive:true});
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:950});await mount(page);
  await page.getByRole('button',{name:'언어 추가',exact:true}).click();await page.getByLabel('언어 수준 1',{exact:true}).selectOption('native');
  await page.getByRole('button',{name:'언어 추가',exact:true}).click();await page.getByLabel('언어 2',{exact:true}).selectOption('en');await page.getByLabel('언어 수준 2',{exact:true}).selectOption('C1');
  for(const name of ['여행','여행 회화','대화 중심','차분한','초급'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByLabel('MBTI',{exact:true}).selectOption('ENFP');await page.getByLabel('이 정보를 활용해 내 수업 추천 허용',{exact:true}).check();
  await page.getByRole('button',{name:'매칭 프로필 저장'}).click();await page.getByText('저장되었습니다.',{exact:true}).waitFor();
  await page.evaluate(()=>window.renderMode());await page.getByLabel('MBTI',{exact:true}).waitFor();assert.equal(await page.getByLabel('MBTI',{exact:true}).inputValue(),'ENFP');assert.equal(await page.getByLabel('언어 수준 2',{exact:true}).inputValue(),'C1');
  await page.getByLabel('MBTI',{exact:true}).selectOption('ISFJ');await page.evaluate(()=>{window.failSave=true;});await page.getByRole('button',{name:'매칭 프로필 저장'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('MBTI',{exact:true}).inputValue(),'ISFJ');await page.evaluate(()=>{window.failSave=false;});await page.getByRole('button',{name:'매칭 프로필 저장'}).click();await page.getByText('저장되었습니다.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`.tmp/matching/teacher-${width}.png`,fullPage:true});
  await page.evaluate(()=>{window.user={id:'student',role:'student'};window.renderMode();});await page.getByRole('button',{name:'언어 추가',exact:true}).click();await page.getByLabel('언어 수준 1',{exact:true}).selectOption('A2');await page.getByLabel('선호 소통 언어').selectOption('en');
  for(const name of ['여행','여행 회화','대화 중심'])await page.getByRole('button',{name,exact:true}).click();await page.getByLabel('이 정보를 활용한 맞춤 수업 추천 사용',{exact:true}).check();await page.getByRole('button',{name:'매칭 프로필 저장'}).click();await page.getByText('저장되었습니다.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'맞춤 추천 확인 →'}).getAttribute('href'),'/student/home');
  await page.evaluate(()=>window.renderMode('recommendations'));await page.getByRole('heading',{name:'여행에서 쓰는 한국어',exact:true}).waitFor();await page.getByText('관심사: 여행',{exact:true}).waitFor();assert.equal(await page.getByText('ISFJ',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`.tmp/matching/recommendations-${width}.png`,fullPage:true});
  await page.evaluate(()=>{window.failRecommend=true;window.renderMode('recommendations');});await page.getByRole('alert').waitFor();await page.evaluate(()=>{window.failRecommend=false;});await page.getByRole('button',{name:'추천 다시 불러오기'}).click();await page.getByRole('heading',{name:'여행에서 쓰는 한국어',exact:true}).waitFor();
  await page.evaluate(()=>{window.profiles.teacher.matching_enabled=false;window.renderMode('recommendations');});await page.getByText('아직 조건이 맞는 공개 수업이 없습니다.',{exact:false}).waitFor();
  await page.evaluate(()=>{window.failLoad=true;window.renderMode();});await page.getByRole('button',{name:'다시 불러오기'}).waitFor();assert.equal(await page.getByRole('button',{name:'매칭 프로필 저장'}).count(),0);
  console.log(`Matching ${width}px: languages/levels, tags, MBTI, persistence, failed save retention, explanations, consent and error states passed`);
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
