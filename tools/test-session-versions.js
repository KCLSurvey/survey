'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Core=require('../margin-calculators/session-store-core.js');
class Storage{constructor(seed={}){this.data={...seed}}getItem(k){return Object.prototype.hasOwnProperty.call(this.data,k)?this.data[k]:null}setItem(k,v){this.data[k]=String(v)}removeItem(k){delete this.data[k]}}
const storage=new Storage();
for(let i=1;i<=4;i++)Core.save(storage,'sessions',{id:'s'+i,name:'S'+i,savedAt:`2026-07-1${i}T10:00:00Z`,snapshot:{value:i}},3);
let list=Core.read(storage,'sessions',3);
assert.deepStrictEqual(list.map(x=>x.id),['s4','s3','s2']);
assert.deepStrictEqual(list.map(x=>x.snapshot.value),[4,3,2]);
Core.remove(storage,'sessions','s3',3);
assert.deepStrictEqual(Core.read(storage,'sessions',3).map(x=>x.id),['s4','s2']);
const afterRestart=new Storage({...storage.data});
assert.deepStrictEqual(Core.read(afterRestart,'sessions',3).map(x=>x.id),['s4','s2']);
assert.deepStrictEqual(Core.read(new Storage({sessions:'{broken'}),'sessions',3),[]);
for(const file of ['margin-calculators/v9-2/session-manager.js','margin-calculators/v10-2/session-manager.js','margin-calculators/v9-2/ai-action-fix.js','margin-calculators/v10-2/ai-action-fix.js','margin-calculators/v9-2/ai-action-fix-v2.js','margin-calculators/v10-2/ai-action-fix-v2.js','margin-calculators/v9-2/ai-action-fix-v3.js','margin-calculators/v10-2/ai-action-fix-v3.js','margin-calculators/v9-2/sw.js','margin-calculators/v10-2/sw.js']){
  const code=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  new Function(code);
}
for(const version of ['v9-2','v10-2']){
  const html=fs.readFileSync(path.join(__dirname,'..','margin-calculators',version,'index.html'),'utf8');
  assert(html.includes('session-store-core.js'));
  assert(html.includes('session-manager.js'));
  assert(html.includes('ai-action-fix.js'));
  assert(html.includes('ai-action-fix-v2.js'));
  assert(html.includes('ai-action-fix-v3.js'));
  assert(html.includes(`embedded=${version}`));
}
const v9fix=fs.readFileSync(path.join(__dirname,'..','margin-calculators/v9-2/ai-action-fix-v3.js'),'utf8');
const v10fix=fs.readFileSync(path.join(__dirname,'..','margin-calculators/v10-2/ai-action-fix-v3.js'),'utf8');
for(const token of ['resolveParamIndex','performance_marketing','sales_team','textSources','Последнее AI-изменение отменено'])assert(v9fix.includes(token)!==(token==='Последнее AI-изменение отменено'),`v9.2 v3 check failed for ${token}`);
for(const token of ['inferStatus','fieldValue','new_status','target_status','status'])assert(v10fix.includes(token),`v10.2 v3 status resolver missing ${token}`);
console.log('v9.2/v10.2 session and AI action v3 tests passed');