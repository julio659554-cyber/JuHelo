import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://fjysngoakqbemhjyfima.supabase.co',
  'sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp'
);

let cached = null;
let cachedAt = 0;
let pending = null;

function initials(name = 'JH') {
  return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'JH';
}

async function loadCouple(force = false) {
  if (!force && cached && Date.now() - cachedAt < 30000) return cached;
  if (pending && !force) return pending;

  pending = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (membershipError || !membership?.household_id) return [];

    const { data: memberRows, error: membersError } = await supabase
      .from('household_members')
      .select('user_id,role,joined_at')
      .eq('household_id', membership.household_id)
      .order('joined_at');
    if (membersError) throw membersError;

    const ids = (memberRows || []).map(row => row.user_id);
    if (!ids.length) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,display_name,avatar_url')
      .in('id', ids);
    if (profilesError) throw profilesError;

    const list = (memberRows || []).map(row => ({
      ...row,
      isCurrent: row.user_id === session.user.id,
      profile: (profiles || []).find(profile => profile.id === row.user_id) || null
    }));

    cached = list;
    cachedAt = Date.now();
    return list;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

function avatarNode(member, index) {
  const profile = member.profile || {};
  const name = profile.display_name || (member.isCurrent ? 'Você' : 'Parceiro(a)');
  const avatar = document.createElement('span');
  avatar.className = `avatar couple-avatar couple-avatar-${index + 1}${member.isCurrent ? ' current' : ''}`;
  avatar.title = name;
  avatar.setAttribute('aria-label', name);

  if (profile.avatar_url) {
    const img = document.createElement('img');
    img.src = profile.avatar_url;
    img.alt = name;
    img.loading = 'lazy';
    avatar.appendChild(img);
  } else {
    avatar.textContent = initials(name);
  }

  return avatar;
}

async function syncCoupleAvatars(force = false) {
  const chip = document.querySelector('.topbar .user-chip');
  if (!chip) return;
  if (!force && chip.dataset.coupleAvatarsReady === '1' && chip.querySelector('.couple-avatar-stack')) return;

  const members = await loadCouple(force).catch(() => []);
  if (!document.body.contains(chip) || !members.length) return;

  Array.from(chip.children).forEach(child => {
    if (child.classList?.contains('avatar') || child.classList?.contains('couple-avatar-stack')) child.remove();
  });

  const stack = document.createElement('span');
  stack.className = 'couple-avatar-stack';
  stack.setAttribute('aria-label', members.length > 1 ? 'Contas do casal conectadas' : 'Conta conectada');

  members.slice(0, 2).forEach((member, index) => stack.appendChild(avatarNode(member, index)));

  if (members.length > 1) {
    const dot = document.createElement('span');
    dot.className = 'couple-connected-dot';
    dot.title = 'Casal conectado';
    stack.appendChild(dot);
  }

  chip.appendChild(stack);
  chip.dataset.coupleAvatarsReady = '1';
}

let timer = 0;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => syncCoupleAvatars(false), 40);
}

new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

supabase.auth.onAuthStateChange(() => {
  cached = null;
  cachedAt = 0;
  setTimeout(() => syncCoupleAvatars(true), 80);
});

window.addEventListener('focus', () => syncCoupleAvatars(true));
window.addEventListener('load', schedule);
schedule();
