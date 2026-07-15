'use strict';
const assert=require('assert');
const {normalizeActions}=require('../margin-calculators/ai-proxy/action-normalizer-v2');

const v10={
  version:'v10.2',
  allowedActions:{set_expense:['status','value'],set_channel:['sellInReductionPct'],set_product:['approvedRrpGross']},
  expenses:[{id:'customs_cert',name:'Таможня, пошлина и сертификация'},{id:'sales_team',name:'Команда продаж и коммерческий OPEX'}],
  channels:{retail:{id:'retail',name:'Сети'},dtc:{id:'dtc',name:'DTC / прямые'}}
};
let a=normalizeActions([{type:'set_expense',target:'customs_cert',changes:{status:'include'}}],v10,true);
assert.deepStrictEqual(a[0],{type:'set_expense',target:'customs_cert',field:'status',value_text:'include',reason:''});
a=normalizeActions([{type:'set_expense',target:'customs_cert',changes:{field:'status',value:'include'}}],v10,true);
assert.deepStrictEqual(a[0],{type:'set_expense',target:'customs_cert',field:'status',value_text:'include',reason:''});
a=normalizeActions([{type:'set_expense',target:'customs_cert',field:'status',reason:'Перевести расход в include'}],v10,true);
assert.strictEqual(a[0].value_text,'include');
a=normalizeActions([{type:'set_channel',channel:'Сети',changes:{sellInReductionPct:23}}],v10,true);
assert.deepStrictEqual(a[0],{type:'set_channel',target:'retail',field:'sellInReductionPct',value_text:'23',reason:''});
a=normalizeActions([{type:'set_expense',target:'customs_cert'}],v10,true);
assert.deepStrictEqual(a,[]);

const v9={
  version:'v9.2',
  allowedActions:{set_input:['retail_commission','partner_commission','dtc_discount'],set_param:['status','amount','pct','base','treat']},
  expenses:[
    {name:'Входящая логистика до склада',mode:'pct'},
    {name:'Команда продаж и коммерческий OPEX',mode:'pct'},
    {name:'Таможня, пошлина и сертификация',mode:'amount'}
  ]
};
a=normalizeActions([{type:'set_expense',target:'sales_team',field:'value',value_text:'1.5'}],v9,true);
assert.deepStrictEqual(a[0],{type:'set_param',target:'1',field:'pct',value_text:'1.5',reason:''});
a=normalizeActions([{type:'set_expense',target:'customs_cert',field:'status',reason:'Включить расход'}],v9,true);
assert.deepStrictEqual(a[0],{type:'set_param',target:'2',field:'status',value_text:'included',reason:'Включить расход'});
a=normalizeActions([{type:'set_channel',channel:'retail',field:'sellInReductionPct',value:23}],v9,true);
assert.deepStrictEqual(a[0],{type:'set_input',target:'',field:'retail_commission',value_text:23,reason:''});
assert.deepStrictEqual(normalizeActions([{type:'set_expense',target:'sales_team',field:'value',value:1}],v9,false),[]);
console.log('AI action normalizer regression tests passed');
