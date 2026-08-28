/* JuHelo — motion system canônico. Sem MutationObserver. */
(() => {
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const systemReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const duration = (normal, reduced = 140) => systemReduced() ? reduced : normal;
  let pendingTransactionMeasure = null;
  let pendingSettings = null;

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
    section.getAnimations().forEach(animation => animation.cancel());
    section.animate(
      reduced
        ? [{ opacity: .72 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${direction * 10}px)` },
            { opacity: 1, transform: 'translateX(0)' }
          ],
      { duration: duration(220, 120), easing: EASE }
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
            ? [{ opacity: .7 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'translateY(7px)' },
                { opacity: 1, transform: 'translateY(0)' }
              ],
          { duration: duration(230, 120), easing: EASE }
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
    active.scrollIntoView({ behavior: systemReduced() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }

  function stabilizeSettings(panel) {
    if (!panel) return;
    const content = panel.querySelector('.settings-content');
    panel.style.width = '';
    panel.style.height = '';
    panel.style.maxWidth = '';
    panel.style.overflow = '';
    if (content) {
      content.style.height = '';
      content.style.width = '';
    }
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
      if (card) pendingTransactionMeasure = { node: card, from: card.getBoundingClientRect().height };
      return;
    }

    const settingsTab = target.closest('[data-stab]');
    if (settingsTab) {
      const panel = settingsTab.closest('.settings-panel');
      const buttons = panel ? [...panel.querySelectorAll('[data-stab]')] : [];
      const active = panel?.querySelector('[data-stab].active');
      const fromIndex = buttons.indexOf(active);
      const toIndex = buttons.indexOf(settingsTab);
      pendingSettings = {
        panel,
        direction: toIndex >= fromIndex ? 1 : -1
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
      afterLayout(() => {
        const panel = document.querySelector('.settings-panel');
        stabilizeSettings(panel);
        ensureSettingsIndicator(panel);
      });
      return;
    }

    const direction = target.closest('[data-dir]');
    if (direction && pendingTransactionMeasure) {
      const measure = pendingTransactionMeasure;
      pendingTransactionMeasure = null;
      afterLayout(() => animateHeight(measure.node, measure.from, 300));
      return;
    }

    const settingsTab = target.closest('[data-stab]');
    if (settingsTab && pendingSettings) {
      const measure = pendingSettings;
      pendingSettings = null;
      afterLayout(() => {
        const panel = measure.panel;
        stabilizeSettings(panel);
        const content = panel?.querySelector('.settings-content');
        if (content) content.scrollTop = 0;
        animateSection(panel?.querySelector('.settings-section.active'), measure.direction);
        const tabs = panel?.querySelector('.settings-tabs');
        ensureSettingsIndicator(panel);
        updateSettingsIndicator(tabs, true);
      });
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.settings-panel').forEach(panel => {
      stabilizeSettings(panel);
      const tabs = panel.querySelector('.settings-tabs');
      if (tabs) updateSettingsIndicator(tabs, false);
    });
  }, { passive: true });
})();
