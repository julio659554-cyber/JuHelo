function boxesActive(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='boxes'}
function enhanceBoxesV20(){
  if(!boxesActive()) return;
  const main=document.querySelector('#app > main.page');
  if(!main) return;
  main.classList.add('jh-boxes-v20');
  const create=main.querySelector('[data-action="new-box"]');
  if(create){create.classList.add('jh-large-create');create.textContent='+ Nova caixinha'}
  main.querySelectorAll('.box-card').forEach(card=>{
    card.classList.add('jh-box-card');
    const edit=card.querySelector('.edit-box');
    if(edit && edit.dataset.jhEdit!=='1'){
      edit.textContent='•••';
      edit.setAttribute('aria-label','Opções da caixinha');
      edit.title='Editar caixinha';
      edit.dataset.jhEdit='1';
      card.appendChild(edit);
    }
    const top=card.querySelector('.box-top');
    top?.classList.add('jh-box-top');
    card.querySelector('.box-balance')?.classList.add('jh-box-balance');
    const directSub=[...card.children].find(el=>el.classList?.contains('row-sub')&&!el.classList.contains('progress-copy'));
    directSub?.classList.add('jh-box-balance-label');
  });
}
let boxes20raf=0;
function scheduleBoxes20(){cancelAnimationFrame(boxes20raf);boxes20raf=requestAnimationFrame(enhanceBoxesV20)}
new MutationObserver(scheduleBoxes20).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(scheduleBoxes20,0),true);
window.addEventListener('load',scheduleBoxes20);
scheduleBoxes20();
