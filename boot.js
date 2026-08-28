/* JuHelo — boot canônico, sem MutationObserver e sem flash de UI antiga. */
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

  let failed=false;
  let timeoutId=null;
  let readyPoll=null;

  function splash(){return app.querySelector(':scope > .splash')}
  function showSkeleton(){const node=splash();if(node&&!node.querySelector('.jh-boot-skeleton')&&!node.querySelector('.jh-boot-failed'))node.innerHTML=skeleton}
  function stopWatchdog(){if(timeoutId){clearTimeout(timeoutId);timeoutId=null}if(readyPoll){clearInterval(readyPoll);readyPoll=null}}
  function fail(message='Não foi possível iniciar o JuHelo.'){
    const node=splash();if(!node||failed)return;failed=true;stopWatchdog();
    node.innerHTML=`<div class="jh-boot-failed" role="alert"><div class="jh-boot-failed-icon">↻</div><strong>O JuHelo não conseguiu iniciar</strong><p>${message}</p><button type="button" id="jh-boot-retry">Tentar novamente</button></div>`;
    document.querySelector('#jh-boot-retry')?.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('retry',Date.now().toString());location.replace(url.toString())});
  }
  function startWatchdog(){timeoutId=setTimeout(()=>fail('A conexão ou a sessão demorou além do esperado.'),15000);readyPoll=setInterval(()=>{if(!splash()){failed=false;stopWatchdog()}},180)}
  function loadScript(src,timeout=7000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(false,new Error(`Timeout: ${src}`)),timeout);function finish(ok,err){if(done)return;done=true;clearTimeout(timer);if(!ok)s.remove();ok?resolve():reject(err||new Error(`Falha: ${src}`))}s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=()=>finish(true);s.onerror=()=>finish(false,new Error(`Falha: ${src}`));document.head.appendChild(s)})}
  async function loadSupabase(){
    if(window.supabase?.createClient)return;
    const sources=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js','https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];
    let lastError;for(const src of sources){try{await loadScript(src);if(window.supabase?.createClient)return}catch(error){lastError=error}}
    throw lastError||new Error('SDK do Supabase indisponível.');
  }

  showSkeleton();startWatchdog();
  (async()=>{
    try{
      await loadSupabase();
      await import('./app.js?v=uiux17');
      if(document.readyState==='complete'&&'serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
    }catch(error){console.error('JuHelo boot',error);fail('Não foi possível carregar os componentes necessários.')}
  })();
})();