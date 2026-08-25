/* JuHelo V26 — tema Claro / Escuro / Sistema + aba Tema em Ajustes */
const JH_THEME_KEY='juhelo-theme-preference';
const JH_THEME_VALUES=new Set(['light','dark','system']);
const jhThemeMedia=window.matchMedia('(prefers-color-scheme: dark)');

function getThemePreference(){
  const stored=localStorage.getItem(JH_THEME_KEY);
  return JH_THEME_VALUES.has(stored)?stored:'light';
}
function resolveTheme(preference=getThemePreference()){
  return preference==='system'?(jhThemeMedia.matches?'dark':'light'):preference;
}
function updateThemeMeta(theme){
  let meta=document.querySelector('meta[name="theme-color"]');
  if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
  meta.content=theme==='dark'?'#0f0d14':'#f8f7fb';
}
function applyTheme(preference=getThemePreference(),persist=false){
  const safe=JH_THEME_VALUES.has(preference)?preference:'light';
  if(persist)localStorage.setItem(JH_THEME_KEY,safe);
  const resolved=resolveTheme(safe);
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themePreference=safe;
  document.documentElement.style.colorScheme=resolved;
  updateThemeMeta(resolved);
  document.dispatchEvent(new CustomEvent('juhelo:themechange',{detail:{preference:safe,theme:resolved}}));
  syncThemeControls();
}
function themeIcon(type){
  if(type==='light')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  if(type==='dark')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 15.2A8.6 8.6 0 0 1 8.8 3.5 9 9 0 1 0 20.5 15.2Z"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
}
function themeOption(value,title,copy){
  return `<button type="button" class="jh-theme-option" data-theme-value="${value}" role="radio" aria-checked="false">
    <span class="jh-theme-option-icon">${themeIcon(value)}</span>
    <span class="jh-theme-option-copy"><strong>${title}</strong><small>${copy}</small></span>
    <span class="jh-theme-check" aria-hidden="true">✓</span>
  </button>`;
}
function syncThemeControls(root=document){
  const preference=getThemePreference();
  root.querySelectorAll('[data-theme-value]').forEach(button=>{
    const active=button.dataset.themeValue===preference;
    button.classList.toggle('active',active);
    button.setAttribute('aria-checked',String(active));
  });
  root.querySelectorAll('[data-current-theme-label]').forEach(node=>{
    node.textContent=preference==='dark'?'Escuro':preference==='system'?'Sistema':'Claro';
  });
}
function activateThemeTab(overlay){
  overlay.querySelectorAll('[data-settings-tab]').forEach(button=>{
    const active=button.dataset.settingsTab==='theme';
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  overlay.querySelectorAll('[data-settings-section]').forEach(section=>section.classList.toggle('active',section.dataset.settingsSection==='theme'));
}
function injectThemeSettings(overlay){
  if(!overlay||overlay.dataset.jhThemeReady==='1')return;
  const tabs=overlay.querySelector('.settings-tabs');
  const content=overlay.querySelector('.settings-content');
  if(!tabs||!content)return;

  const tab=document.createElement('button');
  tab.type='button';
  tab.className='settings-tab jh-theme-tab';
  tab.dataset.settingsTab='theme';
  tab.setAttribute('role','tab');
  tab.innerHTML='Tema';
  tabs.appendChild(tab);

  const section=document.createElement('section');
  section.className='settings-section jh-theme-settings';
  section.dataset.settingsSection='theme';
  section.innerHTML=`
    <div class="settings-section-title">
      <div><h3>Aparência</h3><p>Escolha como o JuHelo aparece neste aparelho.</p></div>
      <span class="jh-current-theme" data-current-theme-label>Claro</span>
    </div>
    <div class="jh-theme-options" role="radiogroup" aria-label="Tema do JuHelo">
      ${themeOption('light','Claro','Visual claro e suave')}
      ${themeOption('dark','Escuro','Confortável em ambientes escuros')}
      ${themeOption('system','Sistema','Segue o tema do seu aparelho')}
    </div>
    <div class="settings-divider"></div>
    <div class="jh-theme-preview" aria-hidden="true">
      <div class="jh-theme-preview-card"><span></span><strong></strong><small></small></div>
      <div class="jh-theme-preview-mini"><span></span><span></span></div>
    </div>
    <p class="jh-theme-help">A preferência fica salva somente neste dispositivo e é aplicada assim que o app abre.</p>`;
  content.appendChild(section);

  tab.addEventListener('click',()=>activateThemeTab(overlay));
  section.querySelectorAll('[data-theme-value]').forEach(button=>button.addEventListener('click',()=>{
    applyTheme(button.dataset.themeValue,true);
    syncThemeControls(overlay);
  }));
  overlay.dataset.jhThemeReady='1';
  overlay.classList.add('jh-settings-has-theme');
  syncThemeControls(overlay);
}
function scanThemeSettings(){
  document.querySelectorAll('.settings-overlay').forEach(injectThemeSettings);
}

// Reage a mudanças do sistema somente quando a preferência é "Sistema".
function handleSystemThemeChange(){if(getThemePreference()==='system')applyTheme('system',false)}
if(jhThemeMedia.addEventListener)jhThemeMedia.addEventListener('change',handleSystemThemeChange);
else jhThemeMedia.addListener?.(handleSystemThemeChange);

new MutationObserver(scanThemeSettings).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('juhelo:themechange',()=>syncThemeControls());
window.addEventListener('storage',event=>{if(event.key===JH_THEME_KEY)applyTheme(getThemePreference(),false)});
applyTheme(getThemePreference(),false);
scanThemeSettings();
