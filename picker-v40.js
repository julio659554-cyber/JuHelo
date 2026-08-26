/* JuHelo v40 — seletor próprio em popover ancorado, sem modal. */
(() => {
  let popover = null;
  let activeSelect = null;
  let activeHost = null;

  function esc(value=''){
    return String(value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function selectFromTarget(target){
    if(!(target instanceof Element) || target.closest('.jh-select-popover')) return null;
    const direct = target.closest('select');
    if(direct) return direct;
    const host = target.closest('.month-control,.field,.period-card label');
    return host?.querySelector('select') || null;
  }

  function hostFor(select){
    return select.closest('.month-control,.field,.period-card label') || select.parentElement;
  }

  function neutralize(select){
    if(!(select instanceof HTMLSelectElement)) return;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden','true');
    try{select.blur()}catch(_){ }
  }

  function closePopover(){
    popover?.remove();
    popover = null;
    activeSelect = null;
    activeHost = null;
  }

  function applyValue(value){
    if(!activeSelect || !activeSelect.isConnected) return closePopover();
    const changed = activeSelect.value !== value;
    activeSelect.value = value;
    const select = activeSelect;
    closePopover();
    if(changed){
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function positionPopover(){
    if(!popover || !activeHost?.isConnected) return;
    const rect = activeHost.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const viewportH = window.visualViewport?.height || window.innerHeight;
    const viewportW = window.visualViewport?.width || window.innerWidth;
    const width = Math.min(Math.max(rect.width, 230), viewportW - margin*2);
    const maxH = Math.min(360, Math.max(220, viewportH * .46));
    const roomBelow = viewportH - rect.bottom - gap - margin;
    const roomAbove = rect.top - gap - margin;
    const openAbove = roomBelow < Math.min(260,maxH) && roomAbove > roomBelow;
    const heightLimit = Math.max(180, Math.min(maxH, openAbove ? roomAbove : roomBelow));
    const left = Math.max(margin, Math.min(rect.left, viewportW - width - margin));

    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.maxHeight = `${heightLimit}px`;
    popover.classList.toggle('opens-above',openAbove);

    if(openAbove){
      popover.style.top = 'auto';
      popover.style.bottom = `${Math.max(margin, viewportH - rect.top + gap)}px`;
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = `${Math.min(viewportH - margin - 160, rect.bottom + gap)}px`;
    }
  }

  function openPopover(select){
    if(!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
    neutralize(select);
    if(popover && activeSelect===select){closePopover();return}
    closePopover();

    activeSelect = select;
    activeHost = hostFor(select);
    const options = [...select.options].filter(o=>!o.disabled);

    popover = document.createElement('div');
    popover.className = 'jh-select-popover';
    popover.setAttribute('role','listbox');
    popover.innerHTML = options.map(o=>`
      <button type="button" class="jh-select-option ${o.value===select.value?'is-selected':''}" data-value="${esc(o.value)}" role="option" aria-selected="${o.value===select.value?'true':'false'}">
        <span>${esc(o.textContent||'')}</span>
        <i>${o.value===select.value?'✓':''}</i>
      </button>`).join('');

    document.body.appendChild(popover);
    positionPopover();

    popover.querySelectorAll('.jh-select-option').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        applyValue(btn.dataset.value ?? '');
      });
    });

    requestAnimationFrame(()=>{
      popover?.querySelector('.jh-select-option.is-selected')?.scrollIntoView({block:'nearest'});
    });
  }

  function intercept(event){
    const select = selectFromTarget(event.target);
    if(!select) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    neutralize(select);
    if(event.type==='pointerdown') openPopover(select);
  }

  document.addEventListener('pointerdown',intercept,true);
  document.addEventListener('click',event=>{
    if(popover && !event.target.closest('.jh-select-popover') && !selectFromTarget(event.target)) closePopover();
  },true);

  document.addEventListener('focusin',event=>{
    if(event.target instanceof HTMLSelectElement) neutralize(event.target);
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && popover) closePopover();
  });

  window.addEventListener('resize',()=>popover&&positionPopover(),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>popover&&positionPopover(),{passive:true});
  document.addEventListener('scroll',()=>{ if(popover) closePopover(); },true);

  ['gesturestart','gesturechange','gestureend'].forEach(type=>{
    document.addEventListener(type,e=>e.preventDefault(),{passive:false});
  });
  document.addEventListener('touchmove',e=>{
    if(e.touches?.length>1)e.preventDefault();
  },{passive:false});

  let lastTouch=0;
  document.addEventListener('touchend',e=>{
    const now=Date.now();
    if(now-lastTouch<280)e.preventDefault();
    lastTouch=now;
  },{passive:false});
})();
