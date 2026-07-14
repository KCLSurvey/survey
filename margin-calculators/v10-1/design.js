(()=>{const frame=document.getElementById('app');function install(){let w,d;try{w=frame.contentWindow;d=frame.contentDocument}catch{return false}if(!d||!d.querySelector('#view-expenses')||!w.state)return false;if(d.getElementById('v101-design-style'))return true;const st=d.createElement('style');st.id='v101-design-style';st.textContent=`
#view-expenses .expense-table tbody tr.v101-included>td{background:rgba(34,197,94,.09)!important;border-top-color:rgba(22,163,74,.18)!important;border-bottom-color:rgba(22,163,74,.18)!important}
#view-expenses .expense-table tbody tr.v101-included input,#view-expenses .expense-table tbody tr.v101-included select{background:rgba(255,255,255,.7)!important}
#view-expenses .expense-table tbody tr.v101-included:hover>td{background:rgba(34,197,94,.13)!important}
#view-expenses .v101-scroll-top{overflow-x:auto;overflow-y:hidden;height:18px;border:1px solid var(--line);border-radius:9px;background:#fafbfc;margin:8px 0 5px}
#view-expenses .v101-scroll-top>div{height:1px}
#view-decision .form-grid{align-items:stretch}
#view-decision .form-grid>.field,#view-decision .scenario-row>.field{display:grid;grid-template-rows:minmax(34px,auto) 38px;align-content:start}
#view-decision .form-grid>.field>label,#view-decision .scenario-row>.field>label{align-self:end;line-height:1.25;margin:0 0 6px;min-height:28px}
#view-decision .form-grid>.field>input,#view-decision .form-grid>.field>select,#view-decision .scenario-row>.field>input,#view-decision .scenario-row>.field>select{height:38px;min-height:38px}
#view-decision .answer-card{display:grid;grid-template-rows:minmax(28px,auto) auto minmax(26px,auto);align-content:start}
#view-decision .answer-card .label{line-height:1.25;margin-bottom:7px;align-self:end}
#view-decision .answer-card .value{line-height:1.15;min-height:24px;display:flex;align-items:center}
#view-decision .answer-card .small{line-height:1.3;align-self:start}
#view-decision .channel-card{display:flex;flex-direction:column;height:100%}
#view-decision .channel-card .form-grid{flex:1}
#view-decision .price-ladder{align-items:stretch}
#view-decision .price-box{display:grid;grid-template-rows:minmax(28px,auto) auto minmax(26px,auto);align-content:start;height:100%}
#view-decision .price-box .p-label{line-height:1.25;align-self:end}
#view-decision .price-box .p-value{line-height:1.15;min-height:24px;display:flex;align-items:center}
#view-decision .price-box .p-note{line-height:1.3}
#view-decision table th,#view-decision table td{vertical-align:middle;line-height:1.35}
#view-decision .card>h2{line-height:1.25;min-height:26px;display:flex;align-items:center}
@media(max-width:760px){#view-decision .form-grid>.field,#view-decision .scenario-row>.field{grid-template-rows:auto 44px}#view-decision .form-grid>.field>label,#view-decision .scenario-row>.field>label{min-height:0;align-self:start}#view-decision .form-grid>.field>input,#view-decision .form-grid>.field>select,#view-decision .scenario-row>.field>input,#view-decision .scenario-row>.field>select{height:44px;min-height:44px}}
`;d.head.appendChild(st);
const markExpenses=()=>{const filter=d.getElementById('expense_filter')?.value||'all';const rows=(w.state.expenses||[]).filter(e=>filter==='all'||e.category===filter);d.querySelectorAll('#expense_body tr').forEach((tr,i)=>tr.classList.toggle('v101-included',rows[i]?.status==='include'))};
const ensureScroll=()=>{const wrap=d.querySelector('#view-expenses .table-wrap.tall'),table=d.querySelector('#view-expenses .expense-table');if(!wrap||!table)return;let top=d.getElementById('v101_expense_scroll_top');if(!top){top=d.createElement('div');top.id='v101_expense_scroll_top';top.className='v101-scroll-top';top.innerHTML='<div></div>';wrap.before(top);let lock=false;top.addEventListener('scroll',()=>{if(lock)return;lock=true;wrap.scrollLeft=top.scrollLeft;lock=false});wrap.addEventListener('scroll',()=>{if(lock)return;lock=true;top.scrollLeft=wrap.scrollLeft;lock=false})}const size=()=>{if(top.firstElementChild)top.firstElementChild.style.width=Math.max(table.scrollWidth,wrap.clientWidth)+'px'};size();if(w.ResizeObserver&&!top._ro){top._ro=new w.ResizeObserver(size);top._ro.observe(table)}w.addEventListener('resize',size,{passive:true})};
const old=w.renderExpenses;if(typeof old==='function'){w.renderExpenses=function(){const r=old.apply(this,arguments);markExpenses();ensureScroll();return r}}d.getElementById('expense_body')?.addEventListener('change',()=>setTimeout(markExpenses,0));markExpenses();ensureScroll();return true}
frame.addEventListener('load',()=>setTimeout(install,350));const t=setInterval(()=>{if(install())clearInterval(t)},300);setTimeout(()=>clearInterval(t),20000)})();