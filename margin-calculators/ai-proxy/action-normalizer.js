'use strict';

const ACTION_TYPES = new Set(['set_input','set_param','set_global','set_product','set_channel','set_expense','set_sku','set_cash']);
const TYPE_ALIASES = {
  setinput:'set_input', set_input:'set_input', input:'set_input',
  setparam:'set_param', set_param:'set_param', param:'set_param',
  setglobal:'set_global', set_global:'set_global', global:'set_global',
  setproduct:'set_product', set_product:'set_product', product:'set_product',
  setchannel:'set_channel', set_channel:'set_channel', update_channel:'set_channel', channel:'set_channel',
  setexpense:'set_expense', set_expense:'set_expense', update_expense:'set_expense', expense:'set_expense',
  setsku:'set_sku', set_sku:'set_sku', sku:'set_sku',
  setcash:'set_cash', set_cash:'set_cash', cash:'set_cash'
};
const FIELD_KEYS = ['field','field_name','fieldName','parameter','parameter_name','parameterName','property','key','metric','setting','path'];
const VALUE_KEYS = ['value_text','valueText','value','new_value','newValue','new_value_text','newValueText','proposed_value','proposedValue','proposed_value_text','proposedValueText','target_value','targetValue','amount','rate','percentage','percent','pct','to'];
const CONTAINER_KEYS = ['changes','change','fields','updates','update','payload','data','parameters'];
const FIELD_ALIASES = {
  expense_status:'status', new_status:'status', target_status:'status', state:'status',
  sell_in_reduction:'sellInReductionPct', sell_in_reduction_pct:'sellInReductionPct', sellinreductionpct:'sellInReductionPct', commission:'sellInReductionPct', commission_pct:'sellInReductionPct', channel_commission:'sellInReductionPct',
  invoice_discount:'invoiceDiscountPct', invoice_discount_pct:'invoiceDiscountPct', rebate:'rebatePct', rebate_pct:'rebatePct', returns:'returnsPct', returns_pct:'returnsPct', payment_fee:'paymentFeePct', payment_fee_pct:'paymentFeePct', last_mile:'lastMilePerUnit', last_mile_per_unit:'lastMilePerUnit',
  approved_price:'approvedRrpGross', approved_rrp:'approvedRrpGross', rrp:'approvedRrpGross', purchase_price:'purchasePrice', target:'targetValue', target_value:'targetValue', vat_rate:'vatRate', income_tax_rate:'incomeTaxRate', owner_tax_rate:'ownerTaxRate',
  expense_value:'value', rate:'value', percentage:'value', percent:'value', pct:'value'
};
const V9_INPUT_ALIASES = {
  approved_rrp_gross:'rrp', approved_price:'rrp', rrp:'rrp', purchase_price:'cogs', purchaseprice:'cogs', cogs:'cogs', vat_rate:'vat', vatrate:'vat', income_tax_rate:'income_tax', incometaxrate:'income_tax', target_value:'single_target_margin', target_margin:'single_target_margin', sold_units:'units_total', purchased_units:'units_total', sku:'single_sku'
};
const V9_PARAM_ALIASES = {
  expense_status:'status', new_status:'status', target_status:'status', status:'status', expense_name:'name', channels:'applies', channel:'applies', sku_mode:'skuMode', sku_list:'skuList', method:'mode', expense_method:'mode', value:'value', expense_value:'value', rate:'value', percentage:'value', percent:'value', pct:'value', base:'base', category:'treat', expense_category:'treat', vat_treatment:'vatTreatment', tax_deductible:'tax'
};
const STANDARD_EXPENSE_ALIASES = {
  inbound_logistics:['входящ','логист','inbound'], customs_cert:['тамож','пошлин','сертифик','customs'], warehouse_after_ready:['склад','warehouse'], warranty_returns:['гарант','сервис','warranty'], dtc_lastmile:['последн','мил','lastmile'], retail_bonus:['ретро','бонус'], trade_marketing:['trade','marketing'], performance_marketing:['performance','media'], sales_team:['команда','продаж','sales'], admin_opex:['администр','admin'], bad_debt:['безнадеж','просроч','debt'], depreciation:['амортизац','depreciation'], finance_cost:['финансир','процент','finance'], cash_only:['денежн','выплат','cash']
};

function first(...values) { return values.find(v => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')); }
function norm(value) { return String(value ?? '').trim().toLowerCase().replace(/ё/g,'е').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zа-я0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function scalar(value) { return value && typeof value === 'object' && !Array.isArray(value) ? first(value.id,value.key,value.code,value.name,value.label,value.value) : value; }
function canonicalType(raw) { const n=norm(raw); return TYPE_ALIASES[n.replace(/_/g,'')] || TYPE_ALIASES[n] || String(raw || ''); }
function children(obj) { const out=[]; for (const key of CONTAINER_KEYS) { const v=obj?.[key]; if (Array.isArray(v)) out.push(...v.filter(x=>x&&typeof x==='object')); else if (v&&typeof v==='object') out.push(v); } return out; }
function directField(obj) { return first(...FIELD_KEYS.map(k=>obj?.[k])); }
function directValue(obj) { return first(...VALUE_KEYS.map(k=>obj?.[k])); }
function allowed(snapshot,type) { return Array.isArray(snapshot?.allowedActions?.[type]) ? snapshot.allowedActions[type] : []; }
function canonicalField(raw,type,snapshot) {
  const text=String(scalar(raw) ?? '').split('.').pop(); const n=norm(text); const fields=allowed(snapshot,type);
  const exact=fields.find(f=>norm(f)===n); if (exact) return exact;
  const alias=FIELD_ALIASES[n]; if (alias && (!fields.length || fields.includes(alias))) return alias;
  if (type==='set_input') { const v=V9_INPUT_ALIASES[n]; if (v && (!fields.length || fields.includes(v))) return v; }
  if (type==='set_param') { const v=V9_PARAM_ALIASES[n]; if (v && (!fields.length || fields.includes(v))) return v; }
  return text;
}
function nestedValue(obj,field,type,snapshot,depth=0) {
  if (!obj || typeof obj!=='object' || depth>5) return undefined;
  let value=directValue(obj); if (value!==undefined) return value;
  for (const [key,v] of Object.entries(obj)) {
    if (CONTAINER_KEYS.includes(key)) continue;
    if (canonicalField(key,type,snapshot)===field && v!==undefined && v!==null && !(typeof v==='string'&&v.trim()==='')) return v;
  }
  for (const child of children(obj)) { value=nestedValue(child,field,type,snapshot,depth+1); if (value!==undefined) return value; }
  return undefined;
}
function inferStatus(action) {
  const direct=first(action.status,action.new_status,action.newStatus,action.target_status,action.targetStatus,action.state); if (direct!==undefined) return direct;
  for (const child of children(action)) { const v=first(child.status,child.new_status,child.newStatus,child.target_status,child.targetStatus,child.state); if (v!==undefined) return v; }
  const flag=first(action.include,action.included,action.enabled); if (typeof flag==='boolean') return flag?'include':'na';
  const text=norm([action.action,action.action_type,action.reason,action.description,action.name].filter(Boolean).join(' '));
  if (/(^|_)(include|included|учесть|включить|активировать)($|_)/.test(text)) return 'include';
  if (/(^|_)(review|проверить)($|_)/.test(text)) return 'review';
  if (/(^|_)(na|exclude|excluded|не_применимо|исключить|отключить)($|_)/.test(text)) return 'na';
  return undefined;
}
function normalizeStatus(value,version) {
  if (value===true) return version.startsWith('v9')?'included':'include';
  if (value===false) return 'na';
  const n=norm(value);
  if (['include','included','учесть','включить','активировать'].includes(n)) return version.startsWith('v9')?'included':'include';
  if (['review','проверить'].includes(n)) return 'review';
  if (['na','exclude','excluded','не_применимо','исключить','отключить'].includes(n)) return 'na';
  return value;
}
function resolveChannel(action,snapshot) {
  const raw=first(action.target,action.target_id,action.targetId,action.channel,action.channel_id,action.channelId,action.entity,action.entity_id,action.entityId,action.id);
  const hint=norm([scalar(raw),action.reason,action.description,action.name].filter(Boolean).join(' '));
  const map={retail:'retail',network:'retail',networks:'retail',сеть:'retail',сети:'retail',розница:'retail',dtc:'dtc',direct:'dtc',прямые:'dtc',прямой:'dtc',partner:'partner',partners:'partner',партнер:'partner',партнеры:'partner',партнёр:'partner',партнёры:'partner'};
  for (const [alias,id] of Object.entries(map)) if (hint===alias||hint.includes('_'+alias+'_')||hint.startsWith(alias+'_')||hint.endsWith('_'+alias)) return id;
  for (const [id,ch] of Object.entries(snapshot?.channels||{})) if (norm(raw)===norm(id)||norm(raw)===norm(ch?.name)) return id;
  return String(scalar(raw)||'');
}
function resolveExpenseTarget(action,snapshot) {
  const items=Array.isArray(snapshot?.expenses)?snapshot.expenses:[];
  const sources=[action.target,action.target_id,action.targetId,action.expense,action.expense_id,action.expenseId,action.entity,action.entity_id,action.entityId,action.id,action.name,action.expense_name,action.expenseName,action.reason,action.description].map(scalar).filter(v=>v!==undefined&&String(v).trim()!=='');
  for (const raw of sources) {
    const n=Number(raw); if (Number.isInteger(n)&&items[n]) return snapshot?.version?.startsWith('v9')?String(n):String(items[n].id||n);
    const key=norm(raw); const exact=items.findIndex(x=>[x?.id,x?.key,x?.code,x?.name].filter(Boolean).map(norm).includes(key)); if (exact>=0) return snapshot?.version?.startsWith('v9')?String(exact):String(items[exact].id||exact);
  }
  const text=norm(sources.join(' '));
  for (const [id,tokens] of Object.entries(STANDARD_EXPENSE_ALIASES)) {
    if (text.includes(norm(id)) || tokens.some(t=>text.includes(norm(t)))) {
      const matches=items.map((x,i)=>({x,i,n:norm([x?.id,x?.name].filter(Boolean).join(' '))})).filter(o=>o.n.includes(norm(id))||tokens.some(t=>o.n.includes(norm(t))));
      if (matches.length===1) return snapshot?.version?.startsWith('v9')?String(matches[0].i):String(matches[0].x.id||matches[0].i);
    }
  }
  return String(scalar(first(action.target,action.expense,action.id))||'');
}
function inferPairs(action,type,snapshot) {
  const pairs=[];
  for (const child of children(action)) for (const [key,value] of Object.entries(child)) { const field=canonicalField(key,type,snapshot); if (field && (allowed(snapshot,type).includes(field)||!allowed(snapshot,type).length)) pairs.push([field,value]); }
  for (const [key,value] of Object.entries(action)) {
    if ([...FIELD_KEYS,...VALUE_KEYS,...CONTAINER_KEYS,'type','action','action_type','actionType','target','target_id','targetId','channel','channel_id','channelId','expense','expense_id','expenseId','entity','entity_id','entityId','id','name','reason','description'].includes(key)) continue;
    const field=canonicalField(key,type,snapshot); if (field && (allowed(snapshot,type).includes(field)||!allowed(snapshot,type).length)) pairs.push([field,value]);
  }
  return pairs.filter((p,i,a)=>a.findIndex(x=>x[0]===p[0])===i);
}
function convertV9Channel(action,field,value) {
  const channel=resolveChannel(action,{}); const f=norm(field); let mapped='';
  if (['share','channel_share','share_pct'].includes(f)) mapped='share_'+channel;
  else if (['sell_in_reduction_pct','sellinreductionpct','sell_in_reduction','commission','commission_pct','channel_commission'].includes(f)) mapped=channel==='retail'?'retail_commission':channel==='partner'?'partner_commission':channel==='dtc'?'dtc_discount':'';
  return {type:'set_input',target:'',field:mapped,value_text:value,reason:String(action.reason||'')};
}
function expandAction(raw,snapshot) {
  const action={...(raw||{})}; let type=canonicalType(first(action.type,action.action,action.action_type,action.actionType));
  if (!ACTION_TYPES.has(type)) return [];
  let field=canonicalField(directField(action),type,snapshot); let value;
  if (!field) {
    const pairs=inferPairs(action,type,snapshot);
    if (pairs.length) return pairs.flatMap(([f,v])=>expandAction({...action,field:f,value_text:v},snapshot));
    if (type==='set_expense' && inferStatus(action)!==undefined) field='status';
  }
  if (field) value=nestedValue(action,field,type,snapshot);
  if (value===undefined && field==='status') value=inferStatus(action);
  const version=String(snapshot?.version||'');
  if (field==='status' && value!==undefined) value=normalizeStatus(value,version);
  if (version.startsWith('v9') && type==='set_channel') return [convertV9Channel(action,field,value)];
  if (version.startsWith('v9') && type==='set_expense') type='set_param';
  let target='';
  if (type==='set_channel') target=resolveChannel(action,snapshot);
  else if (type==='set_expense'||type==='set_param') target=resolveExpenseTarget(action,snapshot);
  else target=String(scalar(first(action.target,action.target_id,action.targetId,action.sku,action.sku_id,action.skuId,action.id))||'');
  if (version.startsWith('v9') && type==='set_param' && field==='value') {
    const idx=Number(target),mode=String(snapshot?.expenses?.[idx]?.mode||''); field=mode.includes('pct')?'pct':'amount';
  }
  return [{type,target,field:String(field||''),value_text:value===undefined?'':String(value),reason:String(action.reason||'')}];
}
function normalizeActions(rawActions,snapshot,allowActions=true) {
  if (!allowActions) return [];
  const actions=(Array.isArray(rawActions)?rawActions:[]).flatMap(a=>expandAction(a,snapshot));
  return actions.filter(a=>a&&ACTION_TYPES.has(a.type)&&a.field&&a.value_text!==''&&a.value_text!=='undefined').slice(0,30);
}
module.exports={normalizeActions,norm};
