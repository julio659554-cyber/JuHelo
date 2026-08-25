/* JuHelo V16 — acabamento do menu de perfil */

const profileIcons = {
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.38.34.72.6 1 .3.3.68.5 1.1.6h.1v4h-.1a1.7 1.7 0 0 0-1.7.4Z"></path></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4"></path></svg>'
};

function accountNameFromPage() {
  const name = document.querySelector('.user-chip .profile-name')?.textContent?.trim();
  if (name && name !== 'JuHelo' && name !== 'Minha conta') return name;
  return '';
}

function polishProfileMenu(menu) {
  if (!menu || menu.dataset.v16Polished === '1') return;

  const accountName = accountNameFromPage();
  const menuName = menu.querySelector('.profile-menu-head strong');
  if (menuName && accountName) menuName.textContent = accountName;

  const settings = menu.querySelector('[data-settings] .profile-menu-icon');
  const logout = menu.querySelector('[data-logout] .profile-menu-icon');
  if (settings) settings.innerHTML = profileIcons.settings;
  if (logout) logout.innerHTML = profileIcons.logout;

  menu.dataset.v16Polished = '1';
}

function polishExistingMenus() {
  document.querySelectorAll('.profile-menu').forEach(polishProfileMenu);
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.('.profile-menu')) polishProfileMenu(node);
      node.querySelectorAll?.('.profile-menu').forEach(polishProfileMenu);
    }
  }
}).observe(document.body, { childList: true, subtree: true });

window.addEventListener('load', polishExistingMenus);
polishExistingMenus();
