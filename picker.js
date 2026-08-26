/* JuHelo — comportamento canônico de selects customizados. */
(() => {
  let popover = null;
  let activeSelect = null;
  let activeHost = null;

  const hostSelector = '.month-control,.field,.period-card label';

  function esc(value='') {
    return String(value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function hostFor(select) {
    return select.closest(hostSelector) || select.parentElement;
  }

  function enhance(select) {
    if (!(select instanceof HTMLSelectElement) || select.multiple) return null;
    if (select.dataset.jhPicker === '1') return hostFor(select);

    const host = hostFor(select);
    if (!host) return null;

    select.dataset.jhPicker = '1';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden','true');

    host.classList.add('jh-select-host');
    host.tabIndex = host.tabIndex >= 0 ? host.tabIndex : 0;
    host.setAttribute('role','button');
    host.setAttribute('aria-haspopup','listbox');
    host.setAttribute('aria-expanded','false');

    const label = host.classList.contains('month-control')
      ? 'Selecionar mês'
      : (host.childNodes[0]?.textContent || 'Selecionar opção').trim();
    if (!host.getAttribute('aria-label')) host.setAttribute('aria-label',label || 'Selecionar opção');
    return host;
  }

  function selectFromHost(target) {
    if (!(target instanceof Element) || target.closest('.jh-select-popover')) return null;
    const host = target.closest('.jh-select-host') || target.closest(hostSelector);
    const select = host?.querySelector('select');
    if (!select) return null;
    enhance(select);
    return select;
  }

  function closePopover({focus=false}={}) {
    const host = activeHost;
    popover?.remove();
    popover = null;
    if (host) host.setAttribute('aria-expanded','false');
    activeSelect = null;
    activeHost = null;
    if (focus) host?.focus?.({preventScroll:true});
  }

  function applyValue(value) {
    if (!activeSelect || !activeSelect.isConnected) return closePopover();
    const select = activeSelect;
    const changed = select.value !== value;
    select.value = value;
    closePopover({focus:true});
    if (changed) {
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function positionPopover() {
    if (!popover || !activeHost?.isConnected) return;

    const rect = activeHost.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportH = vv?.height || window.innerHeight;
    const viewportW = vv?.width || window.innerWidth;
    const offsetTop = vv?.offsetTop || 0;
    const offsetLeft = vv?.offsetLeft || 0;
    const gap = 7;
    const margin = 10;
    const width = Math.min(Math.max(rect.width,220),viewportW-margin*2);
    const maxH = Math.min(330,Math.max(190,viewportH*.44));
    const roomBelow = offsetTop+viewportH-rect.bottom-gap-margin;
    const roomAbove = rect.top-offsetTop-gap-margin;
    const openAbove = roomBelow < Math.min(220,maxH) && roomAbove > roomBelow;
    const heightLimit = Math.max(160,Math.min(maxH,openAbove?roomAbove:roomBelow));
    const left = Math.max(offsetLeft+margin,Math.min(rect.left,offsetLeft+viewportW-width-margin));

    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.maxHeight = `${heightLimit}px`;
    popover.classList.toggle('opens-above',openAbove);

    if (openAbove) {
      popover.style.top = 'auto';
      popover.style.bottom = `${Math.max(margin,window.innerHeight-rect.top+gap)}px`;
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = `${Math.max(offsetTop+margin,Math.min(offsetTop+viewportH-margin-150,rect.bottom+gap))}px`;
    }
  }

  function focusSelected() {
    const selected = popover?.querySelector('.jh-select-option.is-selected');
    selected?.scrollIntoView({block:'nearest'});
    selected?.focus({preventScroll:true});
  }

  function openPopover(select) {
    if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple) return;
    const host = enhance(select);
    if (!host) return;

    if (popover && activeSelect === select) {
      closePopover({focus:true});
      return;
    }
    closePopover();

    activeSelect = select;
    activeHost = host;
    host.setAttribute('aria-expanded','true');

    const options = [...select.options].filter(o=>!o.disabled);
    popover = document.createElement('div');
    popover.className = 'jh-select-popover';
    popover.setAttribute('role','listbox');
    popover.setAttribute('aria-label',host.getAttribute('aria-label') || 'Selecionar opção');
    popover.innerHTML = options.map(o=>`
      <button type="button" class="jh-select-option ${o.value===select.value?'is-selected':''}" data-value="${esc(o.value)}" role="option" aria-selected="${o.value===select.value?'true':'false'}">
        <span>${esc(o.textContent||'')}</span><i>✓</i>
      </button>`).join('');

    document.body.appendChild(popover);
    positionPopover();

    popover.querySelectorAll('.jh-select-option').forEach(btn=>{
      btn.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        applyValue(btn.dataset.value ?? '');
      });
    });

    requestAnimationFrame(focusSelected);
  }

  function enhanceWithin(root=document) {
    root.querySelectorAll?.('select').forEach(enhance);
  }

  document.addEventListener('pointerdown',event=>{
    const select = selectFromHost(event.target);
    if (!select) return;
    event.preventDefault();
    event.stopPropagation();
    openPopover(select);
  },true);

  document.addEventListener('keydown',event=>{
    if (popover) {
      const options=[...popover.querySelectorAll('.jh-select-option')];
      const current=document.activeElement;
      const index=options.indexOf(current);
      if (event.key==='Escape') {event.preventDefault();closePopover({focus:true});return}
      if (event.key==='ArrowDown' || event.key==='ArrowUp') {
        event.preventDefault();
        const delta=event.key==='ArrowDown'?1:-1;
        const next=options[Math.max(0,Math.min(options.length-1,(index<0?0:index)+delta))];
        next?.focus();
        next?.scrollIntoView({block:'nearest'});
        return;
      }
      if ((event.key==='Enter'||event.key===' ') && current?.classList?.contains('jh-select-option')) {
        event.preventDefault();
        current.click();
        return;
      }
    }

    const host = event.target instanceof Element ? event.target.closest('.jh-select-host') : null;
    if (!host || !['Enter',' ','ArrowDown'].includes(event.key)) return;
    const select=host.querySelector('select');
    if (!select) return;
    event.preventDefault();
    openPopover(select);
  },true);

  document.addEventListener('click',event=>{
    if (popover && !event.target.closest('.jh-select-popover') && !event.target.closest('.jh-select-host')) closePopover();
    queueMicrotask(()=>enhanceWithin(document));
  },true);

  document.addEventListener('focusin',()=>queueMicrotask(()=>enhanceWithin(document)));
  document.addEventListener('scroll',()=>{if(popover)closePopover()},true);
  window.addEventListener('resize',()=>popover&&positionPopover(),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>popover&&positionPopover(),{passive:true});

  enhanceWithin(document);
})();
