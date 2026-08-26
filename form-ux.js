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

  function scan(root = document) {
    root.querySelectorAll?.('input').forEach(attach);
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

  /* Modais são inseridos dinamicamente. Eventos delegados mantêm o fluxo sem observers. */
  document.addEventListener('pointerdown', () => queueMicrotask(() => scan(document)), true);

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    attach(input);
    if (input.dataset.currencyMask === '1') moveCaretToEnd(input);
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.currencyMask === '1') {
      maskTypedValue(input);
    }
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
