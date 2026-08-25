const HOME_ACTION_ICONS = {
  expense: '<path d="M5 7l5 5 4-4 5 5"/><path d="M14 13h5V8"/>',
  income: '<path d="M5 17l5-5 4 4 5-5"/><path d="M14 11h5v5"/>',
  box: '<path d="M4 9h16v10H4z"/><path d="M7 9V6h10v3"/><path d="M9 13h6"/>',
  goal: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M15 9l5-5"/>'
};

function jhIcon(path){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function currentMonthISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

function activeHome(){
  return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab === 'home';
}

function syncHomeToCurrentMonth(main){
  const select = main.querySelector('#month-select');
  if(!select) return false;
  const current = currentMonthISO();
  if(select.value === current) return false;
  const hasOption = [...select.options].some(option => option.value === current);
  if(!hasOption) return false;
  select.value = current;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function buildHomeIntro(main){
  if(main.querySelector('.jh-home-intro')) return;
  const topbar = main.querySelector('.topbar');
  if(!topbar) return;
  const intro = document.createElement('section');
  intro.className = 'jh-home-intro';
  intro.innerHTML = '<h1>Seu mês até agora</h1><p>Veja entradas, saídas e o resultado do mês.</p>';
  topbar.after(intro);
}

function enhanceBalanceEye(hero){
  let eye = hero.querySelector('.ref-eye');
  if(!eye || eye.classList.contains('jh-balance-eye')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ref-eye jh-balance-eye';
  button.setAttribute('aria-label','Ocultar valores');
  button.setAttribute('aria-pressed','false');
  button.innerHTML = eye.innerHTML;
  eye.replaceWith(button);

  button.addEventListener('click',()=>{
    const main = button.closest('main.page');
    const hidden = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed',String(hidden));
    button.setAttribute('aria-label',hidden ? 'Mostrar valores' : 'Ocultar valores');
    main?.classList.toggle('jh-values-hidden',hidden);
    main?.querySelectorAll('.balance,.jh-home-kpis .value').forEach(node=>{
      if(!node.dataset.visibleValue) node.dataset.visibleValue = node.textContent.trim();
      node.textContent = hidden ? 'R$ •••••' : node.dataset.visibleValue;
    });
  });
}

function enhanceHomeKpis(main,hero){
  const kpis = main.querySelector(':scope > .kpi-grid');
  if(!kpis || kpis.classList.contains('jh-home-kpis')) return;
  kpis.classList.add('jh-home-kpis');
  const heroRow = hero.querySelector('.hero-row');
  if(heroRow) heroRow.after(kpis);
  else hero.appendChild(kpis);

  const [income,expense,result] = [...kpis.querySelectorAll('.kpi')];
  income?.classList.add('jh-mini-income');
  expense?.classList.add('jh-mini-expense');
  result?.classList.add('jh-mini-result');

  [[income,'income'],[expense,'expense']].forEach(([card,type])=>{
    if(!card || card.querySelector('.jh-kpi-icon')) return;
    const badge = document.createElement('span');
    badge.className = 'jh-kpi-icon';
    badge.innerHTML = jhIcon(HOME_ACTION_ICONS[type]);
    card.prepend(badge);
  });
}

function enhanceHomeActions(main){
  const actions = main.querySelector(':scope > .quick-actions');
  if(!actions) return;
  actions.classList.add('jh-home-actions');
  if(!actions.previousElementSibling?.classList.contains('jh-actions-title')){
    const title = document.createElement('h2');
    title.className = 'jh-actions-title';
    title.textContent = 'Ações rápidas';
    actions.before(title);
  }
  actions.querySelectorAll('.quick').forEach(button=>{
    if(button.dataset.jhAction === '1') return;
    const type = button.classList.contains('expense') ? 'expense'
      : button.classList.contains('income') ? 'income'
      : button.classList.contains('box') ? 'box' : 'goal';
    const label = button.querySelector('small')?.textContent?.trim() || ({expense:'Despesa',income:'Receita',box:'Caixinha',goal:'Meta'})[type];
    const sub = ({expense:'Novo gasto',income:'Nova entrada',box:'Guardar valor',goal:'Novo objetivo'})[type];
    button.innerHTML = `<span class="jh-action-icon">${jhIcon(HOME_ACTION_ICONS[type])}</span><span class="jh-action-copy"><strong>${label}</strong><small>${sub}</small></span>`;
    button.dataset.jhAction = '1';
  });
}

function enhanceHome(){
  if(!activeHome()) return;
  const main = document.querySelector('#app > main.page');
  if(!main || !main.querySelector('.hero')) return;
  if(syncHomeToCurrentMonth(main)) return;
  if(main.dataset.jhHomeEnhanced === '1') return;

  main.classList.add('jh-home-v18');
  main.querySelector('.ref-month-row')?.classList.add('jh-home-month-hidden');
  buildHomeIntro(main);

  const hero = main.querySelector('.hero');
  hero.classList.add('jh-balance-card');
  const eyebrow = hero.querySelector('.eyebrow');
  if(eyebrow) eyebrow.textContent = 'Saldo do mês';
  enhanceHomeKpis(main,hero);
  enhanceBalanceEye(hero);
  enhanceHomeActions(main);

  main.dataset.jhHomeEnhanced = '1';
}

let jhHomeRaf = 0;
function scheduleHome(){
  cancelAnimationFrame(jhHomeRaf);
  jhHomeRaf = requestAnimationFrame(enhanceHome);
}
new MutationObserver(scheduleHome).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(scheduleHome,0),true);
window.addEventListener('load',scheduleHome);
scheduleHome();
