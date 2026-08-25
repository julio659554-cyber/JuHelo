import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const goals29Db=createClient('https://fjysngoakqbemhjyfima.supabase.co','sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp');
let goals29Household=null;

function g29Esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function g29Active(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='goals'}
function g29MonthLabel(value){
  if(!value)return 'Sem prazo';
  const [y,m]=String(value).slice(0,7).split('-').map(Number);
  if(!y||!m)return 'Sem prazo';
  const txt=new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(y,m-1,1,12));
  return txt.replace('.','').replace(' de ',' ').replace(/^./,c=>c.toUpperCase());
}
function g29Toast(message,type=''){
  const root=document.querySelector('#toast-root');if(!root)return;
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;root.appendChild(el);setTimeout(()=>el.remove(),3200);
}
async function g29Household(){
  if(goals29Household)return goals29Household;
  const {data:{session}}=await goals29Db.auth.getSession();if(!session)return null;
  const {data,error}=await goals29Db.from('household_members').select('household_id').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;goals29Household=data?.household_id||null;return goals29Household;
}
async function g29Load(){
  const household=await g29Household();if(!household)return [];
  const {data,error}=await goals29Db.from('goals').select('id,title,notes,due_date,is_completed,completed_at,sort_order,created_at').eq('household_id',household).order('is_completed').order('sort_order').order('created_at');
  if(error)throw error;return data||[];
}
function g29Modal(title,body){
  const wrap=document.createElement('div');wrap.className='modal-backdrop jh29-modal-backdrop';
  wrap.innerHTML=`<section class="modal-card jh29-modal"><div class="modal-head"><h2>${g29Esc(title)}</h2><button class="icon-btn" type="button" data-close>×</button></div>${body}</section>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();wrap.querySelector('[data-close]').addEventListener('click',close);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});return wrap;
}
async function g29OpenEditor(main,goal=null){
  const household=await g29Household();if(!household)return g29Toast('Entre no JuHelo primeiro.','error');
  const month=goal?.due_date?String(goal.due_date).slice(0,7):'';
  const wrap=g29Modal(goal?'Editar meta':'Nova meta',`
    <form class="form-grid" data-g29-form>
      <div class="field"><label>Meta</label><input class="input" name="title" maxlength="120" value="${g29Esc(goal?.title||'')}" placeholder="Ex.: Comprar uma geladeira" required></div>
      <div class="field"><label>Observação <span class="optional">opcional</span></label><textarea class="input" name="notes" rows="3" maxlength="400" placeholder="Um detalhe para lembrar do objetivo">${g29Esc(goal?.notes||'')}</textarea></div>
      <div class="field"><label>Prazo <span class="optional">opcional</span></label><input class="input" name="month" type="month" value="${g29Esc(month)}"><small class="jh-field-help">Escolha apenas mês e ano.</small></div>
      ${goal?'<button class="btn red" type="button" data-delete>Excluir meta</button>':''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click',()=>wrap.remove());
  wrap.querySelector('[data-delete]')?.addEventListener('click',async()=>{
    if(!confirm('Excluir esta meta?'))return;
    const {error}=await goals29Db.from('goals').delete().eq('id',goal.id);if(error)return g29Toast(error.message,'error');
    wrap.remove();g29Toast('Meta excluída.');await g29RenderData(main);
  });
  wrap.querySelector('[data-g29-form]').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const title=String(fd.get('title')||'').trim();if(!title)return;
    const selected=String(fd.get('month')||'');
    const payload={title,notes:String(fd.get('notes')||'').trim()||null,due_date:selected?`${selected}-01`:null,box_id:null,target_amount:null,auto_complete:false};
    let error;
    if(goal)({error}=await goals29Db.from('goals').update(payload).eq('id',goal.id));
    else{const {data:{session}}=await goals29Db.auth.getSession();({error}=await goals29Db.from('goals').insert({...payload,household_id:household,created_by:session.user.id}))}
    if(error)return g29Toast(error.message,'error');
    wrap.remove();g29Toast(goal?'Meta atualizada.':'Meta criada.');await g29RenderData(main);
  });
}
async function g29Toggle(main,goal){
  const done=!goal.is_completed;
  const {error}=await goals29Db.from('goals').update({is_completed:done,completed_at:done?new Date().toISOString():null}).eq('id',goal.id);
  if(error)return g29Toast(error.message,'error');
  g29Toast(done?'Meta concluída ✓':'Meta reaberta.');await g29RenderData(main);
}
function g29GoalRow(goal){
  return `<article class="jh29-goal-row ${goal.is_completed?'completed':''}" data-goal-id="${goal.id}">
    <button class="jh29-goal-check ${goal.is_completed?'done':''}" type="button" data-toggle aria-label="${goal.is_completed?'Reabrir meta':'Concluir meta'}">${goal.is_completed?'✓':''}</button>
    <div class="jh29-goal-copy"><strong>${g29Esc(goal.title)}</strong>${goal.notes?`<p>${g29Esc(goal.notes)}</p>`:''}<span class="jh29-goal-deadline">${g29Esc(g29MonthLabel(goal.due_date))}</span></div>
    <button class="jh29-options" type="button" data-edit aria-label="Opções da meta">•••</button>
  </article>`;
}
async function g29RenderData(main){
  const root=main.querySelector('.jh29-goals-root');if(!root)return;
  root.classList.add('loading');
  try{
    const goals=await g29Load();if(!document.body.contains(main)||!g29Active())return;
    const pending=goals.filter(g=>!g.is_completed),completed=goals.filter(g=>g.is_completed);
    root.innerHTML=`
      <div class="jh29-page-actions"><button class="jh29-create" type="button" data-new-goal>+ Nova meta</button></div>
      <section class="jh29-goals-card">
        <div class="jh29-goals-head"><span>${pending.length} ${pending.length===1?'pendente':'pendentes'}</span><span>${completed.length} ${completed.length===1?'concluída':'concluídas'}</span></div>
        <div class="jh29-goals-list">${goals.length?[...pending,...completed].map(g29GoalRow).join(''):'<div class="jh29-empty">Nenhuma meta ainda. Crie algo que vocês querem concluir juntos.</div>'}</div>
      </section>`;
    root.querySelector('[data-new-goal]').addEventListener('click',()=>g29OpenEditor(main));
    root.querySelectorAll('[data-goal-id]').forEach(row=>{
      const goal=goals.find(g=>g.id===row.dataset.goalId);if(!goal)return;
      row.querySelector('[data-toggle]')?.addEventListener('click',()=>g29Toggle(main,goal));
      row.querySelector('[data-edit]')?.addEventListener('click',()=>g29OpenEditor(main,goal));
    });
  }catch(err){console.warn('JuHelo goals v29',err);root.innerHTML='<div class="panel empty">Não foi possível carregar as metas agora.</div>'}
  finally{root.classList.remove('loading')}
}
function g29Mount(){
  if(!g29Active())return;
  const main=document.querySelector('#app > main.page');if(!main||main.dataset.jh29GoalsMounted==='1')return;
  main.querySelector(':scope > .section-title')?.classList.add('jh29-legacy-goals');
  main.querySelector(':scope > .panel')?.classList.add('jh29-legacy-goals');
  const root=document.createElement('div');root.className='jh29-goals-root';
  const top=main.querySelector(':scope > .topbar');top?.after(root);
  main.dataset.jh29GoalsMounted='1';main.classList.add('jh-goals-v29-ready');
  g29RenderData(main);
}
let g29Raf=0;function g29Schedule(){cancelAnimationFrame(g29Raf);g29Raf=requestAnimationFrame(g29Mount)}
new MutationObserver(g29Schedule).observe(document.querySelector('#app'),{childList:true,subtree:true});
goals29Db.auth.onAuthStateChange(()=>{goals29Household=null});
window.addEventListener('load',g29Schedule);document.addEventListener('click',e=>{if(e.target.closest('.nav-item'))setTimeout(g29Schedule,0)},true);g29Schedule();
