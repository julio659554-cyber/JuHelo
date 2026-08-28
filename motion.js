/* JuHelo — motion system canônico. Sem MutationObserver. */
(() => {
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const systemReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const duration = (normal, reduced = 140) => systemReduced() ? reduced : normal;
  let pendingMeasure = null;

  function afterLayout(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function animateHeight(node, from, normalDuration = 300) {
    if (!node || !node.isConnected) return;
    const to = node.getBoundingClientRect().height;
    if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(to - from) < 2) return;

    const previousOverflow = node.style.overflow;
    node.style.overflow = 'clip';
    const animation = node.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: duration(normalDuration, 160), easing: EASE }
    );
    const restore = () => { node.style.overflow = previousOverflow; };
    animation.addEventListener('finish', restore, { once: true });
    animation.addEventListener('cancel', restore, { once: true });
  }

  function animateSection(section, direction = 1) {
    if (!section || !section.isConnected) return;
    const reduced = systemReduced();
    section.animate(
      reduced
        ? [{ opacity: .55 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${direction * 12}px)` },
            { opacity: 1, transform: 'translateX(0)' }
          ],
      { duration: duration(250, 140), easing: EASE }
    );
  }

  function animateNewPage(oldPage) {
    const started = performance.now();
    const tick = () => {
      const next = document.querySelector('#app > .page');
      if (next && next !== oldPage) {
        const reduced = systemReduced();
        next.animate(
          reduced
            ? [{ opacity: .6 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'translateY(9px)' },
                { opacity: 1, transform: 'translateY(0)' }
              ],
          { duration: duration(260, 140), easing: EASE }
        );
        return;
      }
      if (performance.now() - started < 1800) requestAnimationFrame(tick);
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
    active.scrollIntoView({ behavior: systemReduced() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }

  function closeOverlayAnimated(overlay) {
    if (!overlay?.isConnected) return;
    overlay.classList.add('is-closing');
    setTimeout(() => overlay.remove(), duration(210, 130));
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
      const buttons = panel ? [...panel.querySelectorAll('[data-stab]')] : [];
      const active = panel?.querySelector('[data-stab].active');
      const fromIndex = buttons.indexOf(active);
      const toIndex = buttons.indexOf(settingsTab);
      if (panel) pendingMeasure = {
        kind: 'settings',
        node: panel,
        from: panel.getBoundingClientRect().height,
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
      afterLayout(() => ensureSettingsIndicator());
      return;
    }

    const direction = target.closest('[data-dir]');
    if (direction && pendingMeasure?.kind === 'transaction') {
      const measure = pendingMeasure;
      pendingMeasure = null;
      afterLayout(() => animateHeight(measure.node, measure.from, 320));
      return;
    }

    const settingsTab = target.closest('[data-stab]');
    if (settingsTab && pendingMeasure?.kind === 'settings') {
      const measure = pendingMeasure;
      pendingMeasure = null;
      afterLayout(() => {
        animateHeight(measure.node, measure.from, 320);
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
