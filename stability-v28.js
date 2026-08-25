/* JuHelo V28 — estabilidade de boot sem reocultar a interface durante mutacoes. */
const jhAppRoot=document.querySelector('#app');
let jhBootDone=false;
let jhBootObserver=null;

function jhActiveTab(){
  return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab||null;
}

function jhInitialScreenReady(){
  const main=document.querySelector('#app > main.page');
  if(!main)return false;
  const tab=jhActiveTab();
  if(!tab)return true; // login/onboarding
  if(tab==='home')return main.classList.contains('jh-home-v18');
  if(tab==='transactions')return main.classList.contains('jh-transactions-v19');
  if(tab==='boxes')return main.classList.contains('jh-boxes-v20');
  if(tab==='reports')return main.classList.contains('jh-reports-v21');
  if(tab==='goals')return main.classList.contains('jh-goals-v22');
  return true;
}

function jhFinishBoot(){
  if(jhBootDone)return;
  jhBootDone=true;
  jhAppRoot?.classList.remove('jh-ui-pending');
  jhBootObserver?.disconnect();
}

function jhCheckBoot(){
  if(jhBootDone)return;
  if(!jhInitialScreenReady())return;
  requestAnimationFrame(()=>requestAnimationFrame(jhFinishBoot));
}

if(jhAppRoot){
  jhBootObserver=new MutationObserver(jhCheckBoot);
  jhBootObserver.observe(jhAppRoot,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  jhCheckBoot();
  // Fail-safe: nunca manter a interface escondida por problema em refinamento opcional.
  window.setTimeout(jhFinishBoot,900);
}

window.addEventListener('load',jhCheckBoot,{once:true});
