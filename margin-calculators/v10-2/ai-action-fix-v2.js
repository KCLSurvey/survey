(()=>{
'use strict';
const frame=document.getElementById('app');
const VERSION='20260715d';
function install(){
 let d;
 try{d=frame.contentDocument}catch{return false}
 if(!d||!d.body)return false;
 if(d.documentElement.dataset.v102AiActionFixV2===VERSION)return true;
 const code=`(()=>{
  const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&!(typeof v==='string'&&v.trim()===''));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const scalar=v=>v&&typeof v==='object'&&!Array.isArray(v)?first(v.id,v.key,v.code,v.name,v.label,v.value):v;
  const typeAliases={setchannel:'set_channel',set_channel:'set_channel',update_channel:'set_channel',channel:'set_channel',setexpense:'set_expense',set_expense:'set_expense',update_expense:'set_expense',expense:'set_expense',setproduct:'set_product',set_product:'set_product',update_product:'set_product',product:'set_product',setglobal:'set_global',set_global:'set_global',update_global:'set_global',global:'set_global',setcash:'set_cash',set_cash:'set_cash',update_cash:'set_cash',cash:'set_cash',setsku:'set_sku',set_sku:'set_sku',update_sku:'set_sku',sku:'set_sku'};
  const fieldAliases={sell_in_reduction:'sellInReductionPct',sell_in_reduction_pct:'sellInReductionPct',sellinreductionpct:'sellInReductionPct',sell_in_discount:'sellInReductionPct',commission:'sellInReductionPct',commission_pct:'sellInReductionPct',channel_commission:'sellInReductionPct',invoice_discount:'invoiceDiscountPct',invoice_discount_pct:'invoiceDiscountPct',invoicediscountpct:'invoiceDiscountPct',rebate:'rebatePct',rebate_pct:'rebatePct',returns:'returnsPct',returns_pct:'returnsPct',payment_fee:'paymentFeePct',payment_fee_pct:'paymentFeePct',last_mile:'lastMilePerUnit',last_mile_per_unit:'lastMilePerUnit',rrp:'approvedRrpGross',approved_price:'approvedRrpGross',approved_rrp:'approvedRrpGross',purchase_price:'purchasePrice',target:'targetValue',target_value:'targetValue',vat_rate:'vatRate',income_tax_rate:'incomeTaxRate',owner_tax_rate:'ownerTaxRate',expense_value:'value',rate:'value',percentage:'value',percent:'value',pct:'value'};
  const fieldKeys=['field','field_name','fieldName','parameter','parameter_name','parameterName','property','key','metric','setting','path'];
  const valueKeys=['value_text','valueText','value','new_value','newValue','new_value_text','newValueText','proposed_value','proposedValue','proposed_value_text','proposedValueText','target_value','targetValue','amount','rate','percentage','percent','pct','to'];
  const containerKeys=['changes','change','fields','updates','update','payload','data','parameters'];
  function canonicalType(raw){const n=norm(raw);return typeAliases[n.replace(/_/g,'')]||typeAliases[n]||String(raw||'')}
  function allowed(type){try{return aiSnapshot().allowedActions[type]||[]}catch{return []}}
  function canonicalField(raw,type){const text=String(scalar(raw)??'').split('.').pop(),n=norm(text),fields=allowed(type);const exact=fields.find(f=>norm(f)===n);if(exact)return exact;const alias=fieldAliases[n];return alias&&fields.includes(alias)?alias:text}
  function directValue(obj){return first(...valueKeys.map(k=>obj?.[k]))}
  function directField(obj){return first(...fieldKeys.map(k=>obj?.[k]))}
  function containers(obj){const out=[];for(const k of containerKeys){const v=obj?.[k];if(Array.isArray(v))out.push(...v.filter(x=>x&&typeof x==='object'));else if(v&&typeof v==='object')out.push(v)}return out}
  function findNestedValue(obj){let v=directValue(obj);if(v!==undefined)return v;for(const child of containers(obj)){v=directValue(child);if(v!==undefined)return v}return undefined}
  function resolveChannel(a){const candidates=[a.target,a.target_id,a.targetId,a.channel,a.channel_id,a.channelId,a.entity,a.entity_id,a.entityId,a.id].map(scalar).filter(v=>v!==undefined);const context=norm([...candidates,a.reason,a.description,a.name].filter(Boolean).join(' '));const aliases={retail:'retail',network:'retail',networks:'retail',seti:'retail',сеть:'retail',сети:'retail',розница:'retail',dtc:'dtc',direct:'dtc',direct_to_consumer:'dtc',прямые:'dtc',прямой:'dtc',partner:'partner',partners:'partner',партнер:'partner',партнеры:'partner',партнёр:'partner',партнёры:'partner'};for(const [alias,id] of Object.entries(aliases))if(context===alias||context.includes('_'+alias+'_')||context.startsWith(alias+'_')||context.endsWith('_'+alias))if(state.channels[id])return id;for(const raw of candidates)for(const [id,ch] of Object.entries(state.channels||{}))if(norm(raw)===norm(id)||norm(raw)===norm(ch.name))return id;return ''}
  function resolveExpense(a){const candidates=[a.target,a.target_id,a.targetId,a.expense,a.expense_id,a.expenseId,a.entity,a.entity_id,a.entityId,a.id].map(scalar).filter(v=>v!==undefined);const items=state.expenses||[];for(const raw of candidates){const n=norm(raw),exact=items.find(e=>norm(e.id)===n||norm(e.name)===n);if(exact)return exact.id;const partial=items.filter(e=>norm(e.id).includes(n)||norm(e.name).includes(n)||n.includes(norm(e.id))||n.includes(norm(e.name)));if(partial.length===1)return partial[0].id}const context=norm([a.reason,a.description,a.expense_name,a.expenseName].filter(Boolean).join(' '));if(context){const matches=items.filter(e=>context.includes(norm(e.id))||context.includes(norm(e.name)));if(matches.length===1)return matches[0].id}return ''}
  function expand(action){const a={...(action||{})};a.type=canonicalType(first(a.type,a.action,a.action_type,a.actionType));const rawField=directField(a);if(rawField!==undefined){a.field=canonicalField(rawField,a.type);a.value_text=findNestedValue(a);return [a]}
   const children=containers(a);const actionChildren=children.filter(x=>directField(x)!==undefined||containers(x).length);
   if(actionChildren.length)return actionChildren.flatMap(child=>expand({...a,...child,changes:undefined,change:undefined,fields:undefined,updates:undefined,update:undefined,payload:undefined,data:undefined,parameters:undefined}));
   const pairs=[];for(const child of children)for(const [k,v] of Object.entries(child)){const f=canonicalField(k,a.type);if(allowed(a.type).includes(f))pairs.push([f,v])}
   for(const [k,v] of Object.entries(a)){if([...fieldKeys,...valueKeys,...containerKeys,'type','action','action_type','actionType','target','target_id','targetId','channel','channel_id','channelId','expense','expense_id','expenseId','entity','entity_id','entityId','id','name','reason','description'].includes(k))continue;const f=canonicalField(k,a.type);if(allowed(a.type).includes(f))pairs.push([f,v])}
   if(pairs.length)return pairs.filter((x,i,arr)=>arr.findIndex(y=>y[0]===x[0])===i).map(([field,value])=>({...a,field,value_text:value}));
   a.field='';a.value_text=findNestedValue(a);return [a]
  }
  function normalizeAll(actions){return (actions||[]).flatMap(expand).map(a=>{if(a.type==='set_channel')a.target=resolveChannel(a);else if(a.type==='set_expense')a.target=resolveExpense(a);else if(a.type==='set_sku')a.target=scalar(first(a.target,a.sku,a.sku_id,a.skuId,a.id));return a}).filter(a=>a&&a.type&&a.type!=='none')}
  const originalRender=renderAiActions;
  renderAiActions=function(warnings){pendingAiActions=normalizeAll(pendingAiActions);return originalRender(warnings)};
  describeAction=function(action){const a=normalizeAll([action])[0]||{};return (a.type||'')+': '+(a.target||'')+' '+(a.field||'')+' → '+(a.value_text??'')};
  applyAiActions=function(){if(!pendingAiActions.length)return;lastAiUndo=E.clone(state);try{const actions=normalizeAll(pendingAiActions);for(const a of actions){if(!a.field)throw new Error('AI не указал изменяемое поле');if(a.value_text===undefined||a.value_text===null||String(a.value_text).trim()==='')throw new Error('AI не указал новое значение для поля '+a.field);validateAiAction(a);const v=parseAiValue(a.value_text,a.field);if(a.type==='set_global')state[a.field]=v;else if(a.type==='set_product')state.singleProduct[a.field]=v;else if(a.type==='set_cash')state.cash[a.field]=v;else if(a.type==='set_channel'){if(!state.channels[a.target])throw new Error('Неизвестный канал: '+(a.target||'не указан'));state.channels[a.target][a.field]=v}else if(a.type==='set_expense'){const x=state.expenses.find(e=>e.id===a.target);if(!x)throw new Error('Неизвестный расход: '+(a.target||'не указан'));x[a.field]=v}else if(a.type==='set_sku'){const x=state.portfolio.find(p=>p.id===a.target||p.sku===a.target);if(!x)throw new Error('Неизвестный SKU: '+(a.target||'не указан'));x[a.field]=v}}addAudit('Применены AI-изменения: '+actions.map(describeAction).join('; '),'AI');pendingAiActions=[];renderAiActions([]);recalculate();addChat('Изменения применены. Расчёт обновлён.','ai')}catch(e){state=lastAiUndo;lastAiUndo=null;addChat('Изменения не применены: '+e.message,'error')}};
  window.__v102AiActionFixV2='${VERSION}';
 })();`;
 const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);d.documentElement.dataset.v102AiActionFixV2=VERSION;return true;
}
frame.addEventListener('load',()=>setTimeout(install,1300));
const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
setTimeout(()=>clearInterval(timer),30000);
})();