import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const goalsDb=createClient('https://fjysngoakqbemhjyfima.supabase.co','sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp');
let goalsHousehold=null;
function gEsc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function goalsActive(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='goals'}
function monthName(mm){return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Math.max(0,Number(mm)-1)]||mm}
async function ensureGoalsHousehold(){
  if(goalsHousehold) return goalsHousehold;
  const {data:{session}}=await goalsDb.auth.getSession();
  if(!session) return null;
  const {data,error}=await goalsDb.from('household_members').select('household_id').eq('user_id',session.user.id).maybeSingle();
  if(error) throw error;
  goalsHousehold=data?.household_id||null;
  return goalsHousehold;
}
function gToast(message,type=''){
  const root=document.querySelector('#toast-root');if(!root)return;
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;root.appendChild(el);setTimeout(()=>el.remove(),3200);
}
function goalModal(title,body){
  const wrap=document.createElement('div');wrap.className='modal-backdrop jh-goal-modal-backdrop';
  wrap.innerHTML=`<section class="modal-card jh-goal-modal"><div class="modal-head"><h2>${gEsc(title)}</h2><button class="icon-btn" type="button" data-close>×</button></div>${body}</section>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();wrap.querySelector('[data-close]').addEventListener('click',close);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});return wrap;
}
async function fetchGoal(id){
  const household=await ensureGoalsHousehold();if(!household)return null;
  const {data,error}=await goalsDb.from('goals').select('id,title,notes,due_date,is_completed').eq('household_id',household).eq('id',id).maybeSingle();
  if(error)throw error;return data;
}
function refreshGoalsTab(){setTimeout(()=>document.querySelector('.nav-item[data-tab="goals"]')?.click(),30)}
async function openGoalMonthEditor(goal=null){
  const household=await ensureGoalsHousehold();if(!household)return gToast('Entre no JuHelo primeiro.','error');
  const month=goal?.due_date?String(goal.due_date).slice(0,7):'';
  const wrap=goalModal(goal?'Editar meta':'Nova meta',`
    <form class="form-grid" data-jh-goal-form>
      <div class="field"><label>Meta</label><input class="input" name="title" maxlength="120" value="${gEsc(goal?.title||'')}" placeholder="Ex.: Comprar uma geladeira" required></div>
      <div class="field"><label>Observação <span class="optional">opcional</span></label><textarea class="input" name="notes" rows="3" maxlength="400" placeholder="Um detalhe para lembrar do objetivo">${gEsc(goal?.notes||'')}</textarea></div>
      <div class="field"><label>Prazo <span class="optional">opcional</span></label><div class="jh-goal-month-control"><input class="input" name="month" type="month" value="${gEsc(month)}"></div><small class="jh-field-help">Escolha apenas mês e ano.</small></div>
      ${goal?'<button class="btn red" type="button" data-delete-goal>Excluir meta</button>':''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click',()=>wrap.remove());
  wrap.querySelector('[data-delete-goal]')?.addEventListener('click',async()=>{
    if(!confirm('Excluir esta meta?'))return;
    const {error}=await goalsDb.from('goals').delete().eq('id',goal.id);if(error)return gToast(error.message,'error');
    wrap.remove();gToast('Meta excluída.');refreshGoalsTab();
  });
  wrap.querySelector('[data-jh-goal-form]').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const title=String(fd.get('title')||'').trim();if(!title)return;
    const selected=String(fd.get('month')||'');
    const payload={title,notes:String(fd.get('notes')||'').trim()||null,due_date:selected?`${selected}-01`:null,box_id:null,target_amount:null,auto_complete:false};
    let error;
    if(goal)({error}=await goalsDb.from('goals').update(payload).eq('id',goal.id));
    else{const {data:{session}}=await goalsDb.auth.getSession();({error}=await goalsDb.from('goals').insert({...payload,household_id:household,created_by:session.user.id}))}
    if(error)return gToast(error.message,'error');
    wrap.remove();gToast(goal?'Meta atualizada.':'Meta criada.');refreshGoalsTab();
  });
}

document.addEventListener('click',async e=>{
  const create=e.target.closest('[data-action="new-goal"]');
  const edit=e.target.closest('.gb-edit-goal,.edit-goal');
  if(!create&&!edit)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(create)return openGoalMonthEditor();
  const id=edit.dataset.id||edit.closest('[data-goal-id]')?.dataset.goalId;
  if(!id)return;
  try{const goal=await fetchGoal(id);if(goal)openGoalMonthEditor(goal)}catch(err){gToast(err.message||'Não foi possível abrir a meta.','error')}
},true);

function prettifyGoalDeadline(status){
  const text=status.textContent||'';if(!text.startsWith('Prazo:'))return;
  const match=text.match(/(\d{2})\/(\d{2})\/(\d{4})/);if(!match)return;
  status.textContent=text.replace(match[0],`${monthName(match[2])} ${match[3]}`);
}
function enhanceGoalsV22(){
  if(!goalsActive())return;
  const main=document.querySelector('#app > main.page');if(!main)return;
  main.classList.add('jh-goals-v22');
  const create=main.querySelector('[data-action="new-goal"]');if(create){create.classList.add('jh-goal-create');create.textContent='+ Nova meta'}
  main.querySelectorAll('.gb-edit-goal,.edit-goal').forEach(button=>{button.textContent='•••';button.classList.add('jh-goal-options');button.setAttribute('aria-label','Opções da meta')});
  main.querySelectorAll('.gb-goal-status').forEach(prettifyGoalDeadline);
}
let goals22raf=0;function scheduleGoals22(){cancelAnimationFrame(goals22raf);goals22raf=requestAnimationFrame(enhanceGoalsV22)}
new MutationObserver(scheduleGoals22).observe(document.body,{childList:true,subtree:true});
goalsDb.auth.onAuthStateChange(()=>{goalsHousehold=null});
document.addEventListener('click',()=>setTimeout(scheduleGoals22,0),false);window.addEventListener('load',scheduleGoals22);scheduleGoals22();
