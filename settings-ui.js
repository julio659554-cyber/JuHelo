import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://fjysngoakqbemhjyfima.supabase.co',
  'sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp'
);

let context = null;
let openMenu = null;
let openSettingsOverlay = null;
let loadingContext = null;

function esc(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
  }[char]));
}

function initials(name = 'JH') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'JH';
}

function toast(message, type = '') {
  const root = document.querySelector('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 3400);
}

async function loadContext(force = false) {
  if (context && !force) return context;
  if (loadingContext && !force) return loadingContext;

  loadingContext = (async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      context = null;
      return null;
    }

    const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
      supabase.from('profiles').select('id,display_name,avatar_url').eq('id', session.user.id).maybeSingle(),
      supabase.from('household_members').select('household_id,role,joined_at').eq('user_id', session.user.id).maybeSingle()
    ]);
    if (profileError) throw profileError;
    if (membershipError) throw membershipError;

    let household = null;
    let members = [];
    if (membership?.household_id) {
      const [{ data: householdData, error: householdError }, { data: memberRows, error: membersError }] = await Promise.all([
        supabase.from('households').select('id,name,invite_code,created_at').eq('id', membership.household_id).single(),
        supabase.from('household_members').select('user_id,role,joined_at').eq('household_id', membership.household_id).order('joined_at')
      ]);
      if (householdError) throw householdError;
      if (membersError) throw membersError;
      household = householdData;

      const ids = (memberRows || []).map((row) => row.user_id);
      let profiles = [];
      if (ids.length) {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id,display_name,avatar_url')
          .in('id', ids);
        if (profilesError) throw profilesError;
        profiles = profileRows || [];
      }
      members = (memberRows || []).map((row) => ({
        ...row,
        profile: profiles.find((item) => item.id === row.user_id) || null
      }));
    }

    context = { session, user: session.user, profile, membership, household, members };
    return context;
  })();

  try {
    return await loadingContext;
  } finally {
    loadingContext = null;
  }
}

function closeProfileMenu() {
  if (openMenu) openMenu.remove();
  openMenu = null;
  document.querySelector('.user-chip')?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', outsideMenuHandler, true);
  document.removeEventListener('keydown', menuKeyHandler, true);
}

function outsideMenuHandler(event) {
  if (!openMenu) return;
  if (openMenu.contains(event.target)) return;
  const chip = document.querySelector('.user-chip');
  if (chip?.contains(event.target)) return;
  closeProfileMenu();
}

function menuKeyHandler(event) {
  if (event.key === 'Escape') closeProfileMenu();
}

function syncChip(chip) {
  if (!chip || !context) return;
  const name = context.profile?.display_name || context.user?.user_metadata?.display_name || context.user?.email?.split('@')[0] || 'JuHelo';
  const nameNode = chip.querySelector('span');
  const avatarNode = chip.querySelector('.avatar');
  if (nameNode) nameNode.textContent = name;
  if (avatarNode) avatarNode.textContent = initials(name);
}

function openProfileMenu(chip) {
  if (openMenu) {
    closeProfileMenu();
    return;
  }

  const displayName = context?.profile?.display_name || context?.user?.email?.split('@')[0] || 'Minha conta';
  const menu = document.createElement('div');
  menu.className = 'profile-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <div class="profile-menu-head">
      <div class="avatar profile-menu-avatar">${esc(initials(displayName))}</div>
      <div>
        <strong>${esc(displayName)}</strong>
        <span>${esc(context?.user?.email || '')}</span>
      </div>
    </div>
    <button type="button" class="profile-menu-item" data-settings role="menuitem">
      <span class="profile-menu-icon">⚙</span><span><strong>Ajustes</strong><small>Perfil, casal e segurança</small></span>
    </button>
    <button type="button" class="profile-menu-item danger" data-logout role="menuitem">
      <span class="profile-menu-icon">↪</span><span><strong>Sair</strong><small>Encerrar esta sessão</small></span>
    </button>
  `;

  const topbar = chip.closest('.topbar');
  if (!topbar) return;
  topbar.appendChild(menu);
  openMenu = menu;
  chip.setAttribute('aria-expanded', 'true');

  menu.querySelector('[data-settings]').addEventListener('click', async () => {
    closeProfileMenu();
    await openSettings();
  });
  menu.querySelector('[data-logout]').addEventListener('click', async () => {
    closeProfileMenu();
    const { error } = await supabase.auth.signOut();
    if (error) toast(error.message || 'Não foi possível sair.', 'error');
  });

  requestAnimationFrame(() => menu.classList.add('show'));
  document.addEventListener('pointerdown', outsideMenuHandler, true);
  document.addEventListener('keydown', menuKeyHandler, true);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Código copiado.');
  } catch {
    window.prompt('Copie o código:', text);
  }
}

function renderConnectedAccounts(ctx) {
  const rows = ctx.members.map((member) => {
    const isCurrent = member.user_id === ctx.user.id;
    const displayName = member.profile?.display_name || (isCurrent ? ctx.user.email?.split('@')[0] : 'Pessoa conectada');
    return `
      <div class="connected-account">
        <div class="avatar">${esc(initials(displayName))}</div>
        <div class="connected-account-main">
          <div class="connected-account-title">
            <strong>${esc(displayName)}</strong>
            ${isCurrent ? '<span class="account-badge">Você</span>' : '<span class="account-badge partner">Parceiro(a)</span>'}
          </div>
          <span>${member.role === 'owner' ? 'Criou o JuHelo' : 'Conectado ao mesmo JuHelo'}</span>
          ${isCurrent ? `<small>${esc(ctx.user.email || '')}</small>` : ''}
        </div>
        <span class="connected-dot" title="Conectado"></span>
      </div>
    `;
  }).join('');

  const waiting = ctx.household && ctx.members.length < 2 ? `
    <div class="connected-account waiting">
      <div class="avatar ghost-avatar">＋</div>
      <div class="connected-account-main"><strong>Aguardando segunda conta</strong><span>Compartilhe o código de convite abaixo.</span></div>
    </div>
  ` : '';

  return rows + waiting;
}

function settingsShell(ctx) {
  const name = ctx.profile?.display_name || ctx.user?.user_metadata?.display_name || ctx.user.email?.split('@')[0] || '';
  const memberCount = ctx.members.length;
  return `
    <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="settings-head">
        <div class="settings-person">
          <div class="avatar settings-avatar">${esc(initials(name))}</div>
          <div><h2 id="settings-title">Ajustes</h2><p>${esc(ctx.user.email || '')}</p></div>
        </div>
        <button type="button" class="settings-close" aria-label="Fechar ajustes">×</button>
      </div>

      <div class="settings-tabs" role="tablist">
        <button type="button" class="settings-tab active" data-settings-tab="profile" role="tab">Perfil</button>
        <button type="button" class="settings-tab" data-settings-tab="couple" role="tab">Casal <span>${memberCount}/2</span></button>
        <button type="button" class="settings-tab" data-settings-tab="security" role="tab">Segurança</button>
      </div>

      <div class="settings-content">
        <section class="settings-section active" data-settings-section="profile">
          <div class="settings-section-title"><div><h3>Seu perfil</h3><p>Como sua conta aparece dentro do JuHelo.</p></div></div>
          <form class="settings-form" id="settings-name-form">
            <label>Nome
              <input class="input" name="display_name" maxlength="80" value="${esc(name)}" autocomplete="name" required>
            </label>
            <button class="btn primary" type="submit">Salvar nome</button>
          </form>

          <div class="settings-divider"></div>
          <div class="settings-section-title"><div><h3>E-mail</h3><p>Alterações podem precisar ser confirmadas por e-mail.</p></div></div>
          <form class="settings-form" id="settings-email-form">
            <label>E-mail da conta
              <input class="input" name="email" type="email" value="${esc(ctx.user.email || '')}" autocomplete="email" required>
            </label>
            <button class="btn soft" type="submit">Alterar e-mail</button>
          </form>
        </section>

        <section class="settings-section" data-settings-section="couple">
          <div class="settings-section-title"><div><h3>Contas conectadas</h3><p>${memberCount === 2 ? 'O casal já está conectado.' : 'Conecte a segunda pessoa ao mesmo JuHelo.'}</p></div><span class="settings-count">${memberCount}/2</span></div>
          <div class="connected-list">${renderConnectedAccounts(ctx)}</div>
          ${ctx.household ? `
            <div class="settings-divider"></div>
            <div class="invite-settings-card">
              <div><span>Código do casal</span><strong>${esc(ctx.household.invite_code || '')}</strong></div>
              <button type="button" class="btn soft" data-copy-invite>Copiar código</button>
            </div>
          ` : '<div class="settings-empty">Esta conta ainda não está ligada a um JuHelo.</div>'}
        </section>

        <section class="settings-section" data-settings-section="security">
          <div class="settings-section-title"><div><h3>Alterar senha</h3><p>Use uma senha nova com pelo menos 8 caracteres.</p></div></div>
          <form class="settings-form" id="settings-password-form">
            <label>Nova senha
              <input class="input" name="password" type="password" minlength="8" autocomplete="new-password" required>
            </label>
            <label>Confirmar nova senha
              <input class="input" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required>
            </label>
            <button class="btn primary" type="submit">Atualizar senha</button>
          </form>

          <div class="settings-divider"></div>
          <div class="settings-danger-zone">
            <div><strong>Sessões</strong><span>Você pode sair somente deste dispositivo ou encerrar todas as suas sessões.</span></div>
            <div class="settings-session-actions">
              <button type="button" class="btn ghost" data-logout-current>Sair deste dispositivo</button>
              <button type="button" class="btn red" data-logout-all>Sair de todos</button>
            </div>
          </div>
        </section>
      </div>
    </section>
  `;
}

function activateSettingsTab(overlay, tabName) {
  overlay.querySelectorAll('[data-settings-tab]').forEach((button) => {
    const active = button.dataset.settingsTab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  overlay.querySelectorAll('[data-settings-section]').forEach((section) => {
    section.classList.toggle('active', section.dataset.settingsSection === tabName);
  });
}

function closeSettings() {
  if (!openSettingsOverlay) return;
  const overlay = openSettingsOverlay;
  openSettingsOverlay = null;
  overlay.classList.add('closing');
  document.removeEventListener('keydown', settingsKeyHandler, true);
  window.setTimeout(() => overlay.remove(), 180);
}

function settingsKeyHandler(event) {
  if (event.key === 'Escape') closeSettings();
}

async function openSettings(initialTab = 'profile') {
  const ctx = await loadContext(true).catch((error) => {
    toast(error.message || 'Não foi possível carregar os ajustes.', 'error');
    return null;
  });
  if (!ctx) return;
  if (openSettingsOverlay) openSettingsOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.innerHTML = settingsShell(ctx);
  document.body.appendChild(overlay);
  openSettingsOverlay = overlay;
  requestAnimationFrame(() => overlay.classList.add('show'));

  overlay.querySelector('.settings-close').addEventListener('click', closeSettings);
  overlay.addEventListener('pointerdown', (event) => { if (event.target === overlay) closeSettings(); });
  document.addEventListener('keydown', settingsKeyHandler, true);

  overlay.querySelectorAll('[data-settings-tab]').forEach((button) => {
    button.addEventListener('click', () => activateSettingsTab(overlay, button.dataset.settingsTab));
  });
  activateSettingsTab(overlay, initialTab);

  overlay.querySelector('#settings-name-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const displayName = new FormData(form).get('display_name').trim();
    if (displayName.length < 2) return toast('Digite um nome válido.', 'error');
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
      const { error: profileError } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', ctx.user.id);
      if (profileError) throw profileError;
      const { error: authError } = await supabase.auth.updateUser({ data: { display_name: displayName } });
      if (authError) throw authError;
      context.profile = { ...(context.profile || {}), display_name: displayName };
      ctx.profile = context.profile;
      document.querySelectorAll('.user-chip').forEach(syncChip);
      const headerAvatar = overlay.querySelector('.settings-avatar');
      if (headerAvatar) headerAvatar.textContent = initials(displayName);
      toast('Nome atualizado.');
    } catch (error) {
      toast(error.message || 'Não foi possível atualizar o nome.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Salvar nome';
    }
  });

  overlay.querySelector('#settings-email-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const email = new FormData(form).get('email').trim().toLowerCase();
    if (!email || email === String(ctx.user.email || '').toLowerCase()) return toast('Esse já é o e-mail da conta.');
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast('Solicitação enviada. Confira seu e-mail para confirmar a alteração.');
    } catch (error) {
      toast(error.message || 'Não foi possível alterar o e-mail.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Alterar e-mail';
    }
  });

  overlay.querySelector('#settings-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get('password') || '');
    const confirmPassword = String(fd.get('confirm_password') || '');
    if (password.length < 8) return toast('A nova senha precisa ter pelo menos 8 caracteres.', 'error');
    if (password !== confirmPassword) return toast('As senhas não coincidem.', 'error');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Atualizando…';
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      form.reset();
      toast('Senha alterada com sucesso.');
    } catch (error) {
      toast(error.message || 'Não foi possível alterar a senha.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Atualizar senha';
    }
  });

  const copyButton = overlay.querySelector('[data-copy-invite]');
  if (copyButton && ctx.household?.invite_code) copyButton.addEventListener('click', () => copyText(ctx.household.invite_code));

  overlay.querySelector('[data-logout-current]').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return toast(error.message || 'Não foi possível sair.', 'error');
    closeSettings();
  });

  overlay.querySelector('[data-logout-all]').addEventListener('click', async () => {
    if (!window.confirm('Encerrar todas as sessões da sua conta?')) return;
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) return toast(error.message || 'Não foi possível encerrar as sessões.', 'error');
    closeSettings();
  });
}

async function ensureProfileMenu() {
  const chip = document.querySelector('.user-chip');
  if (!chip || chip.dataset.profileSettingsReady === '1') return;

  const ctx = await loadContext().catch(() => null);
  if (!ctx) return;

  chip.dataset.profileSettingsReady = '1';
  chip.classList.add('profile-trigger');
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.setAttribute('aria-haspopup', 'menu');
  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('aria-label', 'Abrir menu da conta');
  syncChip(chip);

  chip.addEventListener('click', (event) => {
    event.stopPropagation();
    openProfileMenu(chip);
  });
  chip.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProfileMenu(chip);
    }
  });
}

const observer = new MutationObserver(() => {
  ensureProfileMenu().catch(() => {});
});
observer.observe(document.documentElement, { childList: true, subtree: true });

supabase.auth.onAuthStateChange(async (_event, session) => {
  context = null;
  closeProfileMenu();
  closeSettings();
  if (session) ensureProfileMenu().catch(() => {});
});

ensureProfileMenu().catch(() => {});
