(()=>{
  'use strict';
  const frame=document.getElementById('app');
  const Core=window.MarginSessionStoreCore;
  const KEY='marginCalcV92Sessions';
  const LIMIT=3;
  if(!frame||!Core) return;
  function sessions(){return Core.read(localStorage,KEY,LIMIT)}
  function formatDate(value){try{return new Date(value).toLocaleString('ru-RU')}catch{return value}}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureModal(){
    let modal=document.getElementById('session_modal_v92');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='session_modal_v92';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.42);padding:18px;align-items:center;justify-content:center';
    modal.innerHTML='<div style="width:min(560px,100%);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.3)"><div style="display:flex;align-items:center;gap:10px"><b style="font-size:18px;flex:1">Последние сохранённые сессии v9.2</b><button id="session_close_v92" style="border:0;background:#eef2f6;border-radius:9px;padding:7px 10px">Закрыть</button></div><div id="session_list_v92" style="display:grid;gap:10px;margin-top:14px"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#session_close_v92').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
    return modal;
  }
  function renderPicker(){
    const modal=ensureModal(),list=modal.querySelector('#session_list_v92'),items=sessions();
    list.innerHTML=items.length?items.map(x=>`<div style="border:1px solid #d7dde5;border-radius:13px;padding:12px"><div style="font-weight:800">${escapeHtml(x.name)}</div><div style="font-size:12px;color:#667085;margin-top:3px">${escapeHtml(formatDate(x.savedAt))}</div><div style="font-size:12px;color:#344054;margin-top:7px">${escapeHtml(x.summary||'')}</div><div style="display:flex;gap:8px;margin-top:10px"><button data-load="${escapeHtml(x.id)}" style="border:0;background:#2563eb;color:#fff;border-radius:9px;padding:8px 12px;font-weight:700">Загрузить</button><button data-delete="${escapeHtml(x.id)}" style="border:1px solid #d7dde5;background:#fff;border-radius:9px;padding:8px 12px">Удалить</button></div></div>`).join(''):'<div style="padding:14px;background:#f8fafc;border-radius:12px;color:#667085">Сохранённых сессий пока нет.</div>';
    list.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadById(b.dataset.load));
    list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{Core.remove(localStorage,KEY,b.dataset.delete,LIMIT);renderPicker()});
    modal.style.display='flex';
  }
  function saveSnapshot(snapshot){
    const suggested=snapshot.suggestedName||'Сессия v9.2';
    const name=prompt('Название сохраняемой сессии',suggested);
    if(name===null) return;
    Core.save(localStorage,KEY,{name:name.trim()||suggested,summary:snapshot.summary||'',snapshot},LIMIT);
    alert('Сессия сохранена. Доступны последние три сохранения.');
  }
  function loadById(id){
    const item=sessions().find(x=>x.id===id);
    if(!item) return alert('Сессия не найдена.');
    const restore=frame.contentWindow&&frame.contentWindow.__marginV92Restore;
    if(typeof restore!=='function') return alert('Калькулятор ещё загружается. Повторите через несколько секунд.');
    restore(item.snapshot);
    ensureModal().style.display='none';
  }
  window.MarginSessionBridgeV92={save:saveSnapshot,open:renderPicker};
  function install(){
    let d,w;
    try{d=frame.contentDocument;w=frame.contentWindow}catch{return false}
    if(!d||!d.body||typeof w.recalc!=='function'||typeof w.getInputState!=='function') return false;
    if(d.documentElement.dataset.sessionV92==='installed') return true;
    const code=`(()=>{
      const clone=x=>JSON.parse(JSON.stringify(x));
      function captureForm(){const out={};document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{if(el.type==='file')return;out[el.id]={value:el.value,checked:!!el.checked,type:el.type}});return out}
      function restoreForm(form){Object.entries(form||{}).forEach(([id,x])=>{const el=document.getElementById(id);if(!el||el.type==='file')return;if(x&&Object.prototype.hasOwnProperty.call(x,'checked')&&(el.type==='checkbox'||el.type==='radio'))el.checked=!!x.checked;if(x&&Object.prototype.hasOwnProperty.call(x,'value'))el.value=x.value})}
      window.__marginV92Capture=function(){
        if(!lastResult)recalc();const chat=document.getElementById('chat_log');
        const activeView=document.getElementById('multi-view')?.style.display==='block'?'multi':'single';
        return {schema:1,calculator:'v9.2',savedAt:new Date().toISOString(),suggestedName:'Сценарий v9.2 — '+new Date().toLocaleString('ru-RU'),summary:'Net profit '+money(lastResult?.netProfit||0)+'; Gross margin '+pct(lastResult?.grossMargin||0),inputs:getInputState(),params:clone(params||[]),multiData:clone(typeof multiData!=='undefined'?multiData:[]),form:captureForm(),chatHtml:chat?chat.innerHTML:'',activeView};
      };
      window.__marginV92Restore=function(snap){
        if(!snap||!snap.inputs)throw new Error('Повреждённый снимок v9.2');
        params=Array.isArray(snap.params)?clone(snap.params):params;renderParams();
        if(typeof multiData!=='undefined')multiData=Array.isArray(snap.multiData)?clone(snap.multiData):[];
        setInputState(snap.inputs,false);restoreForm(snap.form);syncRanges();renderParams();
        if(typeof renderMultiTable==='function')renderMultiTable();if(typeof calculateMultiPrices==='function'&&multiData.length)calculateMultiPrices();
        recalc();if(typeof switchView==='function')switchView(snap.activeView==='multi'?'multi':'single');
        const chat=document.getElementById('chat_log');if(chat&&snap.chatHtml)chat.innerHTML=snap.chatHtml;
        if(chat){chat.innerHTML+='<div class="chat-msg chat-bot">Загружена сохранённая сессия v9.2.</div>';chat.scrollTop=chat.scrollHeight}
      };
      saveScenario=function(){parent.MarginSessionBridgeV92.save(window.__marginV92Capture())};
      loadScenario=function(){parent.MarginSessionBridgeV92.open()};
      window.saveScenario=saveScenario;window.loadScenario=loadScenario;
    })();`;
    const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);
    d.documentElement.dataset.sessionV92='installed';
    return true;
  }
  frame.addEventListener('load',()=>setTimeout(install,1000));
  const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
  setTimeout(()=>clearInterval(timer),30000);
})();