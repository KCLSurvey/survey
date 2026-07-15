(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MarginSessionStoreCore=api;
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const DEFAULT_LIMIT=3;
  function safeParse(raw){
    if(!raw) return [];
    try{
      const value=JSON.parse(raw);
      return Array.isArray(value)?value:[];
    }catch{return []}
  }
  function clean(list,limit=DEFAULT_LIMIT){
    return (Array.isArray(list)?list:[])
      .filter(x=>x&&typeof x==='object'&&x.id&&x.savedAt&&x.snapshot)
      .sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)))
      .slice(0,Math.max(1,Number(limit)||DEFAULT_LIMIT));
  }
  function read(storage,key,limit=DEFAULT_LIMIT){
    try{return clean(safeParse(storage.getItem(key)),limit)}catch{return []}
  }
  function write(storage,key,list,limit=DEFAULT_LIMIT){
    const cleaned=clean(list,limit);
    storage.setItem(key,JSON.stringify(cleaned));
    return cleaned;
  }
  function save(storage,key,session,limit=DEFAULT_LIMIT){
    if(!session||!session.snapshot) throw new Error('Пустой снимок сессии');
    const item={
      id:String(session.id||('s_'+Date.now()+'_'+Math.random().toString(36).slice(2,8))),
      name:String(session.name||'Сессия'),
      savedAt:String(session.savedAt||new Date().toISOString()),
      summary:String(session.summary||''),
      snapshot:session.snapshot
    };
    const existing=read(storage,key,limit).filter(x=>x.id!==item.id);
    return write(storage,key,[item,...existing],limit);
  }
  function remove(storage,key,id,limit=DEFAULT_LIMIT){
    return write(storage,key,read(storage,key,limit).filter(x=>x.id!==id),limit);
  }
  return {DEFAULT_LIMIT,safeParse,clean,read,write,save,remove};
});