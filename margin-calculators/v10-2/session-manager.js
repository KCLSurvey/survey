(()=>{
  'use strict';
  const frame=document.getElementById('app');
  const Core=window.MarginSessionStoreCore;
  const KEY='marginCalcV102Sessions';
  const LIMIT=3;
  if(!frame||!Core) return;
  function sessions(){return Core.read(localStorage,KEY,LIMIT)}
  function formatDate(value){try{return new Date(value).toLocaleString('ru-RU')}catch{return value}}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureModal(){
    let modal=document.getElementById('session_modal_v102');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='session_modal_v102';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.42);padding:18px;align-items:center;justify-content:center';
    modal.innerHTML='<div style="width:min(560px,100%);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.3)"><div style="display:flex;align-items:center;gap:10px"><b style="font-size:18px;flex:1">Последние сохранённые сессии v10.2</b><button id="session_close_v102" style="border:0;background:#eef2f6;border-radius:9px;padding:7px 10px">Закрыть</button></div><div id="session_list_v102" style="display:grid;gap:10px;margin-top:14px"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#session_close_v102').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
    return modal;
  }
  function renderPicker(){
    const modal=ensureModal(),list=modal.querySelector('#session_list_v102'),items=sessions();
    list.innerHTML=items.length?items.map(x=>`<div style="border:1px solid #d7dde5;border-radius:13px;padding:12px"><div style="font-weight:800">${escapeHtml(x.name)}</div><div style="font-size:12px;color:#667085;margin-top:3px">${escapeHtml(formatDate(x.savedAt))}</div><div style="font-size:12px;color:#344054;margin-top:7px">${escapeHtml(x.summary||'')}</div><div style="display:flex;gap:8px;margin-top:10px"><button data-load="${escapeHtml(x.id)}" style="border:0;background:#183153;color:#fff;border-radius:9px;padding:8px 12px;font-weight:700">Загрузить</button><button data-delete="${escapeHtml(x.id)}" style="border:1px solid #d7dde5;background:#fff;border-radius:9px;padding:8px 12px">Удалить</button></div></div>`).join(''):'<div style="padding:14px;background:#f8fafc;border-radius:12px;color:#667085">Сохранённых сессий пока нет.</div>';
    list.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadById(b.dataset.load));
    list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{Core.remove(localStorage,KEY,b.dataset.delete,LIMIT);renderPicker()});
    modal.style.display='flex';
  }
  function saveSnapshot(snapshot){
    const suggested=snapshot.suggestedName||'Сессия v10.2';
    const name=prompt('Название сохраняемой сессии',suggested);
    if(name===null) return;
    Core.save(localStorage,KEY,{name:name.trim()||suggested,summary:snapshot.summary||'',snapshot},LIMIT);
    alert('Сессия сохранена. Доступны последние три сохранения.');
  }
  function loadById(id){
    const item=sessions().find(x=>x.id===id);
    if(!item) return alert('Сессия не найдена.');
    const restore=frame.contentWindow&&frame.contentWindow.__marginV102Restore;
    if(typeof restore!=='function') return alert('Калькулятор ещё загружается. Повторите через несколько секунд.');
    restore(item.snapshot);
    ensureModal().style.display='none';
  }
  window.MarginSessionBridgeV102={save:saveSnapshot,open:renderPicker};
  function install(){
    let d,w;
    try{d=frame.contentDocument;w=frame.contentWindow}catch{return false}
    if(!d||!d.body||typeof w.recalculate!=='function') return false;
    if(d.documentElement.dataset.sessionV102==='installed') return true;
    const code=`(()=>{
      const clone=x=>JSON.parse(JSON.stringify(x));
      function captureForm(){const out={};document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{if(el.type==='file')return;out[el.id]={value:el.value,checked:!!el.checked,type:el.type}});return out}
      function restoreForm(form){Object.entries(form||{}).forEach(([id,x])=>{const el=document.getElementById(id);if(!el||el.type==='file')return;if(x&&Object.prototype.hasOwnProperty.call(x,'checked')&&(el.type==='checkbox'||el.type==='radio'))el.checked=!!x.checked;if(x&&Object.prototype.hasOwnProperty.call(x,'value'))el.value=x.value})}
      window.__marginV102Capture=function(){
        const view=document.querySelector('.view.active')?.id?.replace('view-','')||'decision';
        const chat=document.getElementById('ai_chat_log');
        return {schema:1,calculator:'v10.2',savedAt:new Date().toISOString(),suggestedName:(state.scenarioName||'Сценарий')+' — '+new Date().toLocaleString('ru-RU'),summary:'Net profit '+money(singleResult?.totals?.netProfit||0)+'; собственнику '+money(singleResult?.cash?.potentiallyDistributableCash||0),state:clone(state),auditLog:clone(auditLog||[]),form:captureForm(),chatHtml:chat?chat.innerHTML:'',expertMode:document.body.classList.contains('expert-mode'),view};
      };
      window.__marginV102Restore=function(snap){
        if(!snap||!snap.state)throw new Error('Повреждённый снимок v10.2');
        state=E.clone(snap.state);auditLog=Array.isArray(snap.auditLog)?clone(snap.auditLog):[];pendingAiActions=[];lastAiUndo=null;recalculate();restoreForm(snap.form);
        const chat=document.getElementById('ai_chat_log');if(chat&&snap.chatHtml)chat.innerHTML=snap.chatHtml;
        document.body.classList.toggle('expert-mode',!!snap.expertMode);document.body.classList.toggle('simple-mode',!snap.expertMode);
        const mode=document.getElementById('mode_btn');if(mode){mode.textContent=snap.expertMode?'Профессиональный режим':'Простой режим';mode.classList.toggle('active',!!snap.expertMode)}
        if(snap.view&&typeof openView==='function')openView(snap.view);recalculate();if(typeof addChat==='function')addChat('Загружена сохранённая сессия v10.2.','ai');
      };
      saveScenario=function(){parent.MarginSessionBridgeV102.save(window.__marginV102Capture())};
      loadScenario=function(){parent.MarginSessionBridgeV102.open()};
      window.saveScenario=saveScenario;window.loadScenario=loadScenario;
    })();`;
    const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);
    d.documentElement.dataset.sessionV102='installed';
    return true;
  }
  frame.addEventListener('load',()=>setTimeout(install,900));
  const timer=setInterval(()=>{if(install())clearInterval(timer)},350);
  setTimeout(()=>clearInterval(timer),30000);
})();