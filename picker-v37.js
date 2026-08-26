/* JuHelo v37 — substitui seletor nativo de iOS/Android por picker próprio. */
(() => {
  let overlay = null;
  let pendingValue = '';
  let activeSelect = null;
  let scrollY = 0;
  let restoreBody = null;

  const titleMap = {
    month: 'Selecionar mês',
    start: 'Começa em',
    end: 'Vai até',
    target_date: 'Prazo da caixinha',
    due_date: 'Prazo da meta',
    scope: 'Aplicar alteração',
    box: 'Selecionar caixinha',
  };

  function pickerTitle(select) {
    if (select.id === 'month-select') return 'Selecionar mês';
    if (select.hasAttribute('data-report-start')) return 'Mês inicial';
    if (select.hasAttribute('data-report-end')) return 'Mês final';
    return titleMap[select.name] || 'Selecionar opção';
  }

  function lockBackground() {
    scrollY = window.scrollY || window.pageYOffset || 0;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.documentElement.classList.add('jh-picker-open');
    document.body.classList.add('jh-picker-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    restoreBody = () => {
      document.documentElement.classList.remove('jh-picker-open');
      document.body.classList.remove('jh-picker-open');
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
      restoreBody = null;
    };
  }

  function closePicker() {
    overlay?.remove();
    overlay = null;
    activeSelect = null;
    restoreBody?.();
  }

  function updateSelection(value) {
    pendingValue = value;
    overlay?.querySelectorAll('.jh-picker-item').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.value === value);
    });
  }

  function confirmPicker() {
    if (!activeSelect || !activeSelect.isConnected) return closePicker();
    const changed = activeSelect.value !== pendingValue;
    activeSelect.value = pendingValue;
    closePicker();
    if (changed) {
      activeSelect.dispatchEvent(new Event('input', { bubbles: true }));
      activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function openPicker(select) {
    if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
    if (overlay && activeSelect === select) return;
    closePicker();

    activeSelect = select;
    pendingValue = select.value;
    const options = [...select.options].filter(o => !o.disabled);

    overlay = document.createElement('div');
    overlay.className = 'jh-picker-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <section class="jh-picker-sheet" role="dialog" aria-modal="true" aria-label="${pickerTitle(select)}">
        <header class="jh-picker-head">
          <div>
            <strong>${pickerTitle(select)}</strong>
            <span>Escolha uma opção</span>
          </div>
          <button type="button" class="jh-picker-close" aria-label="Fechar">×</button>
        </header>
        <div class="jh-picker-list" role="listbox">
          ${options.map(o => `
            <button type="button" class="jh-picker-item ${o.value === select.value ? 'is-selected' : ''}" data-value="${String(o.value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" role="option" aria-selected="${o.value === select.value}">
              <span>${String(o.textContent || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
              <i class="jh-picker-check">✓</i>
            </button>`).join('')}
        </div>
        <footer class="jh-picker-actions">
          <button type="button" class="jh-picker-cancel">Cancelar</button>
          <button type="button" class="jh-picker-confirm">Confirmar</button>
        </footer>
      </section>`;

    document.body.appendChild(overlay);
    lockBackground();

    overlay.querySelector('.jh-picker-close').onclick = closePicker;
    overlay.querySelector('.jh-picker-cancel').onclick = closePicker;
    overlay.querySelector('.jh-picker-confirm').onclick = confirmPicker;
    overlay.addEventListener('click', e => { if (e.target === overlay) closePicker(); });
    overlay.querySelectorAll('.jh-picker-item').forEach(btn => {
      btn.onclick = () => updateSelection(btn.dataset.value ?? '');
    });

    requestAnimationFrame(() => {
      overlay?.querySelector('.jh-picker-item.is-selected')?.scrollIntoView({ block: 'center' });
    });
  }

  function intercept(event) {
    const select = event.target instanceof Element ? event.target.closest('select') : null;
    if (!select) return;
    event.preventDefault();
    event.stopPropagation();
    openPicker(select);
  }

  document.addEventListener('pointerdown', intercept, true);
  document.addEventListener('click', intercept, true);
  document.addEventListener('keydown', event => {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select || !['Enter', ' ', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    openPicker(select);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay) closePicker();
  });

  // Bloqueia pinch/gesture zoom no iOS e double-tap zoom em controles.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => {
    document.addEventListener(type, e => e.preventDefault(), { passive: false });
  });
  document.addEventListener('touchmove', e => {
    if (e.touches?.length > 1) e.preventDefault();
  }, { passive: false });

  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 280) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
})();
