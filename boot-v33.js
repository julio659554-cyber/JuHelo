(() => {
  const app=document.querySelector('#app');
  if(!app)return;

  const skeleton=`<div class="jh-boot-skeleton" aria-hidden="true">
    <div class="jh-skel jh-skel-title"></div>
    <div class="jh-skel jh-skel-avatar"></div>
    <div class="jh-skel jh-skel-main"></div>
    <div class="jh-skel-row"><div class="jh-skel jh-skel-half"></div><div class="jh-skel jh-skel-half"></div></div>
    <div class="jh-skel-row"><div class="jh-skel jh-skel-half"></div><div class="jh-skel jh-skel-half"></div></div>
    <div class="jh-skel jh-skel-nav"></div>
  </div>`;

  function ensureSkeleton(){
    const splash=app.querySelector(':scope > .splash');
    if(!splash)return false;
    if(!splash.querySelector('.jh-boot-skeleton'))splash.innerHTML=skeleton;
    return true;
  }

  function fail(message='Não foi possível iniciar o JuHelo.'){
    const splash=app.querySelector(':scope > .splash');
    if(!splash)return;
    splash.innerHTML=`<div class="jh-boot-failed" role="alert">
      <div class="jh-boot-failed-icon">↻</div>
      <strong>O JuHelo não conseguiu iniciar</strong>
      <p>${message}</p>
      <button type="button" id="jh-boot-retry">Tentar novamente</button>
    </div>`;
    document.querySelector('#jh-boot-retry')?.addEventListener('click',()=>{
      const url=new URL(location.href);
      url.searchParams.set('retry',Date.now().toString());
      location.replace(url.toString());
    });
  }

  function loadScript(src,timeout=7000){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>finish(false,new Error(`Timeout: ${src}`)),timeout);
      function finish(ok,err){if(done)return;done=true;clearTimeout(timer);if(!ok)s.remove();ok?resolve():reject(err||new Error(`Falha: ${src}`));}
      s.src=src;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>finish(true);s.onerror=()=>finish(false,new Error(`Falha: ${src}`));
      document.head.appendChild(s);
    });
  }

  async function loadSupabase(){
    if(window.supabase?.createClient)return;
    const sources=[
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
      'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'
    ];
    let lastError;
    for(const src of sources){
      try{await loadScript(src);if(window.supabase?.createClient)return;}catch(e){lastError=e;}
    }
    throw lastError||new Error('SDK do Supabase indisponível.');
  }

  ensureSkeleton();

  let finished=false;
  const finishObserver=new MutationObserver(()=>{
    if(!app.querySelector(':scope > .splash')){
      finished=true;
      clearTimeout(hardTimeout);
      finishObserver.disconnect();
    }
  });
  finishObserver.observe(app,{childList:true});

  const hardTimeout=setTimeout(()=>{
    if(!finished&&app.querySelector(':scope > .splash')){
      finishObserver.disconnect();
      fail('A conexão demorou além do esperado.');
    }
  },15000);

  (async()=>{
    try{
      await loadSupabase();
      await import('./app-v31.js?v=33');
    }catch(err){
      console.error('JuHelo boot v33',err);
      clearTimeout(hardTimeout);
      finishObserver.disconnect();
      fail('Não foi possível carregar os componentes necessários.');
    }
  })();
})();
