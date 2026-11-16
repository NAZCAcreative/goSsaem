const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(logout, role='teacher') {
 const destinations=[],errors=[];
 const imports={react:{useRef:value=>({current:value}),useState:value=>[value,()=>{}]},'@/stores/auth-store':{useAuthStore:select=>select({user:role?{role}:null,logout})},'./AlertDialog':{showError:message=>errors.push(message)}};
 const context={exports:{},require:name=>imports[name]||require(name),window:{location:{replace:path=>destinations.push(path)}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/shared/LogoutButton.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
 return {button:context.exports.LogoutButton(),destinations,errors};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('logout is available without approval and redirects only after completion',async()=>{
 let resolve,calls=0;
 const f=fixture(()=>{calls++;return new Promise(done=>{resolve=done;});});
 assert.equal(f.button.props.children,'로그아웃');
 f.button.props.onClick();f.button.props.onClick();
 assert.equal(calls,1);assert.deepEqual(f.destinations,[]);
 resolve();await flush();assert.deepEqual(f.destinations,['/teacher']);
});
test('failed logout keeps current screen and allows retry',async()=>{
 let calls=0;
 const f=fixture(async()=>{if(++calls===1)throw new Error('offline');});
 f.button.props.onClick();await flush();
 assert.deepEqual(f.destinations,[]);assert.match(f.errors[0],/다시 시도/);
 f.button.props.onClick();await flush();assert.deepEqual(f.destinations,['/teacher']);
});
test('student exits to student landing and guests have no logout control',async()=>{
 const f=fixture(async()=>{},'student');f.button.props.onClick();await flush();
 assert.deepEqual(f.destinations,['/student']);assert.equal(fixture(async()=>{},null).button,null);
});
