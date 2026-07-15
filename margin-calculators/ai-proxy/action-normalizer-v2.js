'use strict';
const base=require('./action-normalizer');
const FIELD_KEYS=['field','field_name','fieldName','parameter','parameter_name','parameterName','property','key','metric','setting','path'];
const CONTAINER_KEYS=['changes','change','fields','updates','update','payload','data','parameters'];
const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&!(typeof v==='string'&&v.trim()===''));
const directField=obj=>first(...FIELD_KEYS.map(k=>obj?.[k]));
function children(obj){const out=[];for(const k of CONTAINER_KEYS){const v=obj?.[k];if(Array.isArray(v))out.push(...v.filter(x=>x&&typeof x==='object'));else if(v&&typeof v==='object')out.push(v)}return out}
function clearContainers(obj){const out={...obj};for(const k of CONTAINER_KEYS)delete out[k];return out}
function expand(raw,depth=0){
  if(!raw||typeof raw!=='object'||depth>5)return [];
  if(directField(raw)!==undefined)return [raw];
  const nested=children(raw);
  const actionChildren=nested.filter(x=>directField(x)!==undefined||children(x).length);
  if(actionChildren.length){const parent=clearContainers(raw);return actionChildren.flatMap(child=>expand({...parent,...child},depth+1))}
  return [raw];
}
function normalizeActions(rawActions,snapshot,allowActions=true){
  const expanded=(Array.isArray(rawActions)?rawActions:[]).flatMap(a=>expand(a));
  return base.normalizeActions(expanded,snapshot,allowActions);
}
module.exports={normalizeActions,norm:base.norm};
