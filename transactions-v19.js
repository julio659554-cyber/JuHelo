const TX_ICONS = {
  expense: '<path d="M5 7l5 5 4-4 5 5"/><path d="M14 13h5V8"/>',
  income: '<path d="M5 17l5-5 4 4 5-5"/><path d="M14 11h5v5"/>',
  box: '<path d="M4 9h16v10H4z"/><path d="M7 9V6h10v3"/><path d="M9 13h6"/>',
  recurring: '<path d="M20 7h-5V2"/><path d="M20 7a8 8 0 1 0 1 7"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3v5M16 3v5M4 10h16"/>'
};
function txSvg(path){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`}
function txActive(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='transactions'}

function refineTxMonth(main){
  const select=main.querySelector('#month-select');
  if(!select || select.closest('.jh-month-control')) return;
  const wrap=document.createElement('div');
  wrap.className='jh-month-control';
  wrap.innerHTML=`<span class="jh-month-icon">${txSvg(TX_ICONS.calendar)}</span>`;
  select.parentNode.insertBefore(wrap,select);
  wrap.appendChild(select);
}

function buildTxBalanceCard(main){
  const kpis=main.querySelector(':scope > .kpi-grid');
  if(!kpis || main.querySelector('.jh-tx-balance-card')) return;
  const cards=[...kpis.querySelectorAll('.kpi')];
  const income=cards[0], expense=cards[1], balance=cards[2];
  const balanceValue=balance?.querySelector('.value')?.textContent?.trim()||'R$ 0,00';
  const card=document.createElement('section');
  card.className='jh-tx-balance-card';
  card.innerHTML=`<div class="jh-tx-balance-head"><span>Saldo do mês</span><strong>${balanceValue}</strong><small>Receitas menos despesas do período selecionado</small></div>`;
  kpis.classList.add('jh-tx-kpis');
  income?.classList.add('jh-tx-income');
  expense?.classList.add('jh-tx-expense');
  balance?.classList.add('jh-tx-source-balance');
  card.appendChild(kpis);
  const section=main.querySelector('.section-title');
  const quick=main.querySelector(':scope > .quick-actions');
  if(section) section.after(card); else main.querySelector('.topbar')?.after(card);
  if(quick) card.after(quick);
}

function refineTxActions(main){
  const actions=main.querySelector(':scope > .quick-actions');
  if(!actions) return;
  actions.classList.add('jh-tx-actions');
  if(!actions.previousElementSibling?.classList.contains('jh-tx-actions-title')){
    const title=document.createElement('h2');
    title.className='jh-tx-actions-title';
    title.textContent='Ações rápidas';
    actions.before(title);
  }
  actions.querySelectorAll('.quick').forEach(button=>{
    if(button.dataset.jhTxAction==='1') return;
    const type=button.classList.contains('expense')?'expense':button.classList.contains('income')?'income':button.classList.contains('box')?'box':'recurring';
    const label=button.querySelector('small')?.textContent?.trim()||({expense:'Despesa',income:'Receita',box:'Caixinha',recurring:'Gasto fixo'})[type];
    const sub=({expense:'Novo gasto',income:'Nova entrada',box:'Guardar valor',recurring:'Nova recorrência'})[type];
    button.innerHTML=`<span class="jh-tx-action-icon">${txSvg(TX_ICONS[type])}</span><span class="jh-tx-action-copy"><strong>${label}</strong><small>${sub}</small></span>`;
    button.dataset.jhTxAction='1';
  });
}

function refineEditButtons(main){
  main.querySelectorAll('.edit-tx').forEach(button=>{
    if(button.dataset.jhEdit==='1') return;
    button.textContent='•••';
    button.setAttribute('aria-label','Opções do lançamento');
    button.title='Editar lançamento';
    button.dataset.jhEdit='1';
  });
}

function enhanceTransactions(){
  if(!txActive()) return;
  const main=document.querySelector('#app > main.page');
  if(!main || !main.querySelector('.section-title')) return;
  main.classList.add('jh-transactions-v19');
  refineTxMonth(main);
  if(main.dataset.jhTxEnhanced!=='1'){
    buildTxBalanceCard(main);
    refineTxActions(main);
    main.dataset.jhTxEnhanced='1';
  }
  refineEditButtons(main);
}

let tx19raf=0;
function scheduleTx19(){cancelAnimationFrame(tx19raf);tx19raf=requestAnimationFrame(enhanceTransactions)}
new MutationObserver(scheduleTx19).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(scheduleTx19,0),true);
window.addEventListener('load',scheduleTx19);
scheduleTx19();
