const modalMonthFmt=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'});
function modalMonthISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function modalMonthLabel(value){
  if(!value)return '';
  const [y,m]=value.split('-').map(Number);if(!y||!m)return value;
  const t=modalMonthFmt.format(new Date(y,m-1,1,12));return t.charAt(0).toUpperCase()+t.slice(1);
}
function monthShift(value,delta){const [y,m]=value.split('-').map(Number);return modalMonthISO(new Date(y,m-1+delta,1,12))}
function convertMonthInput(input){
  if(input.dataset.jhMonthConverted==='1')return;
  const selected=input.value||modalMonthISO(new Date());
  const select=document.createElement('select');
  select.className=`${input.className} jh-modal-month-select`;
  select.name=input.name;
  select.dataset.jhMonthConverted='1';
  if(input.required)select.required=true;
  if(!input.required){
    const empty=document.createElement('option');empty.value='';
    const fieldLabel=input.closest('.field')?.querySelector('label')?.textContent?.toLowerCase()||'';
    empty.textContent=fieldLabel.includes('até')?'Sem mês final':fieldLabel.includes('prazo')?'Sem prazo':'Selecionar mês';
    select.appendChild(empty);
  }
  const values=new Set();
  for(let i=-60;i<=60;i++)values.add(monthShift(selected,i));
  if(input.value)values.add(input.value);
  [...values].sort().forEach(value=>{
    const option=document.createElement('option');option.value=value;option.textContent=modalMonthLabel(value);if(value===input.value)option.selected=true;select.appendChild(option);
  });
  if(!input.value&&!input.required)select.value='';
  else if(!input.value)select.value=selected;
  input.replaceWith(select);
}

function enhanceModal(modal){
  if(!modal||modal.dataset.jhV23==='1')return;
  modal.dataset.jhV23='1';modal.classList.add('jh-modal-v23');
  modal.querySelectorAll('input[type="month"]').forEach(convertMonthInput);
  modal.querySelectorAll('select.input').forEach(select=>select.classList.add('jh-premium-select'));
  modal.querySelectorAll('.field').forEach(field=>field.classList.add('jh-modal-field'));
  modal.querySelectorAll('.scope-card').forEach(card=>card.classList.add('jh-premium-scope-card'));
  modal.addEventListener('focusin',e=>{
    const control=e.target.closest('input,select,textarea');if(!control)return;
    setTimeout(()=>control.scrollIntoView({block:'center',behavior:'smooth'}),120);
  });
}
function syncVisualViewport(){
  const h=window.visualViewport?.height||window.innerHeight;
  document.documentElement.style.setProperty('--jh-visual-height',`${Math.round(h)}px`);
}
function scanModals(){document.querySelectorAll('.modal-card').forEach(enhanceModal)}
let modalRaf=0;function scheduleModals(){cancelAnimationFrame(modalRaf);modalRaf=requestAnimationFrame(scanModals)}
new MutationObserver(scheduleModals).observe(document.body,{childList:true,subtree:true});
window.visualViewport?.addEventListener('resize',syncVisualViewport);window.visualViewport?.addEventListener('scroll',syncVisualViewport);
window.addEventListener('resize',syncVisualViewport);window.addEventListener('load',()=>{syncVisualViewport();scheduleModals()});
syncVisualViewport();scheduleModals();
