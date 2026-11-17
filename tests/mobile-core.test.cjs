const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file) {
  const context = { exports: {}, URL };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
test("mobile notification routes allow only supported teacher screens and reject external redirects", () => {
  const api = load("apps/mobile/src/lib/navigation.ts");
  const id = "10000000-0000-4000-8000-000000000001";
  assert.equal(api.notificationDestination(`/teacher/chat/${id}`).roomId, id);
  assert.equal(
    api.notificationDestination(`/teacher/lessons/attendance?session=${id}`)
      .sessionId,
    id,
  );
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/teacher/../admin",
    "/\\evil.test",
    "/student/chat/1",
    "/teacher/chat/not-a-uuid",
  ])
    assert.equal(api.notificationDestination(path).tab, "notifications");
  assert.equal(
    api.trustedWebUrl("/teacher/home", "https://gossaem.test"),
    "https://gossaem.test/teacher/home",
  );
  for (const path of ["//evil.test", "/\\evil.test", "https://evil.test"])
    assert.throws(() => api.trustedWebUrl(path, "https://gossaem.test"));
  assert.throws(() =>
    api.trustedWebUrl("/teacher/home", "http://gossaem.test"),
  );
});
test("secure session chunks preserve Unicode, rotate atomically, and remove stored credentials", async () => {
  const { secureSessionStorage } = load("apps/mobile/src/lib/storage.ts");
  const values = new Map();
  let generation = 0,
    fail = false;
  const store = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (fail && key.endsWith(".1")) throw Error("disk full");
      assert.ok(Buffer.byteLength(value, "utf8") <= 2048);
      values.set(key, value);
    },
    deleteItemAsync: async (key) => values.delete(key),
  };
  const storage = secureSessionStorage(
    store,
    () => `generation-${++generation}`,
  );
  const first = "한국어😀".repeat(1200);
  await storage.setItem("session", first);
  assert.equal(await storage.getItem("session"), first);
  fail = true;
  await assert.rejects(
    storage.setItem("session", "x".repeat(6000)),
    /disk full/,
  );
  assert.equal(await storage.getItem("session"), first);
  fail = false;
  await storage.setItem("session", "updated");
  assert.equal(await storage.getItem("session"), "updated");
  assert.equal(values.size, 2);
  await storage.removeItem("session");
  assert.equal(await storage.getItem("session"), null);
  assert.equal(values.size, 0);
});
test("mobile semantic versions are independent and build profiles generate installable APKs", () => {
  const { nextVersion } = require("../scripts/mobile-version.cjs");
  assert.equal(nextVersion("0.1.0", "patch"), "0.1.1");
  assert.equal(nextVersion("0.1.8", "minor"), "0.2.0");
  assert.equal(nextVersion("0.2.0", "major"), "1.0.0");
  assert.throws(() => nextVersion("invalid", "patch"));
  const config = JSON.parse(fs.readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(config.build.preview.android.buildType, "apk");
  assert.equal(config.build.preview.autoIncrement, true);
  assert.equal(config.cli.appVersionSource, "remote");
  const pkg = JSON.parse(fs.readFileSync("apps/mobile/package.json", "utf8")),
    lock = JSON.parse(fs.readFileSync("apps/mobile/package-lock.json", "utf8"));
  assert.equal(pkg.version, lock.packages[""].version);
  assert.equal(
    pkg.version,
    JSON.parse(fs.readFileSync("apps/mobile/releases.json", "utf8"))[0].version,
  );
});

test('logout waits for an in-flight registration and passive refresh cannot reactivate the device',async()=>{
  let wanted='true',active=false,releaseRegistration,startedRegistration;
  const started=new Promise(resolve=>{startedRegistration=resolve;});
  const pending=new Promise(resolve=>{releaseRegistration=resolve;});
  const calls=[];
  const notifications={setNotificationHandler(){},setNotificationChannelAsync:async()=>{},getPermissionsAsync:async()=>({granted:true}),getExpoPushTokenAsync:async()=>({data:'ExpoPushToken[test]'}),dismissAllNotificationsAsync:async()=>{},clearLastNotificationResponseAsync:async()=>{},AndroidImportance:{HIGH:4}};
  const backend={backend:()=>({rpc:async(name)=>{calls.push(name);if(name==='register_mobile_push_device'){startedRegistration();await pending;active=true;}else active=false;return{error:null};}}),installationId:async()=> 'device-1'};
  const imports={'expo-notifications':notifications,'expo-device':{isDevice:true},'expo-constants':{default:{easConfig:{projectId:'project-1'}}},'expo-application':{nativeApplicationVersion:'0.1.0'},'expo-secure-store':{getItemAsync:async()=>wanted,setItemAsync:async(_key,value)=>{wanted=value;}},'react-native':{Platform:{OS:'android'}},'./backend':backend,'./navigation':{}};
  const context={exports:{},require:name=>{if(!(name in imports))throw Error(name);return imports[name];}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/mobile/src/lib/push.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
  const registration=context.exports.registerPush();await started;
  const logout=context.exports.disconnectPush();const background=context.exports.registerPush();
  releaseRegistration();await Promise.all([registration,logout,background]);
  assert.equal(active,false);assert.equal(wanted,'false');assert.deepEqual(calls,['register_mobile_push_device','unregister_mobile_push_device']);
});
