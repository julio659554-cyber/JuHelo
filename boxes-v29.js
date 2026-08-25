import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const boxes29Db=createClient('https://fjysngoakqbemhjyfima.supabase.co','sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp');
const b29Money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
let boxes29Household=null;
let boxes29State={boxes:[],movements:[]};

function b29Esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function b29Active(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='boxes'}
function b29MonthISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function b29MonthLabel(v){if(!v)return'';const [y,m]=String(v).slice(0,7).split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(y,m-1,1,12)).replace('.','').replace(' de ',' ')}
function b29Toast(message,type=''){
  const root=document.querySelector('#toast-root');if(!root)return;
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;root.appendChild(el);setTimeout(()=>el.remove(),3200);
}
async function b29Household(){
  if(boxes29Household)return boxes29Household;
  const {data:{session}}=await boxes29Db.auth.getSession();if(!session)return null;
  const {data,error}=await boxes29Db.from('household_members').select('household_id').eq('user_id',session.user.id).maybeSingle();if(error)throw error;
  boxes29Household=data?.household_id||null;return boxes29Household;
}
async function b29Load(){
  const household=await b29Household();if(!household)return{boxes:[],movements:[]};
  const [{data:boxes,error:e1},{data:movements,error:e2}]=await Promise.all([
    boxes29Db.from('boxes').select('id,name,target_amount,target_date,is_archived,created_at').eq('household_id',household).eq('is_archived',false).order('created_at'),
    boxes29Db.from('box_movements').select('id,box_id,movement_type,amount,month,description,created_at').eq('household_id',household).order('created_at',{ascending:false})
  ]);
  if(e1)throw e1;if(e2)throw e2;boxes29State={boxes:boxes||[],movements:movements||[]};return boxes29State;
}
function b29Balance(boxId){return boxes29State.movements.filter(m=>m.box_id===boxId).reduce((sum,m)=>sum+(m.movement_type==='deposit'||m.movement_type==='adjustment_in'?Number(m.amount||0):-Number(m.amount||0)),0)}
function b29Icon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16v10H4z"/><path d="M7 9V6h10v3"/><path d="M9 13h6"/></svg>'}
function b29Modal(title,body){
  const wrap=document.createElement('div');wrap.className='modal-backdrop jh29-modal-backdrop';wrap.innerHTML=`<section class="modal-card jh29-modal"><div class="modal-head"><h2>${b29Esc(title)}</h2><button class="icon-btn" type="button" data-close>×</button></div>${body}</section>`;
  document.body.appendChild(wrap);const close=()=>wrap.remove();wrap.querySelector('[data-close]').addEventListener('click',close);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});return wrap;
}
async function b29OpenBox(main,box=null){
  const month=box?.target_date?String(box.target_date).slice(0,7):'';
  const wrap=b29Modal(box?'Editar caixinha':'Nova caixinha',`<form class="form-grid" data-b29-form>
    <div class="field"><label>Nome</label><input class="input" name="name" maxlength="100" value="${b29Esc(box?.name||'')}" required></div>
    <div class="field"><label>Meta de valor <span class="optional">opcional</span></label><input class="input" name="target" type="number" min="0.01" step="0.01" value="${box?.target_amount||''}"></div>
    <div class="field"><label>Prazo <span class="optional">opcional</span></label><input class="input" name="month" type="month" value="${b29Esc(month)}"></div>
    ${box?'<button class="btn ghost" type="button" data-archive>Arquivar caixinha</button>':''}
    <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
  </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click',()=>wrap.remove());
  wrap.querySelector('[data-archive]')?.addEventListener('click',async()=>{
    if(Math.abs(b29Balance(box.id))>0.005)return b29Toast('Zere o saldo antes de arquivar.','error');
    const {error}=await boxes29Db.from('boxes').update({is_archived:true}).eq('id',box.id);if(error)return b29Toast(error.message,'error');
    wrap.remove();b29Toast('Caixinha arquivada.');await b29RenderData(main);
  });
  wrap.querySelector('[data-b29-form]').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const name=String(fd.get('name')||'').trim();if(!name)return;
    const target=String(fd.get('target')||'');const monthVal=String(fd.get('month')||'');
    const payload={name,target_amount:target?Number(target):null,target_date:monthVal?`${monthVal}-01`:null};let error;
    if(box)({error}=await boxes29Db.from('boxes').update(payload).eq('id',box.id));
    else{const household=await b29Household();const {data:{session}}=await boxes29Db.auth.getSession();({error}=await boxes29Db.from('boxes').insert({...payload,household_id:household,created_by:session.user.id}))}
    if(error)return b29Toast(error.message,'error');wrap.remove();b29Toast(box?'Caixinha atualizada.':'Caixinha criada.');await b29RenderData(main);
  });
}
async function b29OpenAdd(main,boxId){
  const boxes=boxes29State.boxes;if(!boxes.length)return b29Toast('Crie uma caixinha primeiro.','error');
  const wrap=b29Modal('Adicionar à caixinha',`<form class="form-grid" data-b29-add>
    <div class="field"><label>Caixinha</label><select class="input" name="box">${boxes.map(b=>`<option value="${b.id}" ${b.id===boxId?'selected':''}>${b29Esc(b.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Valor</label><input class="input" name="amount" type="number" min="0.01" step="0.01" required></div>
    <div class="field"><label>Mês</label><input class="input" name="month" type="month" value="${b29MonthISO()}" required></div>
    <div class="field"><label>Descrição <span class="optional">opcional</span></label><input class="input" name="description"></div>
    <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Adicionar</button></div>
  </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click',()=>wrap.remove());
  wrap.querySelector('[data-b29-add]').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await boxes29Db.rpc('add_box_contribution',{p_box_id:fd.get('box'),p_amount:Number(fd.get('amount')),p_month:`${fd.get('month')}-01`,p_description:String(fd.get('description')||'').trim()||null});
    if(error)return b29Toast(error.message,'error');wrap.remove();await b29RenderData(main);b29Toast('Valor guardado na caixinha.');
  });
}
async function b29OpenWithdraw(main,box){
  const balance=b29Balance(box.id);const wrap=b29Modal('Retirar da caixinha',`<form class="form-grid" data-b29-withdraw>
    <div class="jh29-balance-note">Saldo disponível: <strong>${b29Money.format(balance)}</strong></div>
    <div class="field"><label>Valor</label><input class="input" name="amount" type="number" min="0.01" step="0.01" max="${Math.max(0,balance)}" required></div>
    <div class="field"><label>Mês</label><input class="input" name="month" type="month" value="${b29MonthISO()}" required></div>
    <div class="field"><label>Descrição <span class="optional">opcional</span></label><input class="input" name="description"></div>
    <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Retirar</button></div>
  </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click',()=>wrap.remove());
  wrap.querySelector('[data-b29-withdraw]').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const amount=Number(fd.get('amount'));if(amount>balance)return b29Toast('Saldo insuficiente.','error');
    const {error}=await boxes29Db.rpc('withdraw_from_box',{p_box_id:box.id,p_amount:amount,p_month:`${fd.get('month')}-01`,p_description:String(fd.get('description')||'').trim()||null});
    if(error)return b29Toast(error.message,'error');wrap.remove();await b29RenderData(main);b29Toast('Retirada registrada.');
  });
}
function b29OpenHistory(box){
  const moves=boxes29State.movements.filter(m=>m.box_id===box.id);b29Modal(`Histórico · ${box.name}`,`<div class="jh29-history">
    <div class="jh29-history-balance"><span>Saldo atual</span><strong>${b29Money.format(b29Balance(box.id))}</strong></div>
    ${moves.length?moves.map(m=>`<div class="jh29-history-row"><div><strong>${b29Esc(m.description||(m.movement_type==='withdrawal'?'Retirada':'Depósito'))}</strong><span>${b29Esc(b29MonthLabel(m.month))}</span></div><b class="${m.movement_type==='withdrawal'?'negative':'positive'}">${m.movement_type==='withdrawal'?'−':'+'}${b29Money.format(Number(m.amount||0))}</b></div>`).join(''):'<div class="jh29-empty">Nenhuma movimentação ainda.</div>'}
  </div>`)
}
function b29Card(box){
  const balance=b29Balance(box.id),target=Number(box.target_amount||0),pct=target>0?Math.max(0,Math.min(100,Math.round(balance/target*100))):0;
  return `<article class="jh29-box-card" data-box-id="${box.id}">
    <div class="jh29-box-icon">${b29Icon()}</div><div class="jh29-box-title"><strong>${b29Esc(box.name)}</strong><span>${target?`Meta ${b29Money.format(target)}`:'Sem meta definida'}</span></div><button class="jh29-options" type="button" data-edit>•••</button>
    <div class="jh29-box-balance"><strong>${b29Money.format(balance)}</strong><span>Saldo atual</span></div>
    ${target?`<div class="jh29-box-progress-copy"><span>${pct}% da meta</span><span>${box.target_date?`Até ${b29Esc(b29MonthLabel(box.target_date))}`:'Sem prazo'}</span></div><div class="jh29-progress"><span style="width:${pct}%"></span></div><p class="jh29-box-target">${balance>=target?'Meta atingida.':`Faltam ${b29Money.format(target-balance)} para o objetivo.`}</p>`:''}
    <div class="jh29-box-actions"><button type="button" class="primary" data-add>Adicionar</button><button type="button" data-withdraw>Retirar</button><button type="button" data-history>Histórico</button></div>
  </article>`;
}
async function b29RenderData(main){
  const root=main.querySelector('.jh29-boxes-root');if(!root)return;root.classList.add('loading');
  try{await b29Load();if(!document.body.contains(main)||!b29Active())return;
    root.innerHTML=`<div class="jh29-page-actions"><button class="jh29-create" type="button" data-new-box>+ Nova caixinha</button></div><div class="jh29-boxes-list">${boxes29State.boxes.length?boxes29State.boxes.map(b29Card).join(''):'<div class="jh29-empty-card">Crie a primeira caixinha de vocês.</div>'}</div>`;
    root.querySelector('[data-new-box]').addEventListener('click',()=>b29OpenBox(main));
    root.querySelectorAll('[data-box-id]').forEach(card=>{const box=boxes29State.boxes.find(b=>b.id===card.dataset.boxId);if(!box)return;card.querySelector('[data-edit]')?.addEventListener('click',()=>b29OpenBox(main,box));card.querySelector('[data-add]')?.addEventListener('click',()=>b29OpenAdd(main,box.id));card.querySelector('[data-withdraw]')?.addEventListener('click',()=>b29OpenWithdraw(main,box));card.querySelector('[data-history]')?.addEventListener('click',()=>b29OpenHistory(box));});
  }catch(err){console.warn('JuHelo boxes v29',err);root.innerHTML='<div class="panel empty">Não foi possível carregar as caixinhas agora.</div>'}finally{root.classList.remove('loading')}
}
function b29Mount(){
  if(!b29Active())return;const main=document.querySelector('#app > main.page');if(!main||main.dataset.jh29BoxesMounted==='1')return;
  main.querySelector(':scope > .section-title')?.classList.add('jh29-legacy-boxes');main.querySelector(':scope > .card-grid')?.classList.add('jh29-legacy-boxes');
  const root=document.createElement('div');root.className='jh29-boxes-root';main.querySelector(':scope > .topbar')?.after(root);main.dataset.jh29BoxesMounted='1';main.classList.add('jh-boxes-v29-ready');b29RenderData(main);
}
let b29Raf=0;function b29Schedule(){cancelAnimationFrame(b29Raf);b29Raf=requestAnimationFrame(b29Mount)}
new MutationObserver(b29Schedule).observe(document.querySelector('#app'),{childList:true,subtree:true});
boxes29Db.auth.onAuthStateChange(()=>{boxes29Household=null});window.addEventListener('load',b29Schedule);document.addEventListener('click',e=>{if(e.target.closest('.nav-item'))setTimeout(b29Schedule,0)},true);b29Schedule();
