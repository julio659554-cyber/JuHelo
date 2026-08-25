function splitTransactionsView() {
  const main = document.querySelector('#app > main.page.ref-transactions-page');
  if (!main) return;

  const sectionTitle = main.querySelector('.section-title');
  if (sectionTitle) {
    const textBlock = sectionTitle.querySelector(':scope > div');
    if (textBlock) textBlock.classList.add('tx-hide-duplicate-title');
    sectionTitle.classList.add('tx-month-only');
  }

  if (main.dataset.txSplit === '1') return;

  const panels = [...main.querySelectorAll(':scope > .panel')];
  const sourcePanel = panels.find(panel => panel.querySelector('.row') || panel.querySelector('.empty'));
  if (!sourcePanel) return;

  const rows = [...sourcePanel.querySelectorAll('.row')];
  if (!rows.length) {
    sourcePanel.classList.add('tx-empty-panel');
    sourcePanel.innerHTML = `
      <div class="tx-extract-head"><h2>Movimentações do mês</h2></div>
      <div class="empty">Nenhum lançamento neste mês.</div>`;
    main.dataset.txSplit = '1';
    return;
  }

  const expenseRows = rows.filter(row => {
    const sub = (row.querySelector('.row-sub')?.textContent || '').toLowerCase();
    return !sub.includes('receita');
  });
  const incomeRows = rows.filter(row => {
    const sub = (row.querySelector('.row-sub')?.textContent || '').toLowerCase();
    return sub.includes('receita');
  });

  const grid = document.createElement('div');
  grid.className = 'tx-extract-grid';

  const makePanel = (title, type, items) => {
    const panel = document.createElement('section');
    panel.className = `panel tx-extract-panel ${type}`;
    const head = document.createElement('div');
    head.className = 'tx-extract-head';
    head.innerHTML = `<h2>${title}</h2><span>${items.length}</span>`;
    panel.appendChild(head);

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty tx-extract-empty';
      empty.textContent = type === 'income' ? 'Nenhuma receita neste mês.' : 'Nenhuma despesa neste mês.';
      panel.appendChild(empty);
      return panel;
    }

    const list = document.createElement('div');
    list.className = 'list';
    items.forEach(row => list.appendChild(row));
    panel.appendChild(list);
    return panel;
  };

  grid.appendChild(makePanel('Despesas', 'expense', expenseRows));
  grid.appendChild(makePanel('Receitas', 'income', incomeRows));
  sourcePanel.replaceWith(grid);
  main.dataset.txSplit = '1';
}

let txRaf = 0;
function scheduleTransactionsRefine() {
  cancelAnimationFrame(txRaf);
  txRaf = requestAnimationFrame(splitTransactionsView);
}

new MutationObserver(scheduleTransactionsRefine).observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', scheduleTransactionsRefine);
document.addEventListener('click', () => setTimeout(scheduleTransactionsRefine, 0), true);
scheduleTransactionsRefine();
