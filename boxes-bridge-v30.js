/* JuHelo V30 — usa a UI canonica V29, mas delega as operacoes ao core para manter todo o estado sincronizado. */
function bridgeLegacyBoxAction(target){
  const main=target.closest('main.page');
  if(!main||!target.closest('.jh29-boxes-root'))return false;
  let legacy=null;
  const card=target.closest('[data-box-id]');
  const id=card?.dataset.boxId;
  if(target.closest('[data-new-box]'))legacy=main.querySelector('.jh29-legacy-boxes [data-action="new-box"]');
  else if(id&&target.closest('[data-edit]'))legacy=main.querySelector(`.jh29-legacy-boxes .edit-box[data-id="${id}"]`);
  else if(id&&target.closest('[data-add]'))legacy=main.querySelector(`.jh29-legacy-boxes .add-box[data-id="${id}"]`);
  else if(id&&target.closest('[data-withdraw]'))legacy=main.querySelector(`.jh29-legacy-boxes .withdraw-box[data-id="${id}"]`);
  else if(id&&target.closest('[data-history]'))legacy=main.querySelector(`.jh29-legacy-boxes .history-box[data-id="${id}"]`);
  if(!legacy)return false;
  legacy.click();
  return true;
}

document.addEventListener('click',event=>{
  const target=event.target.closest('.jh29-boxes-root button');
  if(!target)return;
  if(!bridgeLegacyBoxAction(target))return;
  event.preventDefault();
  event.stopImmediatePropagation();
},true);
