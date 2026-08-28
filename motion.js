/* JuHelo — motion system canônico. Sem MutationObserver. */
(() => {
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let pendingMeasure = null;

  function animateHeight(node, from, duration = 280) {
    if (!node || !node.isConnected || reduced()) return;
    const to = node.getBoundingClientRect().height;
    if (!Number.isFinite(from) || Math.abs(to - from) < 2) return;

    const previousOverflow = node.style.overflow;
    node.style.overflow = 'clip';
    const animation = node.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration, easing: EASE }
    );
    const restore = () => { node.style.overflow = previousOverflow; };
    animation.addEventListener('finish', restore, { once: true });
    animation.addEventListener('cancel', restore, { once: true });
  }

  function animateSection(section, direction = 1) {
    if (!section || !section.isConnected || reduced()) return;
    section.animate(
      [
        { opacity: 0, transform: `translateX(${direction * 10}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      { duration: 230, easing: EASE }
    );
  }

  function animateNewPage(oldPage) {
    if (reduced()) return;
    const started = performance.now();
    const tick = () => {
      const next = document.querySelector('#app > .page');
      if (next && next !== oldPage) {
        next.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 240, easing: EASE }
        );
        return;
      }
      if (performance.now() - started < 1400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function ensureSettingsIndicator(panel = document.querySelector('.settings-panel')) {
    const tabs = panel?.querySelector('.settings-tabs');
    if (!tabs) return null;
    let indicator = tabs.querySelector('.settings-tab-indicator');
    if (!indicator) {
      indicator = document.createElement('i');
      indicator.className = 'settings-tab-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      tabs.prepend(indicator);
    }
    updateSettingsIndicator(tabs, false);
    return indicator;
  }

  function updateSettingsIndicator(tabs, animate = true) {
    const indicator = tabs?.querySelector('.settings-tab-indicator');
    const active = tabs?.querySelector('button.active');
    if (!indicator || !active) return;
    if (!animate) indicator.style.transition = 'none';
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    if (!animate) requestAnimationFrame(() => { indicator.style.transition = ''; });
    active.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }

  function closeOverlayAnimated(overlay) {
    if (!overlay?.isConnected) return;
    if (reduced()) return overlay.remove();
    overlay.classList.add('is-closing');
    setTimeout(() => overlay.remove(), 190);
  }

  document.addEventListener('pointerdown', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const nav = target.closest('[data-tab]');
    if (nav) animateNewPage(document.querySelector('#app > .page'));

    const direction = target.closest('[data-dir]');
    if (direction) {
      const card = direction.closest('.modal-card');
      if (card) pendingMeasure = { kind: 'transaction', node: card, from: card.getBoundingClientRect().height };
      return;
    }

    const settingsTab = target.closest('[data-stab]');
    if (settingsTab) {
      const panel = settingsTab.closest('.settings-panel');
      const content = panel?.querySelector('.settings-content');
      const buttons = panel ? [...panel.querySelectorAll('[data-stab]')] : [];
      const active = panel?.querySelector('[data-stab].active');
      const fromIndex = buttons.indexOf(active);
      const toIndex = buttons.indexOf(settingsTab);
      if (content) pendingMeasure = {
        kind: 'settings',
        node: content,
        from: content.getBoundingClientRect().height,
        direction: toIndex >= fromIndex ? 1 : -1,
        panel
      };
    }
  }, true);

  /* Intercepta apenas fechamento manual para permitir animação de saída. */
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const overlay = target.closest('.modal-backdrop,.settings-overlay');
    const manualClose = target.closest('[data-close],[data-cancel]');
    const backdropTap = overlay && target === overlay;
    if (!overlay || (!manualClose && !backdropTap)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    closeOverlayAnimated(overlay);
  }, true);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-settings-open]')) {
      queueMicrotask(() => ensureSettingsIndicator());
      return;
    }

    const direction = target.closest('[data-dir]');
    if (direction && pendingMeasure?.kind === 'transaction') {
      const measure = pendingMeasure;
      pendingMeasure = null;
      requestAnimationFrame(() => animateHeight(measure.node, measure.from, 300));
      return;
    }

    const settingsTab = target.closest('[data-stab]');
    if (settingsTab && pendingMeasure?.kind === 'settings') {
      const measure = pendingMeasure;
      pendingMeasure = null;
      requestAnimationFrame(() => {
        animateHeight(measure.node, measure.from, 280);
        animateSection(measure.panel?.querySelector('.settings-section.active'), measure.direction);
        const tabs = measure.panel?.querySelector('.settings-tabs');
        ensureSettingsIndicator(measure.panel);
        updateSettingsIndicator(tabs, true);
      });
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.settings-panel').forEach(panel => {
      const tabs = panel.querySelector('.settings-tabs');
      if (tabs) updateSettingsIndicator(tabs, false);
    });
  }, { passive: true });
})();
