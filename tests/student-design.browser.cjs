// Real Next screens with public-read fixtures. No accounts, bookings or messages are written.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require('typescript');
const { chromium } = require("playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3110";
const first = "11111111-1111-4111-8111-111111111111";
const people = ["소연", "민준", "지우", "서연"].map((name, index) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
  name,
  avatarUrl: "/img/generated/study-desk.png",
  avatarIsGenerated: true,
  headline: [
    "여행의 설렘을 한국어로 함께해요",
    "일상 이야기를 자연스럽게 나눠요",
    "음악과 함께 배우는 한국어",
    "차근차근 준비하는 TOPIK",
  ][index],
  specialties: ["여행 회화", "일상 회화"],
  ratingAvg: 4.8,
  ratingCount: 12,
  isVerified: true,
  minPrice: 15000,
  recentBookings: 0,
}));
const lesson = {
  id: first,
  teacher_id: people[0].id,
  teacher_name: "소연",
  title: "카페에서 주문하는 여행 회화",
  description: "좋아하는 음료를 주문하며 한국어로 이야기해보세요.",
  category: "여행",
  level: "초급",
  type: "group",
  price: 15000,
  currency: "KRW",
  duration_minutes: 50,
  capacity: 2,
  image_url: "/img/generated/learning-cafe.png",
  scheduling_mode: "request",
  supported_languages: ["한국어"],
  sessions: [],
  next_start: null,
};
async function checkAccountMenu(page){
  const code=ts.transpileModule(fs.readFileSync('src/components/shared/StudentNavigation.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto('about:blank');
    await page.setContent('<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="fixture"></div><button style="margin:50px" id="outside">본문 동작</button></body></html>');
    await page.addStyleTag({content:fs.readFileSync('src/components/shared/StudentNavigation.module.css','utf8')});
    await page.addScriptTag({path:require.resolve('react').replace(/index\.js$/,'umd/react.development.js')});
    await page.addScriptTag({path:require.resolve('react-dom').replace(/index\.js$/,'umd/react-dom.development.js')});
    await page.evaluate(()=>{window.react=window.React;});await page.addScriptTag({path:'node_modules/lucide-react/dist/umd/lucide-react.js'});
    await page.evaluate(({code,base})=>{
      const R=window.React,user={id:'student-fixture',name:'지민',role:'student'},exports={};
      const jsx=(type,props,key)=>R.createElement(type,{...props,key});
      const items=[['s-home','홈','/student'],['s-search','수업 찾기','/student/search'],['s-bookings','내 수업','/student/bookings'],['s-chat','채팅','/student/chat'],['s-profile','마이페이지','/student/profile']].map(([id,label,href])=>({id,label,href,isActive:true}));
      const imports={react:R,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:R.Fragment},'lucide-react':window.LucideReact,'next/link':{default:props=>R.createElement('a',props)},'next/image':{default:({priority,...props})=>R.createElement('img',{...props,src:new URL(props.src,base).href})},'next/navigation':{usePathname:()=>'/student/home'},'@/stores/auth-store':{useAuthStore:select=>select({user,isHydrated:true})},'@/stores/navigation-store':{useNavigationStore:select=>select({getItems:()=>items}),isNavItemActive:item=>item.id==='s-home'},'./LogoutButton':{LogoutButton:()=>R.createElement('button',null,'로그아웃')},'./StudentNavigation.module.css':{default:new Proxy({},{get:(_target,key)=>key})}};
      new Function('exports','require',code)(exports,name=>{if(!imports[name])throw Error(name);return imports[name];});
      window.ReactDOM.createRoot(document.getElementById('fixture')).render(R.createElement(exports.StudentNavigation,{unreadCount:2,onNotifications:()=>{}}));
    },{code,base});
    const account=page.getByRole('button',{name:'내 계정 메뉴'});await account.click();
    await page.getByRole('link',{name:'학습 기록',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'학습 기록',exact:true}).getAttribute('href'),'/student/report');
    assert.equal(await page.getByRole('link',{name:'로그인',exact:true}).count(),0);
    await page.screenshot({path:`.tmp/student-refresh/account-${width}.png`,fullPage:true});
    await page.keyboard.press('Escape');assert.equal(await account.getAttribute('aria-expanded'),'false');assert.ok(await account.evaluate(element=>element===document.activeElement));
    await account.click();await page.locator('#outside').click();assert.equal(await account.getAttribute('aria-expanded'),'false');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
}
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    await page.route("**/rest/v1/rpc/public_lesson_catalog", (route) =>
      route.fulfill({
        json: {
          items: [lesson],
          total: 1,
          categories: ["여행"],
          levels: ["초급"],
        },
      }),
    );
    await page.route("**/rest/v1/rpc/search_teachers", (route) => {
      const input = route.request().postDataJSON();
      const items = input.p_query
        ? people.filter((person) =>
            [person.name, person.headline, ...person.specialties]
              .join(" ")
              .includes(input.p_query),
          )
        : people;
      return route.fulfill({ json: { items, total: items.length } });
    });
    fs.mkdirSync(".tmp/student-refresh", { recursive: true });
    const visit = (path) =>
      page.goto(base + path, { waitUntil: "domcontentloaded" });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await visit("/student");
      await page.getByRole("heading", { name: /한국어로 말하고/ }).waitFor();
      await page.getByRole("link", { name: "로그인", exact: true }).waitFor();
      await page
        .getByRole("heading", { name: "소연 쌤", exact: true })
        .waitFor();
      const nav = page.getByRole("navigation", { name: "학생 상단 메뉴" });
      assert.equal(await nav.isVisible(), width >= 1024);
      if (width >= 1024) {
        assert.equal(await nav.getByRole("link").count(), 5);
        const trigger = page.getByRole("button", {
          name: "수업과 쌤 탐색 메뉴",
        });
        await trigger.click();
        await page
          .getByRole("link", {
            name: "쌤으로 찾기 소개·전문 분야·후기를 살펴보세요",
          })
          .waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await trigger.getAttribute("aria-expanded"), "false");
        assert.ok(
          await trigger.evaluate(
            (element) => element === document.activeElement,
          ),
        );
        await trigger.click();
        await page.getByRole("heading", { name: /한국어로 말하고/ }).click();
        assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      }
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `Landing overflow at ${width}`,
      );
      await page.screenshot({
        path: `.tmp/student-refresh/landing-${width}.png`,
        fullPage: true,
      });
      if(width===1440)await page.screenshot({path:'.tmp/student-refresh/desktop-preview.png',fullPage:false});
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await visit("/student/search");
    await page
      .getByRole("heading", { name: lesson.title, exact: true })
      .waitFor();
    const tabs = page.getByRole("navigation", { name: "수업과 쌤 찾기" });
    assert.equal(
      await tabs
        .getByRole("link", { name: /수업으로 찾기/ })
        .getAttribute("aria-current"),
      "page",
    );
    await page
      .getByRole("searchbox", {
        name: "수업명, 주제 또는 배우고 싶은 내용 검색",
      })
      .fill("여행");
    await page.getByRole("button", { name: "수업 검색", exact: true }).click();
    await page.waitForURL("**/student/search?q=*");
    await tabs.getByRole("link", { name: /쌤으로 찾기/ }).click();
    await page.waitForURL("**/student/teachers?q=*");
    assert.equal(new URL(page.url()).searchParams.get("q"), "여행");
    await page.getByRole("heading", { name: "소연쌤", exact: false }).waitFor();
    assert.equal(
      await page
        .getByRole("searchbox", { name: "쌤 이름과 전문 분야 검색" })
        .inputValue(),
      "여행",
    );
    assert.equal(
      await page
        .getByRole("navigation", { name: "학생 상단 메뉴" })
        .getByRole("link", { name: "수업 찾기", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `Teachers overflow at ${width}`,
      );
      await page.screenshot({
        path: `.tmp/student-refresh/teachers-${width}.png`,
        fullPage: true,
      });
    }
    await visit("/student");
    await page.getByRole('link',{name:'로그인',exact:true}).waitFor();
    const gateway = page.getByRole("region", { name: "나에게 맞는 배움 찾기" });
    await gateway
      .getByRole("button", { name: "쌤 찾기", exact: true })
      .click();
    await gateway.locator('button[aria-pressed="true"]').filter({hasText:'쌤 찾기'}).waitFor();
    await gateway
      .getByRole("searchbox", { name: "쌤 이름과 전문 분야 검색" })
      .fill("소연");
    await gateway.getByRole("button", { name: "쌤 검색하기" }).click();
    await page.waitForURL("**/student/teachers?q=*");
    assert.equal(new URL(page.url()).searchParams.get("q"), "소연");
    await page.getByRole("heading", { name: "소연쌤", exact: false }).waitFor();
    await visit("/student");
    await page.getByRole("button", { name: "퀴즈 풀어보기" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: /물건의 이름을 물을 때/ }).click();
    await page.getByText("정답이에요!", { exact: false }).waitFor();
    await page.keyboard.press("Escape");
    await checkAccountMenu(page);
    assert.deepEqual(errors, []);
    console.log(
      "Student navigation and landing at 320–1440px: discovery popover, keyboard focus, search mode, query-preserving teacher switch, actual teacher cards and quiz passed. Public data mocked.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
