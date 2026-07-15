(()=>{
'use strict';
const frame=document.getElementById('app');
const VERSION='20260715c';
function install(){
 let d;
 try{d=frame.contentDocument}catch{return false}
 if(!d||!d.body)return false;
 if(d.documentElement.dataset.v92AiActionFix===VERSION)return true;
 const code=`(()=>{
  const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
  const norm=v=>String(v??'').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const inputFields=v91Snapshot().allowedActions.set_input;
  const paramFields=v91Snapshot().allowedActions.set_param;
  const inputAliases={rrp:'rrp',approved_rrp_gross:'rrp',approved_price:'rrp',approvedrrpgross:'rrp',purchase_price:'cogs',purchaseprice:'cogs',cogs:'cogs',vat_rate:'vat',vatrate:'vat',income_tax_rate:'income_tax',incometaxrate:'income_tax',target_value:'single_target_margin',targetvalue:'single_target_margin',target_margin:'single_target_margin',sold_units:'units_total',soldunits:'units_total',purchased_units:'units_total',purchasedunits:'units_total',sku:'single_sku',product_sku:'single_sku'};
  const paramAliases={expense_status:'status',status:'status',expense_name:'name',name:'name',channels:'applies',channel:'applies',sku_mode:'skuMode',skumode:'skuMode',sku_list:'skuList',skulist:'skuList',method:'mode',expense_method:'mode',value:'value',expense_value:'value',rate:'value',percentage:'value',percent:'value',base:'base',category:'treat',expense_category:'treat',vat_treatment:'vatTreatment',vattreatment:'vatTreatment',tax_deductible:'tax',taxdeductible:'tax'};
  function canonicalInput(raw){const n=norm(String(raw??'').split('.').pop());const exact=inputFields.find(f=>norm(f)===n);return exact||inputAliases[n]||String(raw||'')}
  function canonicalParam(raw){const n=norm(String(raw??'').split('.').pop());const exact=paramFields.find(f=>norm(f)===n);return exact||paramAliases[n]||String(raw||'')}
  function resolveChannel(a){const raw=first(a.target,a.target_id,a.targetId,a.channel,a.channel_id,a.channelId,a.entity,a.entity_id,a.entityId,a.id);const hint=norm([raw,a.reason,a.description,a.name].filter(Boolean).join(' '));if(/(^|_)retail($|_)|(^|_)network(s)?($|_)|(^|_)сеть|(^|_)сети|(^|_)розниц/.test(hint))return 'retail';if(/(^|_)dtc($|_)|(^|_)direct($|_)|прям/.test(hint))return 'dtc';if(/partner|партнер|партнёр/.test(hint))return 'partner';return String(raw||'')}
  function resolveParamIndex(a){const raw=first(a.target,a.target_id,a.targetId,a.expense,a.expense_id,a.expenseId,a.entity,a.entity_id,a.entityId,a.id,a.name);if(raw!==undefined&&raw!==null&&String(raw).trim()!==''){const n=Number(raw);if(Number.isInteger(n)&&params[n])return n;const key=norm(raw);const exact=params.findIndex(p=>norm(p.id)===key||norm(p.name)===key);if(exact>=0)return exact;const matches=params.map((p,i)=>({p,i})).filter(x=>norm(x.p.id).includes(key)||norm(x.p.name).includes(key)||key.includes(norm(x.p.id))||key.includes(norm(x.p.name)));if(matches.length===1)return matches[0].i}return -1}
  function nestedObjects(a){return [a.changes,a.change,a.fields,a.updates,a.update,a.payload,a.data,a.parameters].filter(x=>x&&typeof x==='object'&&!Array.isArray(x))}
  function inferPairs(a,kind){const allowed=kind==='set_input'?inputFields:paramFields,pairs=[];const canon=kind==='set_input'?canonicalInput:canonicalParam;for(const obj of nestedObjects(a))for(const [k,v] of Object.entries(obj)){const f=canon(k);if(allowed.includes(f)||f==='value')pairs.push([f,v])}for(const [k,v] of Object.entries(a)){if(['type','action','action_type','actionType','target','target_id','targetId','channel','channel_id','channelId','expense','expense_id','expenseId','entity','entity_id','entityId','id','name','reason','description','value','value_text','valueText','new_value','newValue','proposed_value','proposedValue','field','field_name','fieldName','parameter','parameter_name','parameterName','property','key','metric','setting','path','changes','change','fields','updates','update','payload','data','parameters'].includes(k))continue;const f=canon(k);if(allowed.includes(f)||f==='value')pairs.push([f,v])}return pairs.filter((x,i,arr)=>arr.findIndex(y=>y[0]===x[0])===i)}
  function mapChannelAction(a){const channel=resolveChannel(a);let f=norm(first(a.field,a.field_name,a.fieldName,a.parameter,a.parameter_name,a.parameterName,a.property,a.key,a.metric,a.setting,a.path));if(!f){const pair=inferPairs(a,'set_input')[0];if(pair){f=norm(pair[0]);a.value_text=first(a.value_text,a.valueText,a.value,a.new_value,a.newValue,a.proposed_value,a.proposedValue,pair[1])}}
   let field='';if(f==='share'||f==='channel_share'||f==='share_pct')field='share_'+channel;else if(['sell_in_reduction_pct','sellinreductionpct','sell_in_reduction','commission','commission_pct','channel_commission'].includes(f))field=channel==='retail'?'retail_commission':channel==='partner'?'partner_commission':channel==='dtc'?'dtc_discount':'';else if(['invoice_discount_pct','invoicediscountpct','invoice_discount'].includes(f)&&channel==='dtc')field='dtc_discount';return {...a,type:'set_input',field,target:'',value_text:first(a.value_text,a.valueText,a.value,a.new_value,a.newValue,a.proposed_value,a.proposedValue)}
  function mapExpenseField(field,index){const f=canonicalParam(field);if(f!=='value')return f;const p=params[index];const mode=String(p?.mode||'');return mode.includes('pct')?'pct':'amount'}
  function mapExpenseAction(a){const index=resolveParamIndex(a);let rawField=first(a.field,a.field_name,a.fieldName,a.parameter,a.parameter_name,a.parameterName,a.property,a.key,a.metric,a.setting,a.path);let value=first(a.value_text,a.valueText,a.value,a.new_value,a.newValue,a.proposed_value,a.proposedValue);if(!rawField){const pairs=inferPairs(a,'set_param');if(pairs.length){rawField=pairs[0][0];value=first(value,pairs[0][1])}}return {...a,type:'set_param',target:index,field:mapExpenseField(rawField,index),value_text:value}}
  function mapGenericAction(a){let type=norm(first(a.type,a.action,a.action_type,a.actionType));if(['setchannel','set_channel','update_channel','channel'].includes(type))return mapChannelAction(a);if(['setexpense','set_expense','update_expense','expense'].includes(type))return mapExpenseAction(a);let field=first(a.field,a.field_name,a.fieldName,a.parameter,a.parameter_name,a.parameterName,a.property,a.key,a.metric,a.setting,a.path);let value=first(a.value_text,a.valueText,a.value,a.new_value,a.newValue,a.proposed_value,a.proposedValue);
   if(['setproduct','set_product','update_product','product','setglobal','set_global','update_global','global','setcash','set_cash','update_cash','cash'].includes(type)){field=canonicalInput(field);if(!field){const pairs=inferPairs(a,'set_input');if(pairs.length){field=pairs[0][0];value=first(value,pairs[0][1])}}return {...a,type:'set_input',field,value_text:value,target:''}}
   if(['setparam','set_param'].includes(type))return mapExpenseAction(a);
   field=canonicalInput(field);if(inputFields.includes(field))return {...a,type:'set_input',field,value_text:value};
   return {...a,type:type||a.type,field,value_text:value};
  }
  function normalizeValue(v,field,target){const s=String(v??'').trim();if(field==='status'){const n=norm(s);if(['include','included','учесть','включить'].includes(n))return 'included';if(['review','проверить'].includes(n))return 'review';if(['na','exclude','excluded','не_применимо','исключить'].includes(n))return 'na'}if(field==='tax'){const n=norm(s);if(['true','yes','да','вычитается','deductible'].includes(n))return 'yes';if(['false','no','нет','не_вычитается','non_deductible'].includes(n))return 'no'}if(field==='treat'){const map={inventory:'cogs',cogs:'cogs',contra:'contraRevenue',contra_revenue:'contraRevenue',variable:'variableSelling',variable_selling:'variableSelling',marketing:'marketing',fixed:'fixedOpex',fixed_opex:'fixedOpex',depr:'depr',depreciation:'depr',finance:'finance'};return map[norm(s)]||s}if(field==='mode'){const map={unit:'unit',pct:'pct',percent:'pct',percentage:'pct',period:'annual',annual:'annual'};return map[norm(s)]||s}if(field==='applies'){if(Array.isArray(v))return v.length===1?v[0]:'all';const n=norm(s);if(n.includes('retail')||n.includes('сет'))return 'retail';if(n.includes('dtc')||n.includes('прям'))return 'dtc';if(n.includes('partner')||n.includes('парт'))return 'partner';return 'all'}return v}
  function normalizeAll(actions){return (actions||[]).map(mapGenericAction).filter(a=>a&&a.type&&a.type!=='none')}
  const originalRender=v91RenderActions;
  v91RenderActions=function(warnings){v91Pending=normalizeAll(v91Pending);return originalRender(warnings)};
  v91RenderActions([]);
  applyV9AiActions=function(){
   if(!v91Pending.length)return;v91Undo={inputs:getInputState(),params:JSON.parse(JSON.stringify(params))};
   try{
    const actions=normalizeAll(v91Pending),allowed=v91Snapshot().allowedActions;
    for(const x of actions){
     if(!x.field)throw Error('AI не указал изменяемое поле');
     if(x.type==='set_input'){
      if(!allowed.set_input.includes(x.field))throw Error('Недопустимое поле: '+x.field);
      const e=document.getElementById(x.field);if(!e)throw Error('Поле не найдено: '+x.field);
      const raw=normalizeValue(x.value_text,x.field,x.target);e.value=v91Parse(raw,x.field);
     }else if(x.type==='set_param'){
      const idx=Number(x.target);if(!allowed.set_param.includes(x.field)||!params[idx])throw Error('Строка расхода не найдена');
      const raw=normalizeValue(x.value_text,x.field,idx);params[idx][x.field]=v91Parse(raw,x.field);
     }else throw Error('Недопустимое действие: '+x.type);
    }
    renderParams();syncRanges();recalc();v91Pending=[];v91RenderActions([]);v91Append('Изменения применены и расчёт обновлён.');
   }catch(e){undoV9AiChange();v91Append('Изменения не применены: '+e.message)}
  };
  window.__v92AiActionFix='${VERSION}';
 })();`;
 const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);d.documentElement.dataset.v92AiActionFix=VERSION;return true;
}
frame.addEventListener('load',()=>setTimeout(install,1100));
const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
setTimeout(()=>clearInterval(timer),30000);
})();