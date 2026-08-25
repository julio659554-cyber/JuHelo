/* JuHelo v17 — comportamento global de UX.
   Mantem o fundo travado enquanto modais/ajustes estao abertos e evita gestos de duplo toque em controles. */

let lockedScrollY = 0;
let bodyLocked = false;

function hasOpenOverlay(){
  return Boolean(document.querySelector('.modal-backdrop,.settings-overlay'));
}

function lockBody(){
  if(bodyLocked || !hasOpenOverlay()) return;
  lockedScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.classList.add('jh-modal-open');
  document.body.style.top = `-${lockedScrollY}px`;
  bodyLocked = true;
}

function unlockBody(){
  if(!bodyLocked || hasOpenOverlay()) return;
  document.body.classList.remove('jh-modal-open');
  document.body.style.top = '';
  bodyLocked = false;
  window.scrollTo(0, lockedScrollY);
}

function syncOverlayState(){
  if(hasOpenOverlay()) lockBody();
  else unlockBody();
}

const overlayObserver = new MutationObserver(syncOverlayState);
overlayObserver.observe(document.documentElement,{childList:true,subtree:true});
syncOverlayState();

// iOS: touch-action: manipulation ja resolve a maior parte do duplo toque.
// Este guard protege apenas elementos de acao sem bloquear pinch-to-zoom da pagina.
let lastTouchEnd = 0;
document.addEventListener('touchend',(event)=>{
  const target = event.target.closest?.('button,a,[role="button"]');
  if(!target) return;
  const now = Date.now();
  if(now-lastTouchEnd<=280) event.preventDefault();
  lastTouchEnd = now;
},{passive:false});

// Escape fecha apenas o modal visual mais recente quando houver botao de fechar.
document.addEventListener('keydown',(event)=>{
  if(event.key!=='Escape') return;
  const overlays = [...document.querySelectorAll('.modal-backdrop')];
  const latest = overlays.at(-1);
  latest?.querySelector('[data-close]')?.click();
});
