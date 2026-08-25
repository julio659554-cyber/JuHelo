import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://fjysngoakqbemhjyfima.supabase.co',
  'sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp'
);

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFmt = new Intl.DateTimeFormat('pt-BR');
let householdId = null;
let renderToken = 0;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(value) { return brl.format(Number(value || 0)); }
function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return value;
  return dateFmt.format(new Date(y, m - 1, d));
}
function daysUntil(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  const end = new Date(y, m - 1, d, 12);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((end - now) / 86400000);
}
function toast(message, type = '') {
  const root = document.querySelector('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function closeModal(node) { node?.remove(); }
function modal(title, content) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop gb-modal-backdrop';
  wrap.innerHTML = `<section class="modal-card gb-modal-card"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close>×</button></div>${content}</section>`;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]').addEventListener('click', () => closeModal(wrap));
  wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(wrap); });
  return wrap;
}

async function ensureHousehold() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { householdId = null; return null; }
  const { data } = await supabase.from('household_members').select('household_id').eq('user_id', session.user.id).maybeSingle();
  householdId = data?.household_id || null;
  return householdId;
}

async function loadBoxesData() {
  if (!householdId && !(await ensureHousehold())) return { boxes: [], balances: [] };
  const [{ data: boxes, error: e1 }, { data: balances, error: e2 }] = await Promise.all([
    supabase.from('boxes').select('id,name,target_amount,target_date,is_archived,created_at').eq('household_id', householdId).eq('is_archived', false).order('created_at'),
    supabase.from('box_balances').select('box_id,balance').eq('household_id', householdId)
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { boxes: boxes || [], balances: balances || [] };
}

async function openBoxEditor(box = null) {
  if (!householdId && !(await ensureHousehold())) return toast('Entre no seu JuHelo primeiro.', 'error');
  const wrap = modal(box ? 'Editar caixinha' : 'Nova caixinha', `
    <form class="form-grid" data-box-form>
      <div class="field"><label>Nome da caixinha</label><input class="input" name="name" value="${esc(box?.name || '')}" required maxlength="80"></div>
      <div class="field"><label>Valor-alvo <span class="optional">opcional</span></label><input class="input" name="target" type="number" min="0.01" step="0.01" value="${box?.target_amount ?? ''}" placeholder="Ex.: 8000"></div>
      <div class="field"><label>Prazo <span class="optional">opcional</span></label><input class="input" name="date" type="date" value="${esc(box?.target_date || '')}"><div class="row-sub">Serve como referência para quando vocês querem chegar no valor.</div></div>
      <div class="gb-info-note"><span>Caixinha</span><p>O saldo continua vindo dos depósitos e retiradas. Meta de valor e prazo são apenas referências.</p></div>
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">${box ? 'Salvar' : 'Criar caixinha'}</button></div>
    </form>`);

  wrap.querySelector('[data-cancel]').addEventListener('click', () => closeModal(wrap));
  wrap.querySelector('[data-box-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const target = fd.get('target');
    const payload = {
      name: String(fd.get('name') || '').trim(),
      target_amount: target ? Number(target) : null,
      target_date: fd.get('date') || null
    };
    if (!payload.name) return toast('Dê um nome para a caixinha.', 'error');
    let error;
    if (box) {
      ({ error } = await supabase.from('boxes').update(payload).eq('id', box.id));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      ({ error } = await supabase.from('boxes').insert({ ...payload, household_id: householdId, created_by: session.user.id }));
    }
    if (error) return toast(error.message, 'error');
    closeModal(wrap);
    toast(box ? 'Caixinha atualizada.' : 'Caixinha criada.');
    setTimeout(() => window.location.reload(), 220);
  });
}

function deadlineBadge(date) {
  if (!date) return '<span class="gb-deadline muted">Sem prazo</span>';
  const diff = daysUntil(date);
  const cls = diff < 0 ? 'late' : diff <= 30 ? 'soon' : '';
  const suffix = diff < 0 ? ' · prazo passou' : diff === 0 ? ' · hoje' : diff === 1 ? ' · amanhã' : '';
  return `<span class="gb-deadline ${cls}">Até ${esc(formatDate(date))}${suffix}</span>`;
}

async function enhanceBoxes(force = false) {
  const heading = [...document.querySelectorAll('.section-title h1')].find(el => el.textContent.trim() === 'Caixinhas');
  if (!heading) return;
  const section = heading.closest('.section-title')?.parentElement;
  if (!section) return;
  if (!force && section.dataset.gbEnhanced === '1') return;
  const token = ++renderToken;
  try {
    const { boxes, balances } = await loadBoxesData();
    if (token !== renderToken || !document.body.contains(section)) return;
    section.dataset.gbEnhanced = '1';
    const balanceMap = new Map(balances.map(x => [x.box_id, Number(x.balance || 0)]));

    const createBtn = section.querySelector('[data-action="new-box"]');
    if (createBtn) {
      createBtn.onclick = e => { e.preventDefault(); e.stopImmediatePropagation(); openBoxEditor(); };
    }

    boxes.forEach(box => {
      const edit = section.querySelector(`.edit-box[data-id="${box.id}"]`);
      const card = edit?.closest('.box-card');
      if (!card) return;
      edit.onclick = e => { e.preventDefault(); e.stopImmediatePropagation(); openBoxEditor(box); };
      card.querySelector('.gb-box-meta')?.remove();
      const balance = balanceMap.get(box.id) || 0;
      const target = Number(box.target_amount || 0);
      const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((balance / target) * 100))) : null;
      const meta = document.createElement('div');
      meta.className = 'gb-box-meta';
      meta.innerHTML = `
        <div class="gb-box-meta-row">${target ? `<span><strong>${pct}%</strong> de ${money(target)}</span>` : '<span>Sem valor-alvo</span>'}${deadlineBadge(box.target_date)}</div>
        ${target ? `<div class="gb-target-copy">Faltam <strong>${money(Math.max(0, target - balance))}</strong> para o objetivo.</div>` : ''}`;
      const actions = card.querySelector('.actions-inline');
      card.insertBefore(meta, actions || null);
    });
  } catch (err) {
    console.warn('JuHelo boxes enhancement', err);
  }
}

async function loadGoalsData() {
  if (!householdId && !(await ensureHousehold())) return [];
  const { data, error } = await supabase.from('goals').select('id,title,notes,due_date,is_completed,completed_at,sort_order,created_at').eq('household_id', householdId).order('is_completed').order('sort_order').order('created_at');
  if (error) throw error;
  return data || [];
}

async function enhanceHomeGoalSummary() {
  const button = document.querySelector('.mini-summary[data-tab="goals"] strong');
  if (!button) return;
  try {
    const goals = await loadGoalsData();
    button.textContent = `${goals.filter(g => g.is_completed).length}/${goals.length}`;
  } catch (err) {
    console.warn('JuHelo goals summary', err);
  }
}

async function openGoalEditor(goal = null) {
  if (!householdId && !(await ensureHousehold())) return toast('Entre no seu JuHelo primeiro.', 'error');
  const wrap = modal(goal ? 'Editar meta' : 'Nova meta', `
    <form class="form-grid" data-goal-form>
      <div class="field"><label>O que vocês querem concluir?</label><input class="input" name="title" value="${esc(goal?.title || '')}" required maxlength="120" placeholder="Ex.: Comprar a geladeira"></div>
      <div class="field"><label>Observação <span class="optional">opcional</span></label><textarea class="input gb-textarea" name="notes" rows="3" maxlength="400" placeholder="Detalhes que ajudam vocês a lembrar da meta">${esc(goal?.notes || '')}</textarea></div>
      <div class="field"><label>Prazo <span class="optional">opcional</span></label><input class="input" name="date" type="date" value="${esc(goal?.due_date || '')}"></div>
      <div class="gb-info-note checklist"><span>Meta</span><p>Funciona como checklist. Quando concluírem, é só tocar na bolinha ao lado da meta.</p></div>
      ${goal ? '<button class="btn red" type="button" data-delete>Excluir meta</button>' : ''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`);
  wrap.querySelector('[data-cancel]').addEventListener('click', () => closeModal(wrap));
  wrap.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm('Excluir esta meta?')) return;
    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    if (error) return toast(error.message, 'error');
    closeModal(wrap);
    toast('Meta excluída.');
    await renderGoalsChecklist(true);
    await enhanceHomeGoalSummary();
  });
  wrap.querySelector('[data-goal-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get('title') || '').trim(),
      notes: String(fd.get('notes') || '').trim() || null,
      due_date: fd.get('date') || null,
      box_id: null,
      target_amount: null,
      auto_complete: false
    };
    if (!payload.title) return toast('Escreva a meta.', 'error');
    let error;
    if (goal) {
      ({ error } = await supabase.from('goals').update(payload).eq('id', goal.id));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      ({ error } = await supabase.from('goals').insert({ ...payload, household_id: householdId, created_by: session.user.id }));
    }
    if (error) return toast(error.message, 'error');
    closeModal(wrap);
    toast(goal ? 'Meta atualizada.' : 'Meta adicionada ao checklist.');
    await renderGoalsChecklist(true);
    await enhanceHomeGoalSummary();
  });
}

async function toggleGoal(goal, button) {
  button.disabled = true;
  const completed = !goal.is_completed;
  const { error } = await supabase.from('goals').update({
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null
  }).eq('id', goal.id);
  if (error) {
    button.disabled = false;
    return toast(error.message, 'error');
  }
  button.classList.toggle('done', completed);
  button.textContent = completed ? '✓' : '';
  const item = button.closest('.gb-goal-item');
  item?.classList.toggle('completed', completed);
  goal.is_completed = completed;
  toast(completed ? 'Meta concluída ✓' : 'Meta reaberta.');
  await enhanceHomeGoalSummary();
  setTimeout(() => renderGoalsChecklist(true), 260);
}

function goalStatus(goal) {
  if (goal.is_completed) return `<span class="gb-goal-status completed">Concluída${goal.completed_at ? ` · ${esc(formatDate(String(goal.completed_at).slice(0, 10)))}` : ''}</span>`;
  if (!goal.due_date) return '<span class="gb-goal-status">Sem prazo</span>';
  const diff = daysUntil(goal.due_date);
  if (diff < 0) return `<span class="gb-goal-status late">Prazo: ${esc(formatDate(goal.due_date))} · atrasada</span>`;
  if (diff === 0) return '<span class="gb-goal-status soon">Prazo: hoje</span>';
  return `<span class="gb-goal-status ${diff <= 7 ? 'soon' : ''}">Prazo: ${esc(formatDate(goal.due_date))}</span>`;
}

async function renderGoalsChecklist(force = false) {
  const heading = [...document.querySelectorAll('.section-title h1')].find(el => el.textContent.trim() === 'Metas');
  if (!heading) return;
  const root = heading.closest('.section-title')?.parentElement;
  if (!root) return;
  if (!force && root.dataset.gbGoals === '1') return;
  try {
    const goals = await loadGoalsData();
    if (!document.body.contains(root)) return;
    root.dataset.gbGoals = '1';
    const titleWrap = heading.parentElement;
    const desc = titleWrap?.querySelector('p');
    if (desc) desc.textContent = 'Checklist dos planos que vocês querem realizar.';
    const createBtn = root.querySelector('[data-action="new-goal"]');
    if (createBtn) createBtn.textContent = '＋ Nova meta';

    const panel = root.querySelector('.panel');
    if (!panel) return;
    const pending = goals.filter(g => !g.is_completed);
    const completed = goals.filter(g => g.is_completed);
    panel.classList.add('gb-goals-panel');
    panel.innerHTML = goals.length ? `
      <div class="gb-checklist-head"><span>${pending.length} ${pending.length === 1 ? 'pendente' : 'pendentes'}</span><span>${completed.length} ${completed.length === 1 ? 'concluída' : 'concluídas'}</span></div>
      <div class="gb-goal-list">${[...pending, ...completed].map(goal => `
        <article class="gb-goal-item ${goal.is_completed ? 'completed' : ''}" data-goal-id="${goal.id}">
          <button type="button" class="gb-goal-check ${goal.is_completed ? 'done' : ''}" aria-label="${goal.is_completed ? 'Reabrir meta' : 'Concluir meta'}">${goal.is_completed ? '✓' : ''}</button>
          <div class="gb-goal-body"><strong>${esc(goal.title)}</strong>${goal.notes ? `<p>${esc(goal.notes)}</p>` : ''}${goalStatus(goal)}</div>
          <button type="button" class="icon-btn gb-edit-goal" aria-label="Editar meta">✎</button>
        </article>`).join('')}</div>` : '<div class="empty gb-empty-goals">Nenhuma meta ainda. Adicione algo que vocês querem concluir juntos.</div>';

    panel.querySelectorAll('.gb-goal-item').forEach(item => {
      const goal = goals.find(g => g.id === item.dataset.goalId);
      item.querySelector('.gb-goal-check')?.addEventListener('click', e => toggleGoal(goal, e.currentTarget));
      item.querySelector('.gb-edit-goal')?.addEventListener('click', () => openGoalEditor(goal));
    });
  } catch (err) {
    console.warn('JuHelo goals enhancement', err);
  }
}

function interceptCoreActions() {
  document.addEventListener('click', e => {
    const newGoal = e.target.closest('[data-action="new-goal"]');
    if (newGoal) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openGoalEditor();
      return;
    }
    const newBox = e.target.closest('[data-action="new-box"]');
    if (newBox) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openBoxEditor();
      return;
    }
    const editBox = e.target.closest('.edit-box');
    if (editBox && [...document.querySelectorAll('.section-title h1')].some(h => h.textContent.trim() === 'Caixinhas')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      loadBoxesData().then(({ boxes }) => openBoxEditor(boxes.find(b => b.id === editBox.dataset.id))).catch(console.warn);
    }
  }, true);
}

let observerTimer;
const observer = new MutationObserver(() => {
  clearTimeout(observerTimer);
  observerTimer = setTimeout(() => {
    enhanceBoxes().catch(console.warn);
    renderGoalsChecklist().catch(console.warn);
    enhanceHomeGoalSummary().catch(console.warn);
  }, 40);
});

interceptCoreActions();
observer.observe(document.documentElement, { childList: true, subtree: true });
supabase.auth.onAuthStateChange(() => { householdId = null; });
ensureHousehold().then(() => {
  enhanceBoxes().catch(console.warn);
  renderGoalsChecklist().catch(console.warn);
  enhanceHomeGoalSummary().catch(console.warn);
});
