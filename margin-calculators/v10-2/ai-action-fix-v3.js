(()=>{
'use strict';
const frame=document.getElementById('app');
const VERSION='20260715e';
function install(){
 let d;
 try{d=frame.contentDocument}catch{return false}
 if(!d||!d.body)return false;
 if(d.documentElement.dataset.v102AiActionFixV3===VERSION)return true;
 const code=`(()=>{
  const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&!(typeof v==='string'&&v.trim()===''));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const valueKeys=['value_text','valueText','value','new_value','newValue','new_value_text','newValueText','proposed_value','proposedValue','proposed_value_text','proposedValueText','target_value','targetValue','amount','rate','percentage','percent','pct','to'];
  const containerKeys=['changes','change','fields','updates','update','payload','data','parameters'];
  function allowed(type){try{return aiSnapshot().allowedActions[type]||[]}catch{return []}}
  function canonicalField(raw,type){
   const text=String(raw??'').split('.').pop(),n=norm(text),fields=allowed(type);
   const exact=fields.find(f=>norm(f)===n);if(exact)return exact;
   const aliases={expense_status:'status',new_status:'status',target_status:'status',sell_in_reduction_pct:'sellInReductionPct',commission_pct:'sellInReductionPct',expense_value:'value',rate:'value',percentage:'value',percent:'value',pct:'value'};
   const alias=aliases[n];return alias&&fields.includes(alias)?alias:text;
  }
  function children(obj){
   const out=[];
   for(const k of containerKeys){const v=obj?.[k];if(Array.isArray(v))out.push(...v.filter(x=>x&&typeof x==='object'));else if(v&&typeof v==='object')out.push(v)}
   return out;
  }
  function directValue(obj){return first(...valueKeys.map(k=>obj?.[k]))}
  function fieldValue(obj,field,type,depth=0){
   if(!obj||typeof obj!=='object'||depth>4)return undefined;
   let v=directValue(obj);if(v!==undefined)return v;
   for(const [k,x] of Object.entries(obj)){
    if(containerKeys.includes(k))continue;
    if(canonicalField(k,type)===field&&x!==undefined&&x!==null&&!(typeof x==='string'&&x.trim()===''))return x;
   }
   for(const child of children(obj)){v=fieldValue(child,field,type,depth+1);if(v!==undefined)return v}
   return undefined;
  }
  function inferStatus(action){
   const direct=first(action.status,action.new_status,action.newStatus,action.target_status,action.targetStatus,action.state);
   if(direct!==undefined)return direct;
   for(const child of children(action)){const v=first(child.status,child.new_status,child.newStatus,child.target_status,child.targetStatus,child.state);if(v!==undefined)return v}
   const flag=first(action.include,action.included,action.enabled);
   if(typeof flag==='boolean')return flag?'include':'na';
   const text=norm([action.action,action.action_type,action.reason,action.description,action.name].filter(Boolean).join(' '));
   if(/(^|_)(include|included|учесть|включить|активировать)($|_)/.test(text))return 'include';
   if(/(^|_)(review|проверить)($|_)/.test(text))return 'review';
   if(/(^|_)(na|exclude|excluded|не_применимо|исключить|отключить)($|_)/.test(text))return 'na';
   return undefined;
  }
  function normalizeValue(field,value){
   if(field!=='status')return value;
   if(value===true)return 'include';if(value===false)return 'na';
   const n=norm(value);
   if(['include','included','учесть','включить','активировать'].includes(n))return 'include';
   if(['review','проверить'].includes(n))return 'review';
   if(['na','exclude','excluded','не_применимо','исключить','отключить'].includes(n))return 'na';
   return value;
  }
  function repair(action){
   const a={...(action||{})};
   if(!a.field)return a;
   let value=fieldValue(a,a.field,a.type);
   if(value===undefined&&a.field==='status')value=inferStatus(a);
   if(value!==undefined)a.value_text=normalizeValue(a.field,value);
   return a;
  }
  const previousRender=renderAiActions;
  renderAiActions=function(warnings){pendingAiActions=(pendingAiActions||[]).map(repair);return previousRender(warnings)};
  describeAction=function(action){const a=repair(action);return (a.type||'')+': '+(a.target||'')+' '+(a.field||'')+' → '+(a.value_text??'')};
  applyAiActions=function(){
   if(!pendingAiActions.length)return;lastAiUndo=E.clone(state);
   try{
    const actions=pendingAiActions.map(repair);
    for(const a of actions){
     if(!a.field)throw new Error('AI не указал изменяемое поле');
     if(a.value_text===undefined||a.value_text===null||String(a.value_text).trim()==='')throw new Error('AI не указал новое значение для поля '+a.field);
     validateAiAction(a);const v=parseAiValue(a.value_text,a.field);
     if(a.type==='set_global')state[a.field]=v;
     else if(a.type==='set_product')state.singleProduct[a.field]=v;
     else if(a.type==='set_cash')state.cash[a.field]=v;
     else if(a.type==='set_channel'){if(!state.channels[a.target])throw new Error('Неизвестный канал: '+(a.target||'не указан'));state.channels[a.target][a.field]=v}
     else if(a.type==='set_expense'){const x=state.expenses.find(e=>e.id===a.target);if(!x)throw new Error('Неизвестный расход: '+(a.target||'не указан'));x[a.field]=v}
     else if(a.type==='set_sku'){const x=state.portfolio.find(p=>p.id===a.target||p.sku===a.target);if(!x)throw new Error('Неизвестный SKU: '+(a.target||'не указан'));x[a.field]=v}
    }
    addAudit('Применены AI-изменения: '+actions.map(describeAction).join('; '),'AI');pendingAiActions=[];renderAiActions([]);recalculate();addChat('Изменения применены. Расчёт обновлён.','ai');
   }catch(e){state=lastAiUndo;lastAiUndo=null;addChat('Изменения не применены: '+e.message,'error')}
  };
  window.__v102AiActionFixV3='${VERSION}';
 })();`;
 const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);d.documentElement.dataset.v102AiActionFixV3=VERSION;return true;
}
frame.addEventListener('load',()=>setTimeout(install,1600));
const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
setTimeout(()=>clearInterval(timer),30000);
})();