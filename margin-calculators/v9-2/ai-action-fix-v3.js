(()=>{
'use strict';
const frame=document.getElementById('app');
const VERSION='20260715e';
function install(){
 let d;
 try{d=frame.contentDocument}catch{return false}
 if(!d||!d.body)return false;
 if(d.documentElement.dataset.v92AiActionFixV3===VERSION)return true;
 const code=`(()=>{
  const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&!(typeof v==='string'&&v.trim()===''));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const valueKeys=['value_text','valueText','value','new_value','newValue','new_value_text','newValueText','proposed_value','proposedValue','proposed_value_text','proposedValueText','target_value','targetValue','amount','rate','percentage','percent','pct','to'];
  const containerKeys=['changes','change','fields','updates','update','payload','data','parameters'];
  const standard={
   inbound_logistics:[['входящ','логист'],['inbound','logistics']],customs_cert:[['тамож'],['пошлин'],['сертифик'],['customs']],warehouse_after_ready:[['склад'],['warehouse']],warranty_returns:[['гарант'],['сервис'],['warranty']],dtc_lastmile:[['последн','мил'],['dtc','достав'],['last','mile']],retail_bonus:[['ретро','бонус'],['retail','bonus']],trade_marketing:[['trade','marketing'],['торгов','маркет']],performance_marketing:[['performance'],['media','marketing']],sales_team:[['команда','продаж'],['commercial','opex'],['sales','team']],admin_opex:[['администр','opex'],['admin','opex']],bad_debt:[['безнадеж'],['просроч'],['bad','debt']],depreciation:[['амортизац'],['depreciation']],finance_cost:[['финансир'],['процент'],['finance','cost']],cash_only:[['денежн','выплат'],['cash','only']]
  };
  function children(obj){const out=[];for(const k of containerKeys){const v=obj?.[k];if(Array.isArray(v))out.push(...v.filter(x=>x&&typeof x==='object'));else if(v&&typeof v==='object')out.push(v)}return out}
  function directValue(obj){return first(...valueKeys.map(k=>obj?.[k]))}
  function valueFor(obj,field,depth=0){
   if(!obj||typeof obj!=='object'||depth>4)return undefined;
   let v=directValue(obj);if(v!==undefined)return v;
   for(const [k,x] of Object.entries(obj)){if(containerKeys.includes(k))continue;if(norm(k)===norm(field)&&x!==undefined&&x!==null&&!(typeof x==='string'&&x.trim()===''))return x}
   for(const child of children(obj)){v=valueFor(child,field,depth+1);if(v!==undefined)return v}
   return undefined;
  }
  function textSources(a){
   const vals=[a.target,a.target_id,a.targetId,a.expense,a.expense_id,a.expenseId,a.entity,a.entity_id,a.entityId,a.id,a.name,a.label,a.expense_name,a.expenseName,a.reason,a.description];
   for(const child of children(a))vals.push(child.target,child.expense,child.expense_id,child.id,child.name,child.label,child.reason,child.description);
   return vals.filter(v=>v!==undefined&&v!==null).map(v=>String(v));
  }
  function paramName(p){return norm([p?.id,p?.key,p?.code,p?.name].filter(Boolean).join(' '))}
  function resolveParamIndex(a){
   const sources=textSources(a);
   for(const raw of sources){const n=Number(raw);if(Number.isInteger(n)&&n>=0&&params[n])return n}
   const parts=[];
   for(const raw of sources){const full=norm(raw);if(full)parts.push(full);for(const p of String(raw).split(/[.\/:>\-]+/)){const n=norm(p);if(n)parts.push(n)}}
   for(const key of [...new Set(parts)]){
    const exact=params.findIndex(p=>{const names=[p?.id,p?.key,p?.code,p?.name].filter(Boolean).map(norm);return names.includes(key)});if(exact>=0)return exact;
   }
   const joined='_'+parts.join('_')+'_';
   let canonical='';
   for(const id of Object.keys(standard))if(joined.includes('_'+norm(id)+'_')||joined.includes('_'+norm(id).replace(/_/g,'')+'_')){canonical=id;break}
   function scoreParam(p,idHint=''){
    const name=paramName(p);let score=0;
    for(const token of parts){if(token.length>2&&name.includes(token))score+=Math.min(8,token.length)}
    if(idHint){for(const group of standard[idHint]||[]){const hits=group.filter(t=>name.includes(norm(t))).length;if(hits===group.length)score+=30+hits*10;else if(hits)score+=hits*6}}
    return score;
   }
   const ranked=params.map((p,i)=>({i,score:scoreParam(p,canonical)})).sort((a,b)=>b.score-a.score);
   if(ranked[0]?.score>0&&ranked[0].score>ranked[1]?.score)return ranked[0].i;
   for(const [id,groups] of Object.entries(standard)){
    if(!parts.some(x=>x.includes(norm(id))||norm(id).includes(x)))continue;
    const candidates=params.map((p,i)=>({i,name:paramName(p),score:groups.reduce((s,g)=>s+(g.every(t=>paramName(p).includes(norm(t)))?20:g.filter(t=>paramName(p).includes(norm(t))).length*4),0)})).sort((a,b)=>b.score-a.score);
    if(candidates[0]?.score>0&&candidates[0].score>candidates[1]?.score)return candidates[0].i;
   }
   return -1;
  }
  function normalizeValue(v,field){
   if(field!=='status')return v;
   if(v===true)return 'included';if(v===false)return 'na';
   const n=norm(v);
   if(['include','included','учесть','включить','активировать'].includes(n))return 'included';
   if(['review','проверить'].includes(n))return 'review';
   if(['na','exclude','excluded','не_применимо','исключить','отключить'].includes(n))return 'na';
   return v;
  }
  function inferStatus(a){
   const direct=first(a.status,a.new_status,a.newStatus,a.target_status,a.targetStatus,a.state);if(direct!==undefined)return direct;
   for(const child of children(a)){const v=first(child.status,child.new_status,child.newStatus,child.target_status,child.targetStatus,child.state);if(v!==undefined)return v}
   const text=norm([a.action,a.action_type,a.reason,a.description,a.name].filter(Boolean).join(' '));
   if(/(^|_)(include|included|учесть|включить|активировать)($|_)/.test(text))return 'included';
   if(/(^|_)(review|проверить)($|_)/.test(text))return 'review';
   if(/(^|_)(na|exclude|excluded|не_применимо|исключить|отключить)($|_)/.test(text))return 'na';
   return undefined;
  }
  function repair(a){
   const x={...(a||{})};
   if(x.type==='set_param'){
    const idx=resolveParamIndex(x);if(idx>=0)x.target=idx;
    let v=valueFor(x,x.field);if(v===undefined&&x.field==='status')v=inferStatus(x);if(v!==undefined)x.value_text=normalizeValue(v,x.field);
   }
   return x;
  }
  const previousRender=v91RenderActions;
  v91RenderActions=function(warnings){v91Pending=(v91Pending||[]).map(repair);return previousRender(warnings)};
  applyV9AiActions=function(){
   if(!v91Pending.length)return;v91Undo={inputs:getInputState(),params:JSON.parse(JSON.stringify(params))};
   try{
    const actions=v91Pending.map(repair),allowed=v91Snapshot().allowedActions;
    for(const x of actions){
     if(!x.field)throw Error('AI не указал изменяемое поле');
     if(x.value_text===undefined||x.value_text===null||String(x.value_text).trim()==='')throw Error('AI не указал новое значение для поля '+x.field);
     if(x.type==='set_input'){
      if(!allowed.set_input.includes(x.field))throw Error('Недопустимое поле: '+x.field);const e=document.getElementById(x.field);if(!e)throw Error('Поле не найдено: '+x.field);e.value=v91Parse(normalizeValue(x.value_text,x.field),x.field);
     }else if(x.type==='set_param'){
      const idx=resolveParamIndex(x);if(idx<0||!params[idx])throw Error('Строка расхода не найдена: '+textSources(x).join(' / '));
      if(!allowed.set_param.includes(x.field))throw Error('Недопустимое поле расхода: '+x.field);params[idx][x.field]=v91Parse(normalizeValue(x.value_text,x.field),x.field);
     }else throw Error('Недопустимое действие: '+x.type);
    }
    renderParams();syncRanges();recalc();v91Pending=[];v91RenderActions([]);v91Undo=null;v91Append('Изменения применены и расчёт обновлён.');
   }catch(e){
    if(v91Undo){setInputState(v91Undo.inputs,false);params=JSON.parse(JSON.stringify(v91Undo.params));v91Undo=null;renderParams();syncRanges();recalc()}
    v91Append('Изменения не применены: '+e.message);
   }
  };
  window.__v92AiActionFixV3='${VERSION}';
 })();`;
 const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);d.documentElement.dataset.v92AiActionFixV3=VERSION;return true;
}
frame.addEventListener('load',()=>setTimeout(install,1700));
const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
setTimeout(()=>clearInterval(timer),30000);
})();