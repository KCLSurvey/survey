(()=>{
'use strict';
const frame=document.getElementById('app');
const VERSION='20260715c';
const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
function install(){
 let d;
 try{d=frame.contentDocument}catch{return false}
 if(!d||!d.body)return false;
 if(d.documentElement.dataset.v102AiActionFix===VERSION)return true;
 const code=`(()=>{
  const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
  const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const typeAliases={setchannel:'set_channel',set_channel:'set_channel',update_channel:'set_channel',channel:'set_channel',setexpense:'set_expense',set_expense:'set_expense',update_expense:'set_expense',expense:'set_expense',setproduct:'set_product',set_product:'set_product',update_product:'set_product',product:'set_product',setglobal:'set_global',set_global:'set_global',update_global:'set_global',global:'set_global',setcash:'set_cash',set_cash:'set_cash',update_cash:'set_cash',cash:'set_cash',setsku:'set_sku',set_sku:'set_sku',update_sku:'set_sku',sku:'set_sku'};
  const fieldAliases={sell_in_reduction:'sellInReductionPct',sell_in_reduction_pct:'sellInReductionPct',sellinreductionpct:'sellInReductionPct',sell_in_discount:'sellInReductionPct',commission_pct:'sellInReductionPct',channel_commission:'sellInReductionPct',invoice_discount:'invoiceDiscountPct',invoice_discount_pct:'invoiceDiscountPct',invoicediscountpct:'invoiceDiscountPct',rebate:'rebatePct',rebate_pct:'rebatePct',returns:'returnsPct',returns_pct:'returnsPct',payment_fee:'paymentFeePct',payment_fee_pct:'paymentFeePct',last_mile:'lastMilePerUnit',last_mile_per_unit:'lastMilePerUnit',rrp:'approvedRrpGross',approved_price:'approvedRrpGross',approved_rrp:'approvedRrpGross',purchase_price:'purchasePrice',target:'targetValue',target_value:'targetValue',vat_rate:'vatRate',income_tax_rate:'incomeTaxRate',owner_tax_rate:'ownerTaxRate',expense_value:'value',rate:'value',percentage:'value',percent:'value'};
  function allowed(type){try{return aiSnapshot().allowedActions[type]||[]}catch{return []}}
  function canonicalType(raw){return typeAliases[norm(raw).replace(/_/g,'')]||typeAliases[norm(raw)]||String(raw||'')}
  function canonicalField(raw,type){
   const text=String(raw??'').split('.').pop();
   const n=norm(text),fields=allowed(type);
   const exact=fields.find(f=>norm(f)===n);if(exact)return exact;
   const alias=fieldAliases[n]||'';if(alias&&fields.includes(alias))return alias;
   return text;
  }
  function nestedObjects(a){return [a.changes,a.change,a.fields,a.updates,a.update,a.payload,a.data,a.parameters].filter(x=>x&&typeof x==='object'&&!Array.isArray(x))}
  function resolveChannel(a){
   const raw=first(a.target,a.target_id,a.targetId,a.channel,a.channel_id,a.channelId,a.entity,a.entity_id,a.entityId,a.id);
   const hint=norm([raw,a.reason,a.description,a.name].filter(Boolean).join(' '));
   const aliases={retail:'retail',retail_channel:'retail',network:'retail',networks:'retail',seti:'retail',сеть:'retail',сети:'retail',розница:'retail',dtc:'dtc',direct:'dtc',direct_channel:'dtc',direct_to_consumer:'dtc',прямые:'dtc',прямой:'dtc',прямые_продажи:'dtc',partner:'partner',partners:'partner',other_partners:'partner',партнер:'partner',партнеры:'partner',партнёр:'partner',партнёры:'partner'};
   for(const [alias,id] of Object.entries(aliases))if(hint===alias||hint.includes('_'+alias+'_')||hint.startsWith(alias+'_')||hint.endsWith('_'+alias))if(state.channels[id])return id;
   for(const [id,ch] of Object.entries(state.channels||{}))if(norm(raw)===norm(id)||norm(raw)===norm(ch.name))return id;
   if(!raw&&canonicalField(first(a.field,a.field_name,a.fieldName,a.parameter,a.property,a.key),'set_channel')==='sellInReductionPct'){
    const candidates=Object.entries(state.channels||{}).filter(([,ch])=>Number(ch.sellInReductionPct)>0);if(candidates.length===1)return candidates[0][0];
   }
   return String(raw||'');
  }
  function resolveExpense(a){
   const raw=first(a.target,a.target_id,a.targetId,a.expense,a.expense_id,a.expenseId,a.entity,a.entity_id,a.entityId,a.id,a.name);
   if(!raw)return '';
   const n=norm(raw),items=state.expenses||[];
   const exact=items.find(e=>norm(e.id)===n||norm(e.name)===n);if(exact)return exact.id;
   const partial=items.filter(e=>norm(e.id).includes(n)||norm(e.name).includes(n)||n.includes(norm(e.id))||n.includes(norm(e.name)));
   return partial.length===1?partial[0].id:String(raw);
  }
  function inferPairs(a,type){
   const fields=allowed(type),pairs=[];
   for(const obj of nestedObjects(a))for(const [k,v] of Object.entries(obj)){const f=canonicalField(k,type);if(fields.includes(f))pairs.push([f,v])}
   for(const [k,v] of Object.entries(a)){if(['type','action','action_type','actionType','target','target_id','targetId','channel','channel_id','channelId','expense','expense_id','expenseId','entity','entity_id','entityId','id','name','reason','description','value','value_text','valueText','new_value','newValue','proposed_value','proposedValue','field','field_name','fieldName','parameter','parameter_name','parameterName','property','key','metric','setting','path','changes','change','fields','updates','update','payload','data','parameters'].includes(k))continue;const f=canonicalField(k,type);if(fields.includes(f))pairs.push([f,v])}
   return pairs.filter((x,i,arr)=>arr.findIndex(y=>y[0]===x[0])===i);
  }
  function normalizeMany(action){
   const base={...(action||{})};base.type=canonicalType(first(base.type,base.action,base.action_type,base.actionType));
   let field=canonicalField(first(base.field,base.field_name,base.fieldName,base.parameter,base.parameter_name,base.parameterName,base.property,base.key,base.metric,base.setting,base.path),base.type);
   let value=first(base.value_text,base.valueText,base.value,base.new_value,base.newValue,base.proposed_value,base.proposedValue);
   const inferred=inferPairs(base,base.type);
   if(!field&&inferred.length)return inferred.map(([f,v])=>normalizeMany({...base,field:f,value_text:v})[0]);
   if(field&&value===undefined){const hit=inferred.find(([f])=>f===field);if(hit)value=hit[1]}
   base.field=field;base.value_text=value;
   if(base.type==='set_channel')base.target=resolveChannel(base);
   else if(base.type==='set_expense')base.target=resolveExpense(base);
   else if(base.type==='set_sku')base.target=first(base.target,base.sku,base.sku_id,base.skuId,base.id);
   return [base];
  }
  function normalizeAll(actions){return (actions||[]).flatMap(normalizeMany).filter(a=>a&&a.type&&a.type!=='none')}
  const originalRender=renderAiActions;
  renderAiActions=function(warnings){pendingAiActions=normalizeAll(pendingAiActions);return originalRender(warnings)};
  const originalParse=parseAiValue;
  parseAiValue=function(text,field){try{return originalParse(text,field)}catch(err){const m=String(text??'').replace(',','.').match(/-?\\d+(?:\\.\\d+)?/);if(m)return Number(m[0]);throw err}};
  describeAction=function(action){const a=normalizeMany(action)[0]||{};return (a.type||'')+': '+(a.target||'')+' '+(a.field||'')+' → '+(a.value_text??'')};
  applyAiActions=function(){
   if(!pendingAiActions.length)return;lastAiUndo=E.clone(state);
   try{
    const actions=normalizeAll(pendingAiActions);
    for(const a of actions){
     if(!a.field)throw new Error('AI не указал изменяемое поле');
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
  window.__v102AiActionFix='${VERSION}';
 })();`;
 const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);d.documentElement.dataset.v102AiActionFix=VERSION;return true;
}
frame.addEventListener('load',()=>setTimeout(install,1000));
const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
setTimeout(()=>clearInterval(timer),30000);
})();