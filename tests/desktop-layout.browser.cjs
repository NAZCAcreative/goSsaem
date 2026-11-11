// Real page components and generated app CSS; isolated account/data fixtures.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.TEST_BASE_URL||'http://localhost:3007';
const files={details:'src/app/(main)/teacher/lessons/new/details/page.tsx',confirm:'src/app/(main)/teacher/lessons/new/confirm/page.tsx',chat:'src/app/(main)/teacher/chat/[id]/page.tsx',tasks:'src/components/features/teacher/TeacherTasks.tsx'};
const code=Object.entries(files).map(([id,path])=>`modules[${JSON.stringify(id)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText}};`).join('\n');
async function mount(page,mode,css){
 await page.goto('about:blank');await page.setContent('<html lang="ko" data-design="gossaem"><body><div class="global-top-nav" style="height:64px"></div><div class="lg:pl-56"><div id="fixture"></div></div></body></html>');
 await page.addStyleTag({content:css});
 await page.addScriptTag({path:require.resolve('react').replace(/index\.js$/,'umd/react.development.js')});
 await page.addScriptTag({path:require.resolve('react-dom').replace(/index\.js$/,'umd/react-dom.development.js')});
 await page.evaluate(()=>{window.react=window.React;});await page.addScriptTag({path:'node_modules/lucide-react/dist/umd/lucide-react.js'});
 await page.evaluate(({code,mode})=>{
  const R=window.React;window.calls=[];window.deleteAllowed=false;
  const listeners=new Set();
  let draft={type:'group',capacity:2,title:'음악으로 배우는 한국어',category:'음악',level:'초급',language:'한국어',supportedLanguages:['한국어','영어'],duration:50,date:'2026-12-15',startTime:'10:00',endTime:'10:50',price:10000,description:'음악과 한국 문화를 함께 배우는 한국어 수업입니다.',weekdays:[1,3],schedulingMode:'fixed',hasTargetAudience:true,imageUrl:'',videoUrl:'',setField(key,value){draft={...draft,[key]:value};listeners.forEach(notify=>notify());},reset(){}};
  const hook=state=>select=>select?select(state):state;
  const imports={react:R,'react/jsx-runtime':{jsx:(type,props,key)=>R.createElement(type,{...props,key}),jsxs:(type,props,key)=>R.createElement(type,{...props,key}),Fragment:R.Fragment},'lucide-react':window.LucideReact,
   'next/link':{default:({href,children,...rest})=>R.createElement('a',{href,...rest},children)},'next/navigation':{useRouter:()=>({push:url=>window.calls.push(url)})},
   '@/components/shared/AlertDialog':{showWarning:message=>window.calls.push(message),showError:message=>window.calls.push(message),showConfirm:async()=>window.deleteAllowed},
   '@/components/shared/PageLoading':{PageLoading:()=>R.createElement('p',null,'불러오는 중')},
   '@/stores/auth-store':{useAuthStore:hook({user:{id:'teacher',role:'teacher'},isHydrated:true})},
   '@/stores/lesson-draft-store':{useLessonDraftStore:select=>{const state=R.useSyncExternalStore(notify=>{listeners.add(notify);return()=>listeners.delete(notify);},()=>draft);return select?select(state):state;}},
   '@/stores/lesson-config-store':{useLessonConfigStore:hook({languages:[],supportedLanguages:[],durations:[],categories:[],levels:[]}),DEFAULT_SUPPORTED_LANGUAGES:[{label:'한국어',isActive:true},{label:'영어',isActive:true}]},
   '@/lib/lessonOptions':{LESSON_CATEGORIES:['음악','여행'],LESSON_LEVELS:['초급','중급'],LESSON_LANGUAGES:['한국어','영어']},
   '@/lib/queries/teacherLessons':{createTeacherLessonWithSession:async()=>{throw Error('No real writes');}},
   '@/lib/queries/chat':{getChatRoomInfo:async()=>({id:'room',otherUserName:'학생',otherUserId:'student'}),listMessages:async()=>[{id:'message',senderId:'student',text:'오늘 수업에서 배운 표현을 복습하고 있어요.',createdAt:new Date().toISOString()}],markRoomRead:async()=>{},subscribeToMessages:()=>()=>{},sendMessage:async()=>{}},
   '@/lib/queries/teacherTools':{listTeacherTasks:async()=>[{id:'task1',title:'음악 수업 자료 준비',is_done:false,due_date:'2026-12-15'},{id:'task2',title:'학생 피드백 작성',is_done:false,due_date:null}],toggleTeacherTask:async(_,task)=>({...task,is_done:!task.is_done}),deleteTeacherTask:async()=>{window.calls.push('deleted');},createTeacherTask:async()=>{}}
  };
  const modules={};new Function('modules',code)(modules);const exports={};modules[mode](exports,id=>{if(!imports[id])throw Error('Missing mock '+id);return imports[id];});
  const Component=exports.default||exports.TeacherTasks;
  window.ReactDOM.createRoot(document.getElementById('fixture')).render(R.createElement(Component,{params:{id:'room'}}));
 },{code,mode});
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let css;
  if(process.env.TEST_CSS_DIR){css=fs.readdirSync(process.env.TEST_CSS_DIR).filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(require('path').join(process.env.TEST_CSS_DIR,name),'utf8')).join('\n');}
  else {
  const response=await page.request.get(base+'/login');const html=await response.text();
  const cssUrls=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(s=>s.includes('rel="stylesheet"')).map(s=>new URL(s.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'),base).href).filter(s=>s.startsWith(base));
  assert.ok(cssUrls.length);css=(await Promise.all(cssUrls.map(async url=>(await page.request.get(url)).text()))).join('\n');
  }
  fs.mkdirSync('.tmp/desktop-layout',{recursive:true});
  for(const width of [390,1024,1440])for(const mode of ['details','confirm','chat','tasks']){
   await page.setViewportSize({width,height:950});await mount(page,mode,css);
   await page.getByText(mode==='details'?'수업 정보 입력':mode==='confirm'?'입력하신 정보를':mode==='chat'?'학생과의 대화':'나의 할 일',{exact:false}).first().waitFor();
   if(mode==='tasks')await page.getByText('음악 수업 자료 준비',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${mode} overflow ${width}`);
   if(mode==='details'){
    await page.locator('#start-time').scrollIntoViewIfNeeded();
    const pageTop=await page.evaluate(()=>scrollY);
    for(const time of ['23:00','00:30','15:00']) {
     await page.locator('#start-time').selectOption(time);
     const selected=page.locator('#time-slot-scroll-container button[aria-pressed="true"]');
     await selected.waitFor();assert.ok((await selected.textContent()).includes(time));
     const bounds=await selected.boundingBox(),list=await page.locator('#time-slot-scroll-container').boundingBox();
     assert.ok(bounds.y>=list.y && bounds.y+bounds.height<=list.y+list.height,`Selected ${time} not visible`);
     assert.equal(await page.evaluate(()=>scrollY),pageTop,'Dropdown selection moved the whole page');
    }
    await page.locator('#time-slot-scroll-container button').filter({hasText:'14:30'}).click();
    assert.equal(await page.locator('#start-time').inputValue(),'14:30');
    assert.equal(await page.locator('#end-time').inputValue(),'15:20');
    const columns=await page.locator('.lesson-editor-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width>=1024?2:1);
    if(width>=1024)assert.ok((await page.locator('main').boundingBox()).width>700);
   }
   if(mode==='chat'){
    const composer=page.locator('.chat-composer');assert.equal(await composer.evaluate(e=>getComputedStyle(e).position),width>=1024?'static':'fixed');
    if(width>=1024){const box=await composer.boundingBox();assert.ok(box.x>=224);assert.ok(box.y+box.height<=951);}
   }
   if(mode==='tasks'){
    await page.getByRole('button',{name:'음악 수업 자료 준비 완료',exact:true}).click();await page.getByRole('button',{name:'완료 1',exact:true}).click();
    await page.getByRole('button',{name:'음악 수업 자료 준비 완료 취소',exact:true}).click();await page.getByRole('button',{name:'진행 중 2',exact:true}).click();
    await page.getByRole('button',{name:'음악 수업 자료 준비 삭제',exact:true}).click();await page.waitForTimeout(50);assert.equal((await page.evaluate(()=>window.calls)).includes('deleted'),false);
    await page.evaluate(()=>{window.deleteAllowed=true;});await page.getByRole('button',{name:'음악 수업 자료 준비 삭제',exact:true}).click();await page.getByRole('button',{name:'진행 중 1',exact:true}).waitFor();
   }
   await page.screenshot({path:`.tmp/desktop-layout/${mode}-${width}.png`,fullPage:true});
   console.log(`${mode} ${width}px passed`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
