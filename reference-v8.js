const navIcons = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
  transactions: '<path d="M7 4v16"/><path d="m3.5 7.5 3.5-3.5 3.5 3.5"/><path d="M17 20V4"/><path d="m13.5 16.5 3.5 3.5 3.5-3.5"/>',
  boxes: '<path d="M4 8.5h16v10.5H4z"/><path d="M7 8.5V6h10v2.5"/><path d="M9 12h6"/>',
  reports: '<path d="M5 20V11"/><path d="M12 20V4"/><path d="M19 20V8"/>',
  goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m14.8 9.2 5-5"/><path d="M16.5 4.2h3.3v3.3"/>'
};

const rowIcons = {
  income: '<path d="M5 16 16 5"/><path d="M8 5h8v8"/>',
  expense: '<path d="m5 8 11 11"/><path d="M8 19h8v-8"/>',
  box: '<path d="M4 8.5h16v10.5H4z"/><path d="M7 8.5V6h10v2.5"/>',
  recurring: '<path d="M20 7h-5V2"/><path d="M20 7a8 8 0 1 0 1 7"/>'
};

function icon(markup, cls = '') {
  return `<svg class="ref-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
}

function activeTab() {
  return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab || 'home';
}

function titleFor(tab) {
  return ({ home: 'Início', transactions: 'Movimentações', boxes: 'Caixinhas', reports: 'Relatórios', goals: 'Metas' })[tab] || 'JuHelo';
}

function refineTopbar(main, tab) {
  const top = main.querySelector('.topbar');
  if (!top) return;
  top.classList.add('ref-topbar');
  const wanted = titleFor(tab);

  const brand = top.querySelector('.brand-inline');
  if (brand) {
    brand.className = 'ref-screen-title';
    brand.textContent = wanted;
  } else {
    const title = top.querySelector('.ref-screen-title');
    if (title && title.textContent !== wanted) title.textContent = wanted;
  }

  const chip = top.querySelector('.user-chip');
  if (chip && !top.querySelector('.ref-bell')) {
    const bell = document.createElement('span');
    bell.className = 'ref-bell';
    bell.setAttribute('aria-hidden', 'true');
    bell.innerHTML = icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>');
    chip.before(bell);
  }
}

function refineNav() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    const slot = btn.querySelector('.nav-icon');
    if (!slot || slot.dataset.refIcon === '1') return;
    slot.dataset.refIcon = '1';
    slot.innerHTML = icon(navIcons[btn.dataset.tab] || navIcons.home);
  });
}

function refineRows(root = document) {
  root.querySelectorAll('.row').forEach(row => {
    const slot = row.querySelector('.row-icon');
    if (!slot || slot.dataset.refIcon === '1') return;
    const sub = (row.querySelector('.row-sub')?.textContent || '').toLowerCase();
    const type = sub.includes('receita') ? 'income' : sub.includes('caixinha') ? 'box' : sub.includes('fixo') ? 'recurring' : 'expense';
    slot.dataset.refIcon = '1';
    slot.dataset.type = type;
    slot.innerHTML = icon(rowIcons[type]);
  });
}

function refineHome(main) {
  const hero = main.querySelector('.hero');
  if (!hero) return;
  main.classList.add('ref-home');

  const select = hero.querySelector('.month-select');
  if (select && !main.querySelector('.ref-month-row')) {
    const monthRow = document.createElement('div');
    monthRow.className = 'ref-month-row';
    hero.before(monthRow);
    monthRow.appendChild(select);
  }

  if (!hero.querySelector('.ref-eye')) {
    const eye = document.createElement('span');
    eye.className = 'ref-eye';
    eye.setAttribute('aria-hidden', 'true');
    eye.innerHTML = icon('<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>');
    hero.appendChild(eye);
  }

  const eyebrows = hero.querySelectorAll('.eyebrow');
  if (eyebrows[1] && eyebrows[1].textContent !== 'Atualizado agora há pouco') eyebrows[1].textContent = 'Atualizado agora há pouco';

  const quick = main.querySelector('.quick-actions');
  const lists = main.querySelector('.grid-2');
  if (quick && lists && lists.nextElementSibling !== quick) lists.after(quick);

  main.querySelector('.overview-strip')?.classList.add('ref-hidden-summary');

  main.querySelectorAll('.grid-2 .panel').forEach(panel => {
    if (panel.querySelector('.ref-panel-footer')) return;
    const link = panel.querySelector('.panel-head .link-btn');
    if (!link) return;
    const footer = document.createElement('div');
    footer.className = 'ref-panel-footer';
    footer.appendChild(link);
    panel.appendChild(footer);
  });
}

function refineBoxes(main) {
  if (activeTab() !== 'boxes') return;
  main.classList.add('ref-boxes-page');
  main.querySelectorAll('.box-card').forEach(card => {
    if (card.querySelector('.ref-box-glyph')) return;
    const glyph = document.createElement('span');
    glyph.className = 'ref-box-glyph';
    glyph.innerHTML = icon('<path d="M4 9h16v10H4z"/><path d="M7 9V6h10v3"/><path d="M9 13h6"/>');
    card.prepend(glyph);
  });
}

function refineSection(main, tab) {
  if (tab === 'home') return;
  main.classList.add(`ref-${tab}-page`);
  const section = main.querySelector('.section-title');
  if (section) section.classList.add('ref-section-title');
}

function applyReference() {
  const main = document.querySelector('#app > main.page');
  if (!main) return;
  const tab = activeTab();
  main.dataset.refTab = tab;
  refineTopbar(main, tab);
  refineNav();
  refineRows(main);
  refineSection(main, tab);
  if (tab === 'home') refineHome(main);
  if (tab === 'boxes') refineBoxes(main);
}

let raf = 0;
function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(applyReference);
}

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', () => setTimeout(schedule, 0), true);
window.addEventListener('load', schedule);
schedule();
