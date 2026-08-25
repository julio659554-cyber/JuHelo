/* JuHelo V27 — revela cada tela apenas depois dos refinamentos visuais. */
const appRoot=document.querySelector('#app');
let settleRaf=0;
let settleTimer=0;

function activeTabName(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab||null}
function pageIsRefined(){
  const main=document.querySelector('#app > main.page');
  if(!main)return true;
  const tab=activeTabName();
  if(!tab)return true; // login/onboarding/splash
  if(tab==='home')return main.classList.contains('jh-home-v18');
  if(tab==='transactions')return main.classList.contains('jh-transactions-v19');
  if(tab==='boxes')return main.classList.contains('jh-boxes-v20');
  if(tab==='reports')return main.classList.contains('jh-reports-v21');
  if(tab==='goals')return main.classList.contains('jh-goals-v22');
  return true;
}
function revealWhenStable(attempt=0){
  cancelAnimationFrame(settleRaf);
  settleRaf=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(pageIsRefined()||attempt>=8){
      appRoot?.classList.remove('jh-ui-pending');
      return;
    }
    revealWhenStable(attempt+1);
  }));
}
function markPending(){
  if(!appRoot)return;
  appRoot.classList.add('jh-ui-pending');
  clearTimeout(settleTimer);
  settleTimer=setTimeout(()=>revealWhenStable(0),0);
}

if(appRoot){
  markPending();
  new MutationObserver(markPending).observe(appRoot,{childList:true,subtree:true});
}
// A navbar fica fora de #app e muda junto das telas.
new MutationObserver(()=>{
  if(document.querySelector('.bottom-nav'))markPending();
}).observe(document.body,{childList:true,subtree:false});

document.addEventListener('click',event=>{
  if(event.target.closest('.nav-item'))markPending();
},true);

window.addEventListener('load',()=>revealWhenStable(0));
