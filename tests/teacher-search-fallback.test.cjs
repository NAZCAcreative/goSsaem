const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(code = 'PGRST202') {
  const calls = [];
  const rows = ['approved', 'hidden'].map((id, i) => ({profile_id:id,profiles:{name:id},specialties:['회화'],rating_avg:5-i,rating_count:2,teacher_lessons:[]}));
  const imports = {
    '@/lib/supabase/client': {createClient:()=>({
      rpc:async()=>({data:code ? null : {items:[],total:0},error:code ? {code}:null}),
      from:()=>({select:()=>({order(){return this;},range:async()=>({data:rows,error:null})})}),
    })},
    '@/lib/time': {periodsForTimeRange:()=>[]},
    './paging': {collectPages: async fn=>(await fn(0,999)).data},
    './lessonCatalog': {
      readCatalogFilters: params=>({page:Number(params.get('page')),type:params.get('type')}),
      getLessonCatalog:async filters=>{
        calls.push(filters);
        return {items:[{teacher_id:'approved',title:filters.page===1?'여행':'면접',price:filters.page===1?30000:10000}],total:2};
      },
    },
  };
  const context = {exports:{},URLSearchParams,require:name=>imports[name] ?? require(name)};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/queries/teachers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return {...context.exports,calls};
}
const input={query:'',specialty:null,price:'all',periods:[],sort:'recommended',page:1,size:8};
test('missing search RPC uses all public catalogue pages and excludes unlisted profiles',async()=>{
  const h=fixture(); const result=await h.searchTeachers(input);
  assert.equal(result.total,1);assert.equal(result.items[0].id,'approved');assert.equal(result.items[0].minPrice,10000);
  assert.deepEqual(h.calls,[{page:1,type:'all'},{page:2,type:'all'}]);
  assert.equal((await h.searchTeachers({...input,query:'면접',price:'low'})).total,1);
  assert.equal((await h.searchTeachers({...input,query:'hidden'})).total,0);
  assert.equal((await h.searchTeachers({...input,page:2})).items.length,0);
});
test('permission and network errors never bypass the search RPC',async()=>{
  for(const code of ['42501','PGRST301','NETWORK']) {
    const h=fixture(code);await assert.rejects(h.searchTeachers(input));assert.equal(h.calls.length,0);
  }
  const h=fixture(null);assert.equal((await h.searchTeachers(input)).total,0);assert.equal(h.calls.length,0);
});
