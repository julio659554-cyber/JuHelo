import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://fjysngoakqbemhjyfima.supabase.co',
  'sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp'
);

let currentHousehold = null;
let currentMemberCount = 0;

async function loadHouseholdInfo() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    currentHousehold = null;
    return;
  }

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!member?.household_id) {
    currentHousehold = null;
    return;
  }

  const [{ data: household }, { count }] = await Promise.all([
    supabase
      .from('households')
      .select('id,name,invite_code')
      .eq('id', member.household_id)
      .single(),
    supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', member.household_id)
  ]);

  currentHousehold = household || null;
  currentMemberCount = count || 0;
}

function injectStyles() {
  if (document.querySelector('#juhelo-couple-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'juhelo-couple-widget-styles';
  style.textContent = `
    .couple-invite-btn{border:0;background:#f0e9ff;color:#7531dd;font:inherit;font-weight:700;border-radius:999px;padding:9px 13px;cursor:pointer;white-space:nowrap}
    .couple-overlay{position:fixed;inset:0;background:rgba(30,27,49,.36);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px;z-index:99999}
    .couple-card{width:min(100%,430px);background:#fff;border-radius:28px;padding:24px;box-shadow:0 24px 80px rgba(30,27,49,.22);color:#1e1b31}
    .couple-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
    .couple-head h2{margin:0;font-size:24px}
    .couple-close{border:0;background:#f5f3f8;width:38px;height:38px;border-radius:50%;font-size:22px;cursor:pointer}
    .couple-sub{margin:0 0 18px;color:#777184;line-height:1.45}
    .couple-code{font-size:26px;font-weight:800;letter-spacing:2px;text-align:center;background:#f6f1ff;color:#7531dd;border-radius:20px;padding:18px;margin:14px 0}
    .couple-copy{width:100%;border:0;background:#7531dd;color:#fff;border-radius:16px;padding:14px 18px;font:inherit;font-weight:800;cursor:pointer}
    .couple-status{margin-top:14px;padding:12px 14px;border-radius:16px;background:#effaf6;color:#26735b;font-size:14px}
    @media(max-width:640px){.couple-invite-btn{padding:8px 11px;font-size:13px}.couple-card{border-radius:24px}}
  `;
  document.head.appendChild(style);
}

function openInviteModal() {
  if (!currentHousehold) return;
  const overlay = document.createElement('div');
  overlay.className = 'couple-overlay';
  overlay.innerHTML = `
    <section class="couple-card" role="dialog" aria-modal="true" aria-label="Convite do casal">
      <div class="couple-head">
        <h2>Convide seu parceiro</h2>
        <button class="couple-close" aria-label="Fechar">×</button>
      </div>
      <p class="couple-sub">A segunda pessoa cria a própria conta e, na tela de entrada do casal, usa este código para entrar no mesmo JuHelo.</p>
      <div class="couple-code">${currentHousehold.invite_code}</div>
      <button class="couple-copy">Copiar código</button>
      <div class="couple-status">${currentMemberCount >= 2 ? '💜 O casal já está conectado.' : '1 de 2 pessoas conectadas. Envie o código para a segunda pessoa.'}</div>
    </section>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.couple-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('.couple-copy').onclick = async (e) => {
    try {
      await navigator.clipboard.writeText(currentHousehold.invite_code);
      e.currentTarget.textContent = 'Código copiado ✓';
      setTimeout(() => { if (e.currentTarget) e.currentTarget.textContent = 'Copiar código'; }, 1800);
    } catch {
      window.prompt('Copie o código:', currentHousehold.invite_code);
    }
  };
}

async function ensureButton() {
  injectStyles();
  if (!currentHousehold) await loadHouseholdInfo();
  if (!currentHousehold) return;

  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.couple-invite-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'couple-invite-btn';
  btn.type = 'button';
  btn.textContent = currentMemberCount >= 2 ? 'Casal 💜' : 'Convidar 💜';
  btn.onclick = openInviteModal;

  const userChip = topbar.querySelector('.user-chip');
  if (userChip) topbar.insertBefore(btn, userChip);
  else topbar.appendChild(btn);
}

const observer = new MutationObserver(() => ensureButton().catch(console.warn));
observer.observe(document.documentElement, { childList: true, subtree: true });

supabase.auth.onAuthStateChange(async () => {
  currentHousehold = null;
  await loadHouseholdInfo();
  ensureButton().catch(console.warn);
});

loadHouseholdInfo().then(ensureButton).catch(console.warn);
