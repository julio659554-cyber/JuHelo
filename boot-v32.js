(() => {
  const app = document.querySelector('#app');
  if (!app) return;

  const skeletonMarkup = `
    <div class="jh-boot-skeleton" aria-hidden="true">
      <div class="jh-skel jh-skel-title"></div>
      <div class="jh-skel jh-skel-avatar"></div>
      <div class="jh-skel jh-skel-main"></div>
      <div class="jh-skel-row">
        <div class="jh-skel jh-skel-half"></div>
        <div class="jh-skel jh-skel-half"></div>
      </div>
      <div class="jh-skel-row">
        <div class="jh-skel jh-skel-half"></div>
        <div class="jh-skel jh-skel-half"></div>
      </div>
      <div class="jh-skel jh-skel-nav"></div>
    </div>`;

  function hydrateSplash() {
    const splash = app.querySelector(':scope > .splash');
    if (!splash) return false;
    if (!splash.querySelector('.jh-boot-skeleton')) splash.innerHTML = skeletonMarkup;
    return true;
  }

  hydrateSplash();

  const observer = new MutationObserver(() => {
    if (!hydrateSplash()) observer.disconnect();
  });
  observer.observe(app, { childList: true });

  let failed = false;
  function showFailure() {
    if (failed) return;
    const splash = app.querySelector(':scope > .splash');
    if (!splash) return;
    failed = true;
    observer.disconnect();
    splash.innerHTML = `
      <div class="jh-boot-failed" role="alert">
        <div class="jh-boot-failed-icon">↻</div>
        <strong>O JuHelo demorou para carregar</strong>
        <p>Confira sua conexão e tente novamente.</p>
        <button type="button" id="jh-boot-retry">Tentar novamente</button>
      </div>`;
    document.querySelector('#jh-boot-retry')?.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('retry', Date.now().toString());
      location.replace(url.toString());
    });
  }

  const timer = setTimeout(showFailure, 10000);
  const stopTimer = new MutationObserver(() => {
    if (!app.querySelector(':scope > .splash')) {
      clearTimeout(timer);
      stopTimer.disconnect();
    }
  });
  stopTimer.observe(app, { childList: true });

  window.addEventListener('error', (event) => {
    const source = String(event?.filename || '');
    if (source.includes('app-v31') || source.includes('supabase') || source.includes('esm.sh')) {
      setTimeout(showFailure, 150);
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const text = String(event?.reason?.message || event?.reason || '');
    if (/import|module|supabase|fetch/i.test(text)) setTimeout(showFailure, 150);
  });
})();
