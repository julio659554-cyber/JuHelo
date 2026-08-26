/* JuHelo v36 — máscara BRL única, sem MutationObserver. */
(() => {
  const BRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const names = new Set(['amount', 'target', 'target_amount', 'value']);

  function isMoneyInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.dataset.currencyMask === '1') return true;
    const name = String(input.name || '').toLowerCase();
    return names.has(name) || /(^|_)(amount|value|target)($|_)/.test(name);
  }

  function numberFromInitial(raw) {
    const text = String(raw ?? '').trim();
    if (!text) return null;

    // Valores vindos do banco, ex.: 952 ou 952.5.
    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      const n = Number(text);
      return Number.isFinite(n) ? Math.abs(n) : null;
    }

    // Valores já formatados, ex.: R$ 1.234,56.
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
    render(input, initial);
  }

  function scan(root = document) {
    root.querySelectorAll?.('input').forEach(attach);
  }

  function maskTypedValue(input) {
    const digits = input.value.replace(/\D/g, '');
    if (!digits) return render(input, null);
    render(input, Number(digits) / 100);
    requestAnimationFrame(() => {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (_) {}
    });
  }

  // O modal é criado no clique; ao chegar no document ele já existe.
  document.addEventListener('click', () => queueMicrotask(() => scan(document)));

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    attach(input);
    if (input.dataset.currencyMask === '1') {
      requestAnimationFrame(() => {
        try {
          const end = input.value.length;
          input.setSelectionRange(end, end);
        } catch (_) {}
      });
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.currencyMask === '1') {
      maskTypedValue(input);
    }
  });

  // Antes do handler do formulário, expõe o valor numérico esperado pelo FormData.
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
        const n = Number(input.dataset.currencyValue || '');
        render(input, Number.isFinite(n) ? n : null);
      });
    }, 0);
  }, true);

  scan(document);
})();
