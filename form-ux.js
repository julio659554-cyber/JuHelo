/* JuHelo — comportamento canônico de formulários. Sem MutationObserver. */
(() => {
  const BRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const moneyNames = new Set(['amount', 'target', 'target_amount', 'value']);

  function isMoneyInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.dataset.currencyMask === '1') return true;
    const name = String(input.name || '').toLowerCase();
    return moneyNames.has(name) || /(^|_)(amount|value|target)($|_)/.test(name);
  }

  function numberFromInitial(raw) {
    const text = String(raw ?? '').trim();
    if (!text) return null;

    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      const n = Number(text);
      return Number.isFinite(n) ? Math.abs(n) : null;
    }

    const normalized = text
      .replace(/\s/g, '')
      .replace(/^R\$/i, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.abs(n) : null;
  }

  function render(input, value) {
    if (value == null || !Number.isFinite(value)) {
      input.value = '';
      input.dataset.currencyValue = '';
      return;
    }
    const clean = Math.max(0, value);
    input.dataset.currencyValue = clean.toFixed(2);
    input.value = BRL.format(clean);
  }

  function attach(input) {
    if (!isMoneyInput(input) || input.dataset.currencyMask === '1') return;
    const initial = numberFromInitial(input.value);
    input.dataset.currencyMask = '1';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.spellcheck = false;
    render(input, initial);
  }

  function enhanceHomeListActions(root = document) {
    root.querySelectorAll?.('.home-lists .list-head > span').forEach(trigger => {
      const card = trigger.closest('.list-card');
      const isIncome = card?.classList.contains('income');
      trigger.setAttribute('role', 'button');
      trigger.tabIndex = 0;
      trigger.setAttribute('aria-label', isIncome ? 'Ver todas receitas' : 'Ver todas despesas');
    });
  }

  function scan(root = document) {
    root.querySelectorAll?.('input').forEach(attach);
    enhanceHomeListActions(root);
  }

  function moveCaretToEnd(input) {
    requestAnimationFrame(() => {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (_) {}
    });
  }

  function maskTypedValue(input) {
    const digits = input.value.replace(/\D/g, '');
    if (!digits) {
      render(input, null);
      return;
    }
    render(input, Number(digits) / 100);
    moveCaretToEnd(input);
  }

  function openFullTransactions(type) {
    const nav = document.querySelector('[data-tab="transactions"]');
    if (!nav) return;
    nav.click();
    setTimeout(() => {
      const target = document.querySelector(`.extract-grid .list-card.${type}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  /* Modais são inseridos dinamicamente. Eventos delegados mantêm o fluxo sem observers. */
  document.addEventListener('pointerdown', () => queueMicrotask(() => scan(document)), true);

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      attach(input);
      if (input.dataset.currencyMask === '1') moveCaretToEnd(input);
    }
    queueMicrotask(() => enhanceHomeListActions(document));
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.currencyMask === '1') {
      maskTypedValue(input);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const seeAll = target.closest('.home-lists .list-head > span');
    if (seeAll) {
      event.preventDefault();
      const type = seeAll.closest('.list-card')?.classList.contains('income') ? 'income' : 'expense';
      openFullTransactions(type);
      return;
    }

    const directionButton = target.closest('[data-dir]');
    if (directionButton) {
      queueMicrotask(() => {
        const modal = directionButton.closest('.modal-backdrop');
        const heading = modal?.querySelector('.modal-head h2');
        if (!heading || !/^Nova (despesa|receita)$/i.test(heading.textContent.trim())) return;
        heading.textContent = directionButton.dataset.dir === 'income' ? 'Nova receita' : 'Nova despesa';
      });
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.matches('.home-lists .list-head > span')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    target.click();
  });

  /* FormData precisa receber número puro, mas o usuário sempre vê BRL. */
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const masked = [...form.querySelectorAll('input[data-currency-mask="1"]')];
    if (!masked.length) return;

    masked.forEach(input => {
      input.value = input.dataset.currencyValue || '';
    });

    setTimeout(() => {
      masked.forEach(input => {
        if (!input.isConnected) return;
        const raw = input.dataset.currencyValue;
        const n = raw === '' ? null : Number(raw);
        render(input, Number.isFinite(n) ? n : null);
      });
    }, 0);
  }, true);

  scan(document);
})();
