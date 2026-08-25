/* JuHelo v7 — mobile UI fixes + BRL masks */
(() => {
  const BRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currencyNames = new Set(['amount', 'target', 'target_amount', 'value']);

  function isCurrencyInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.dataset.currencyMask === '1') return true;
    const name = String(input.name || '').toLowerCase();
    if (currencyNames.has(name) || /(^|_)(amount|value|target)($|_)/.test(name)) return true;
    const label = input.closest('.field')?.querySelector('label')?.textContent?.toLowerCase() || '';
    return input.type !== 'date' && /\bvalor\b|valor-alvo|valor alvo/.test(label);
  }

  function numericFromInitial(raw) {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    if (/^-?\d+(\.\d+)?$/.test(text)) {
      const value = Number(text);
      return Number.isFinite(value) ? Math.abs(value) : null;
    }
    const digits = text.replace(/\D/g, '');
    return digits ? Number(digits) / 100 : null;
  }

  function renderCurrency(input, value) {
    if (value == null || !Number.isFinite(value)) {
      input.value = '';
      input.dataset.currencyValue = '';
      return;
    }
    const clean = Math.max(0, value);
    input.dataset.currencyValue = clean.toFixed(2);
    input.value = BRL.format(clean);
  }

  function maskFromDigits(input) {
    const digits = input.value.replace(/\D/g, '');
    if (!digits) return renderCurrency(input, null);
    renderCurrency(input, Number(digits) / 100);
    try {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    } catch (_) {}
  }

  function attachCurrencyMask(input) {
    if (!isCurrencyInput(input) || input.dataset.currencyMask === '1') return;
    input.dataset.currencyMask = '1';
    const initial = numericFromInitial(input.value);
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', input.getAttribute('aria-label') || input.closest('.field')?.querySelector('label')?.textContent?.trim() || 'Valor');
    renderCurrency(input, initial);
    input.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        try {
          const end = input.value.length;
          input.setSelectionRange(end, end);
        } catch (_) {}
      });
    });
    input.addEventListener('input', () => maskFromDigits(input));
  }

  function scanCurrencyInputs(root = document) {
    root.querySelectorAll?.('input').forEach(attachCurrencyMask);
  }

  function rawCurrencyValue(input) {
    const value = Number(input.dataset.currencyValue || 0);
    return Number.isFinite(value) ? value.toFixed(2) : '';
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const masked = [...form.querySelectorAll('input[data-currency-mask="1"]')];
    if (!masked.length) return;
    masked.forEach(input => {
      input.value = input.dataset.currencyValue ? rawCurrencyValue(input) : '';
    });
    setTimeout(() => {
      masked.forEach(input => {
        if (!input.isConnected) return;
        const value = numericFromInitial(input.value);
        renderCurrency(input, value);
      });
    }, 0);
  }, true);

  function markBuild() {
    document.documentElement.dataset.juheloUi = 'v7';
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('input')) attachCurrencyMask(node);
        scanCurrencyInputs(node);
      }
    }
  });

  markBuild();
  scanCurrencyInputs();
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
