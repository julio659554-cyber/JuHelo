import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://fjysngoakqbemhjyfima.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const state = {
  session: null,
  profile: null,
  household: null,
  members: [],
  selectedMonth: firstDayISO(new Date()),
  activeTab: 'home',
  transactions: [],
  recurringPlans: [],
  boxes: [],
  boxBalances: [],
  boxMovements: [],
  goals: [],
  monthlySummary: [],
  loading: true,
};

const icons = { home: '⌂', transactions: '↕', boxes: '▣', reports: '▥', goals: '◎' };

function firstDayISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}
function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}
function money(v) { return brl.format(Number(v || 0)); }
function monthLabel(iso) {
  const text = monthFmt.format(new Date(`${iso}T12:00:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}
function authName() {
  return state.profile?.display_name || state.session?.user?.email?.split('@')[0] || 'JuHelo';
}
function initials(name) {
  return (name || 'JH').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'JH';
}
function pct(v, t) {
  return !t ? 0 : Math.max(0, Math.min(100, Math.round((Number(v) / Number(t)) * 100)));
}
function householdId() { return state.household?.id; }
function boxBalance(boxId) {
  return Number(state.boxBalances.find(x => x.box_id === boxId)?.balance || 0);
}
function currentTransactions(direction) {
  return state.transactions.filter(t => t.month === state.selectedMonth && (!direction || t.direction === direction));
}
function summary() {
  const income = currentTransactions('income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = currentTransactions('expense').reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, result: income - expense };
}
function recurringPlan(tx) {
  return tx?.recurring_plan_id ? state.recurringPlans.find(p => p.id === tx.recurring_plan_id) : null;
}

function render() {
  if (state.loading) return renderSplash();
  if (!state.session) return renderAuth();
  if (!state.household) return renderOnboarding();
  renderApp();
}
function renderSplash() {
  app.innerHTML = `<div class="splash"><div class="brand-mark">♡</div><div class="brand-name"><span>Ju</span>Helo</div><p>finanças do casal</p></div>`;
}
function topbar() {
  return `<header class="topbar">
    <div class="brand-inline">
      <div class="mini-logo">♡</div>
      <div><span style="color:var(--purple)">Ju</span>Helo</div>
    </div>
    <div class="user-chip">
      <span>${esc(authName())}</span>
      <div class="avatar">${esc(initials(authName()))}</div>
    </div>
  </header>`;
}
function nav() {
  return `<nav class="bottom-nav">
    ${[['home','Início'],['transactions','Movimentações'],['boxes','Caixinhas'],['reports','Relatórios'],['goals','Metas']]
      .map(([id,label]) => `<button class="nav-item ${state.activeTab === id ? 'active' : ''}" data-tab="${id}">
        <span class="nav-icon">${icons[id]}</span><span>${label}</span>
      </button>`).join('')}
  </nav>`;
}
function monthSelect() {
  const base = new Date(`${state.selectedMonth}T12:00:00`);
  let out = '';
  for (let i = -18; i <= 18; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const iso = firstDayISO(d);
    out += `<option value="${iso}" ${iso === state.selectedMonth ? 'selected' : ''}>${esc(monthLabel(iso))}</option>`;
  }
  return `<select class="month-select" id="month-select">${out}</select>`;
}

function renderAuth(mode = 'login') {
  const signup = mode === 'signup';
  app.innerHTML = `<main class="page narrow">
    <div class="topbar"><div class="brand-inline"><div class="mini-logo">♡</div><div><span style="color:var(--purple)">Ju</span>Helo</div></div></div>
    <section class="auth-card">
      <h1>${signup ? 'Criar sua conta' : 'Entrar no JuHelo'}</h1>
      <p>${signup ? 'Depois você cria ou entra no espaço financeiro do casal.' : 'Suas finanças do casal em um lugar simples.'}</p>
      <form id="auth-form" class="form-grid">
        ${signup ? '<div class="field"><label>Seu nome</label><input class="input" name="name" required></div>' : ''}
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" required></div>
        <div class="field"><label>Senha</label><input class="input" type="password" name="password" minlength="6" required></div>
        <button class="btn primary block">${signup ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <div class="auth-switch">${signup ? 'Já tem uma conta?' : 'Ainda não tem conta?'} <button class="link-btn" id="switch-auth">${signup ? 'Entrar' : 'Criar conta'}</button></div>
    </section>
  </main>`;
  document.querySelector('#switch-auth').onclick = () => renderAuth(signup ? 'login' : 'signup');
  document.querySelector('#auth-form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      if (signup) {
        const { error } = await supabase.auth.signUp({
          email: fd.get('email').trim(),
          password: fd.get('password'),
          options: { data: { display_name: fd.get('name').trim() } }
        });
        if (error) throw error;
        toast('Conta criada. Confira o e-mail se a confirmação estiver ativa.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: fd.get('email').trim(),
          password: fd.get('password')
        });
        if (error) throw error;
      }
    } catch (err) {
      toast(err.message || 'Falha na autenticação.', 'error');
    }
  };
}

function renderOnboarding() {
  app.innerHTML = `<main class="page narrow">${topbar()}
    <section class="auth-card">
      <div class="brand-mark" style="width:58px;height:58px;font-size:36px;margin:0 0 18px">♡</div>
      <h1>Nosso dinheiro</h1>
      <p>Crie o JuHelo de vocês ou entre usando o código de convite do parceiro.</p>
      <div class="form-grid">
        <button class="btn primary" id="create-household">Criar nosso JuHelo</button>
        <div class="separator"><span></span>ou<span></span></div>
        <div class="field"><label>Código do parceiro</label><input id="invite-code" class="input" placeholder="Ex.: A1B2C3D4"></div>
        <button class="btn soft" id="join-household">Entrar com código</button>
        <button class="btn ghost" id="logout-onboarding">Sair</button>
      </div>
    </section>
  </main>`;
  document.querySelector('#create-household').onclick = async () => {
    const { error } = await supabase.rpc('create_household', { p_name: 'JuHelo' });
    if (error) return toast(error.message, 'error');
    await loadAll();
    toast('JuHelo criado 💜');
  };
  document.querySelector('#join-household').onclick = async () => {
    const code = document.querySelector('#invite-code').value.trim();
    if (!code) return toast('Digite o código.', 'error');
    const { error } = await supabase.rpc('join_household', { p_invite_code: code });
    if (error) return toast(error.message, 'error');
    await loadAll();
    toast('Você entrou no JuHelo 💜');
  };
  document.querySelector('#logout-onboarding').onclick = () => supabase.auth.signOut();
}

function transactionRow(tx) {
  const recurring = tx.kind === 'recurring';
  const box = tx.kind === 'box_contribution';
  return `<div class="row">
    <div class="row-icon">${tx.direction === 'income' ? '↗' : box ? '▣' : recurring ? '↻' : '↘'}</div>
    <div class="row-main">
      <div class="row-title">${esc(tx.description)}</div>
      <div class="row-sub">${box ? 'Caixinha' : recurring ? 'Gasto fixo' : tx.direction === 'income' ? 'Receita' : 'Despesa'}</div>
    </div>
    <div class="row-value">${money(tx.amount)}</div>
    <button class="icon-btn edit-tx" data-id="${tx.id}" aria-label="Editar">✎</button>
  </div>`;
}
function list(items) {
  return items.length ? `<div class="list">${items.map(transactionRow).join('')}</div>` : '<div class="empty">Nenhum lançamento neste mês.</div>';
}

function home() {
  const s = summary();
  const boxesTotal = state.boxBalances.reduce((sum, x) => sum + Number(x.balance || 0), 0);
  const completed = state.goals.filter(g => g.is_completed).length;
  return `<section class="hero">
    <div class="hero-row">
      <div>
        <div class="eyebrow">Saldo do mês</div>
        <div class="balance">${money(s.result)}</div>
        <div class="eyebrow">Receitas menos despesas</div>
      </div>
      ${monthSelect()}
    </div>
  </section>

  <div class="kpi-grid">
    <div class="kpi income"><div class="label">Receitas</div><div class="value">${money(s.income)}</div></div>
    <div class="kpi expense"><div class="label">Despesas</div><div class="value">${money(s.expense)}</div></div>
    <div class="kpi"><div class="label">Resultado do mês</div><div class="value">${money(s.result)}</div></div>
  </div>

  <div class="quick-actions">
    <button class="quick expense" data-action="new-expense">＋<small>Despesa</small></button>
    <button class="quick income" data-action="new-income">＋<small>Receita</small></button>
    <button class="quick box" data-action="box-add">＋<small>Caixinha</small></button>
    <button class="quick goal" data-action="new-goal">＋<small>Meta</small></button>
  </div>

  <div class="overview-strip">
    <button class="mini-summary" data-tab="boxes"><span>Caixinhas</span><strong>${money(boxesTotal)}</strong></button>
    <button class="mini-summary" data-tab="goals"><span>Metas</span><strong>${completed}/${state.goals.length}</strong></button>
    <button class="mini-summary" data-action="household-info"><span>Casal</span><strong>${state.members.length}/2</strong></button>
  </div>

  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Despesas</h2><button class="link-btn" data-tab="transactions">Ver todas</button></div>
      ${list(currentTransactions('expense').slice(0, 6))}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Receitas</h2><button class="link-btn" data-tab="transactions">Ver todas</button></div>
      ${list(currentTransactions('income').slice(0, 6))}
    </section>
  </div>`;
}

function transactions() {
  const s = summary();
  return `<div class="section-title">
    <div><h1>Movimentações</h1><p>${esc(monthLabel(state.selectedMonth))}</p></div>
    ${monthSelect()}
  </div>
  <div class="quick-actions">
    <button class="quick expense" data-action="new-expense">＋<small>Despesa</small></button>
    <button class="quick income" data-action="new-income">＋<small>Receita</small></button>
    <button class="quick box" data-action="box-add">＋<small>Caixinha</small></button>
    <button class="quick goal" data-action="new-recurring">↻<small>Gasto fixo</small></button>
  </div>
  <div class="kpi-grid">
    <div class="kpi income"><div class="label">Receitas</div><div class="value">${money(s.income)}</div></div>
    <div class="kpi expense"><div class="label">Despesas</div><div class="value">${money(s.expense)}</div></div>
    <div class="kpi"><div class="label">Saldo</div><div class="value">${money(s.result)}</div></div>
  </div>
  <section class="panel">${list(currentTransactions())}</section>`;
}

function boxes() {
  return `<div class="section-title">
    <div><h1>Caixinhas</h1><p>Dinheiro separado para os planos de vocês.</p></div>
    <button class="btn soft" data-action="new-box">＋ Nova caixinha</button>
  </div>
  <div class="card-grid">
    ${state.boxes.length ? state.boxes.map(b => {
      const balance = boxBalance(b.id);
      const p = pct(balance, b.target_amount);
      const recent = state.boxMovements.filter(m => m.box_id === b.id).slice(0, 2);
      return `<article class="box-card">
        <div class="box-top">
          <div>
            <div class="box-name">${esc(b.name)}</div>
            <span class="pill">${b.target_amount ? `Meta ${money(b.target_amount)}` : 'Sem meta definida'}</span>
          </div>
          <button class="icon-btn edit-box" data-id="${b.id}" aria-label="Editar caixinha">✎</button>
        </div>
        <div class="box-balance">${money(balance)}</div>
        <div class="row-sub">Saldo atual</div>
        ${b.target_amount ? `<div class="progress"><span style="width:${p}%"></span></div><div class="row-sub progress-copy">${p}% da meta</div>` : ''}
        ${recent.length ? `<div class="box-preview">${recent.map(m => `<div><span>${esc(m.description || (m.movement_type === 'withdrawal' ? 'Retirada' : 'Depósito'))}</span><strong class="${m.movement_type === 'withdrawal' ? 'negative' : 'positive'}">${m.movement_type === 'withdrawal' ? '−' : '+'}${money(m.amount)}</strong></div>`).join('')}</div>` : ''}
        <div class="actions-inline">
          <button class="btn soft add-box" data-id="${b.id}">Adicionar</button>
          <button class="btn ghost withdraw-box" data-id="${b.id}">Retirar</button>
          <button class="btn ghost history-box" data-id="${b.id}">Histórico</button>
        </div>
      </article>`;
    }).join('') : '<div class="panel empty">Crie a primeira caixinha de vocês.</div>'}
  </div>`;
}

function goals() {
  const balances = new Map(state.boxBalances.map(x => [x.box_id, Number(x.balance || 0)]));
  return `<div class="section-title">
    <div><h1>Metas</h1><p>Um checklist para os planos do casal.</p></div>
    <button class="btn soft" data-action="new-goal">＋ Nova meta</button>
  </div>
  <section class="panel">
    ${state.goals.length ? state.goals.map(g => {
      const linkedBalance = g.box_id ? balances.get(g.box_id) || 0 : 0;
      const progress = g.target_amount ? pct(linkedBalance, g.target_amount) : null;
      return `<div class="goal-row">
        <button class="check ${g.is_completed ? 'done' : ''}" data-goal="${g.id}">${g.is_completed ? '✓' : ''}</button>
        <div class="goal-content">
          <div class="row-title">${esc(g.title)}</div>
          <div class="row-sub">${g.target_amount ? `Meta financeira: ${money(g.target_amount)}${g.box_id ? ` · Guardado ${money(linkedBalance)}` : ''}` : g.notes ? esc(g.notes) : 'Checklist do casal'}</div>
          ${progress !== null ? `<div class="progress compact"><span style="width:${progress}%"></span></div>` : ''}
        </div>
        <button class="icon-btn edit-goal" data-id="${g.id}">✎</button>
      </div>`;
    }).join('') : '<div class="empty">Nenhuma meta criada ainda.</div>'}
  </section>`;
}

function reports() {
  const year = Number(state.selectedMonth.slice(0, 4));
  const rows = state.monthlySummary.filter(x => Number(String(x.month).slice(0, 4)) === year);
  const income = rows.reduce((s, x) => s + Number(x.total_income), 0);
  const expense = rows.reduce((s, x) => s + Number(x.total_expense), 0);
  const boxSaved = state.transactions
    .filter(t => Number(String(t.month).slice(0, 4)) === year && t.kind === 'box_contribution')
    .reduce((s, t) => s + Number(t.amount), 0);
  const max = Math.max(1, ...rows.flatMap(x => [Number(x.total_income), Number(x.total_expense)]));
  const bars = Array.from({ length: 12 }, (_, i) => {
    const iso = `${year}-${String(i + 1).padStart(2, '0')}-01`;
    const r = rows.find(x => x.month === iso) || { total_income: 0, total_expense: 0 };
    return `<div class="chart-col">
      <div class="bar income" style="height:${Math.round(Number(r.total_income) / max * 100)}%"></div>
      <div class="bar expense" style="height:${Math.round(Number(r.total_expense) / max * 100)}%"></div>
      <span class="chart-label">${String(i + 1).padStart(2, '0')}</span>
    </div>`;
  }).join('');
  return `<div class="section-title">
    <div><h1>Relatórios</h1><p>Visão anual do dinheiro de vocês.</p></div>
    <div class="year-switch"><button data-year="-1">‹</button><strong>${year}</strong><button data-year="1">›</button></div>
  </div>
  <div class="kpi-grid report-kpis">
    <div class="kpi income"><div class="label">Receitas no ano</div><div class="value">${money(income)}</div></div>
    <div class="kpi expense"><div class="label">Despesas no ano</div><div class="value">${money(expense)}</div></div>
    <div class="kpi"><div class="label">Saldo acumulado</div><div class="value">${money(income - expense)}</div></div>
    <div class="kpi purple"><div class="label">Guardado em caixinhas</div><div class="value">${money(boxSaved)}</div></div>
  </div>
  <section class="panel">
    <div class="panel-head"><div><h2>Receita x despesa</h2><div class="row-sub">Verde = receita · Rosa = despesa</div></div></div>
    <div class="chart">${bars}</div>
  </section>
  <section class="panel report-table">
    <div class="panel-head"><h2>Mês a mês</h2></div>
    ${Array.from({length:12}, (_, i) => {
      const iso = `${year}-${String(i + 1).padStart(2, '0')}-01`;
      const r = rows.find(x => x.month === iso) || { total_income: 0, total_expense: 0, month_result: 0 };
      return `<div class="report-row"><span>${esc(monthLabel(iso).replace(` de ${year}`, ''))}</span><span class="positive">${money(r.total_income)}</span><span class="negative">${money(r.total_expense)}</span><strong>${money(r.month_result)}</strong></div>`;
    }).join('')}
  </section>`;
}

function renderApp() {
  const content = state.activeTab === 'home' ? home()
    : state.activeTab === 'transactions' ? transactions()
    : state.activeTab === 'boxes' ? boxes()
    : state.activeTab === 'reports' ? reports()
    : goals();
  app.innerHTML = `<main class="page">${topbar()}${content}</main>${nav()}`;
  bind();
}

function modal(title, body, onMount) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="modal-card"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close>×</button></div>${body}</section>`;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]').onclick = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
  onMount?.(wrap);
}

function bind() {
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.onclick = () => { state.activeTab = el.dataset.tab; render(); };
  });

  const month = document.querySelector('#month-select');
  if (month) month.onchange = async () => {
    state.selectedMonth = month.value;
    await ensureRecurring();
    await refresh();
    render();
  };

  document.querySelectorAll('[data-action="new-expense"]').forEach(el => el.onclick = () => openTx(null, 'expense'));
  document.querySelectorAll('[data-action="new-income"]').forEach(el => el.onclick = () => openTx(null, 'income'));
  document.querySelectorAll('[data-action="new-box"]').forEach(el => el.onclick = () => openBox());
  document.querySelectorAll('[data-action="box-add"]').forEach(el => el.onclick = () => openBoxAdd());
  document.querySelectorAll('[data-action="new-goal"]').forEach(el => el.onclick = () => openGoal());
  document.querySelectorAll('[data-action="new-recurring"]').forEach(el => el.onclick = openRecurring);
  document.querySelectorAll('[data-action="household-info"]').forEach(el => el.onclick = openHouseholdInfo);

  document.querySelectorAll('.edit-tx').forEach(el => {
    el.onclick = () => {
      const tx = state.transactions.find(t => t.id === el.dataset.id);
      if (tx?.kind === 'recurring') openRecurringEdit(tx);
      else openTx(tx);
    };
  });
  document.querySelectorAll('.add-box').forEach(el => el.onclick = () => openBoxAdd(el.dataset.id));
  document.querySelectorAll('.withdraw-box').forEach(el => el.onclick = () => openWithdraw(el.dataset.id));
  document.querySelectorAll('.history-box').forEach(el => el.onclick = () => openBoxHistory(el.dataset.id));
  document.querySelectorAll('.edit-box').forEach(el => el.onclick = () => openBox(state.boxes.find(b => b.id === el.dataset.id)));

  document.querySelectorAll('[data-goal]').forEach(el => el.onclick = async () => {
    const g = state.goals.find(x => x.id === el.dataset.goal);
    const { error } = await supabase.from('goals')
      .update({ is_completed: !g.is_completed, completed_at: !g.is_completed ? new Date().toISOString() : null })
      .eq('id', g.id);
    if (error) return toast(error.message, 'error');
    await loadGoals();
    render();
  });
  document.querySelectorAll('.edit-goal').forEach(el => el.onclick = () => openGoal(state.goals.find(g => g.id === el.dataset.id)));

  document.querySelectorAll('[data-year]').forEach(el => el.onclick = async () => {
    const d = new Date(`${state.selectedMonth}T12:00:00`);
    d.setFullYear(d.getFullYear() + Number(el.dataset.year));
    state.selectedMonth = firstDayISO(d);
    await refresh();
    render();
  });
}

function openTx(tx = null, preset = 'expense') {
  let dir = tx?.direction || preset;
  modal(tx ? 'Editar lançamento' : dir === 'income' ? 'Nova receita' : 'Nova despesa',
    `<form id="f" class="form-grid">
      <div class="segmented">
        <button type="button" data-dir="expense" class="${dir === 'expense' ? 'active' : ''}">Despesa</button>
        <button type="button" data-dir="income" class="${dir === 'income' ? 'active' : ''}">Receita</button>
      </div>
      <div class="field"><label>Descrição</label><input class="input" name="description" value="${esc(tx?.description || '')}" required></div>
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" step="0.01" min="0.01" value="${tx?.amount || ''}" required></div>
      <div class="field"><label>Mês</label><input class="input" name="month" type="month" value="${(tx?.month || state.selectedMonth).slice(0,7)}" required></div>
      ${tx ? '<button class="btn red" type="button" id="del">Excluir lançamento</button>' : ''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`,
    w => {
      w.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => {
        dir = b.dataset.dir;
        w.querySelectorAll('[data-dir]').forEach(x => x.classList.toggle('active', x === b));
      });
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      if (tx) w.querySelector('#del').onclick = async () => {
        if (!confirm('Excluir este lançamento?')) return;
        const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
      };
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          household_id: householdId(),
          direction: dir,
          kind: tx?.kind || 'regular',
          description: fd.get('description').trim(),
          amount: Number(fd.get('amount')),
          month: `${fd.get('month')}-01`,
          updated_by: state.session.user.id
        };
        let error;
        if (tx) ({ error } = await supabase.from('transactions').update(payload).eq('id', tx.id));
        else ({ error } = await supabase.from('transactions').insert({ ...payload, created_by: state.session.user.id }));
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
      };
    });
}

function openRecurringEdit(tx) {
  const plan = recurringPlan(tx);
  modal('Editar gasto fixo',
    `<form id="f" class="form-grid">
      <div class="field"><label>Descrição</label><input class="input" name="description" value="${esc(tx.description)}" required></div>
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" step="0.01" min="0.01" value="${tx.amount}" required></div>
      <div class="field">
        <label>Aplicar alteração</label>
        <select class="input" name="scope">
          <option value="this_month">Somente ${esc(monthLabel(tx.month))}</option>
          <option value="future">Deste mês em diante</option>
          <option value="all">Todos os meses da série</option>
        </select>
      </div>
      <div class="recurring-note">Série atual: ${plan ? `${esc(monthLabel(plan.start_month))}${plan.end_month ? ` até ${esc(monthLabel(plan.end_month))}` : ' · sem data final'}` : 'gasto fixo'}</div>
      <button class="btn red" type="button" id="del">Excluir gasto fixo</button>
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const { error } = await supabase.rpc('edit_recurring_expense', {
          p_transaction_id: tx.id,
          p_scope: fd.get('scope'),
          p_description: fd.get('description').trim(),
          p_amount: Number(fd.get('amount'))
        });
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
        toast('Gasto fixo atualizado.');
      };
      w.querySelector('#del').onclick = () => openRecurringDelete(tx, w);
    });
}

function openRecurringDelete(tx, previousModal) {
  previousModal?.remove();
  modal('Excluir gasto fixo',
    `<div class="form-grid">
      <p class="modal-copy">Como você quer excluir <strong>${esc(tx.description)}</strong>?</p>
      <button class="scope-card" data-scope="this_month"><strong>Só este mês</strong><span>Os próximos meses continuam normalmente.</span></button>
      <button class="scope-card" data-scope="future"><strong>Deste mês em diante</strong><span>Mantém apenas os meses anteriores.</span></button>
      <button class="scope-card danger" data-scope="all"><strong>Toda a série</strong><span>Remove todos os meses desse gasto fixo.</span></button>
    </div>`,
    w => {
      w.querySelectorAll('[data-scope]').forEach(btn => btn.onclick = async () => {
        const scope = btn.dataset.scope;
        if (scope === 'all' && !confirm('Excluir toda a série deste gasto fixo?')) return;
        const { error } = await supabase.rpc('delete_recurring_expense', {
          p_transaction_id: tx.id,
          p_scope: scope
        });
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
        toast('Gasto fixo atualizado.');
      });
    });
}

function openBox(box = null) {
  modal(box ? 'Editar caixinha' : 'Nova caixinha',
    `<form id="f" class="form-grid">
      <div class="field"><label>Nome</label><input class="input" name="name" value="${esc(box?.name || '')}" required></div>
      <div class="field"><label>Meta de valor (opcional)</label><input class="input" name="target" type="number" step="0.01" min="0.01" value="${box?.target_amount || ''}"></div>
      ${box ? '<button class="btn ghost" type="button" id="archive">Arquivar caixinha</button>' : ''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">${box ? 'Salvar' : 'Criar'}</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      if (box) w.querySelector('#archive').onclick = async () => {
        if (boxBalance(box.id) !== 0) return toast('Zere o saldo antes de arquivar.', 'error');
        const { error } = await supabase.from('boxes').update({ is_archived: true }).eq('id', box.id);
        if (error) return toast(error.message, 'error');
        w.remove();
        await loadBoxes();
        render();
      };
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const target = fd.get('target');
        const payload = { name: fd.get('name').trim(), target_amount: target ? Number(target) : null };
        let error;
        if (box) ({ error } = await supabase.from('boxes').update(payload).eq('id', box.id));
        else ({ error } = await supabase.from('boxes').insert({
          household_id: householdId(), ...payload, created_by: state.session.user.id
        }));
        if (error) return toast(error.message, 'error');
        w.remove();
        await loadBoxes();
        render();
      };
    });
}

function openBoxAdd(boxId = '') {
  if (!state.boxes.length) return toast('Crie uma caixinha primeiro.', 'error');
  modal('Adicionar à caixinha',
    `<form id="f" class="form-grid">
      <div class="field"><label>Caixinha</label><select class="input" name="box">${state.boxes.map(b => `<option value="${b.id}" ${b.id === boxId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label>Mês</label><input class="input" name="month" type="month" value="${state.selectedMonth.slice(0,7)}" required></div>
      <div class="field"><label>Descrição (opcional)</label><input class="input" name="description" placeholder="Ex.: Reserva do mês"></div>
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Adicionar</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const { error } = await supabase.rpc('add_box_contribution', {
          p_box_id: fd.get('box'),
          p_amount: Number(fd.get('amount')),
          p_month: `${fd.get('month')}-01`,
          p_description: fd.get('description').trim() || null
        });
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
        toast('Valor guardado na caixinha.');
      };
    });
}

function openWithdraw(boxId) {
  const box = state.boxes.find(b => b.id === boxId);
  modal('Retirar da caixinha',
    `<form id="f" class="form-grid">
      <div class="recurring-note">Saldo disponível em ${esc(box?.name || 'caixinha')}: <strong>${money(boxBalance(boxId))}</strong></div>
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label>Mês</label><input class="input" name="month" type="month" value="${state.selectedMonth.slice(0,7)}" required></div>
      <div class="field"><label>Descrição (opcional)</label><input class="input" name="description"></div>
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Retirar</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const { error } = await supabase.rpc('withdraw_from_box', {
          p_box_id: boxId,
          p_amount: Number(fd.get('amount')),
          p_month: `${fd.get('month')}-01`,
          p_description: fd.get('description').trim() || null
        });
        if (error) return toast(error.message, 'error');
        w.remove();
        await loadBoxes();
        await loadBoxMovements();
        render();
        toast('Retirada registrada.');
      };
    });
}

function openBoxHistory(boxId) {
  const box = state.boxes.find(b => b.id === boxId);
  const moves = state.boxMovements.filter(m => m.box_id === boxId);
  modal(`Histórico · ${box?.name || 'Caixinha'}`,
    `<div class="history-list">
      <div class="history-balance"><span>Saldo atual</span><strong>${money(boxBalance(boxId))}</strong></div>
      ${moves.length ? moves.map(m => `<div class="history-row">
        <div><strong>${esc(m.description || (m.movement_type === 'withdrawal' ? 'Retirada' : 'Depósito'))}</strong><span>${esc(monthLabel(m.month))}</span></div>
        <strong class="${m.movement_type === 'withdrawal' ? 'negative' : 'positive'}">${m.movement_type === 'withdrawal' ? '−' : '+'}${money(m.amount)}</strong>
      </div>`).join('') : '<div class="empty">Nenhuma movimentação nessa caixinha.</div>'}
    </div>`);
}

function openGoal(goal = null) {
  modal(goal ? 'Editar meta' : 'Nova meta',
    `<form id="f" class="form-grid">
      <div class="field"><label>Meta</label><input class="input" name="title" value="${esc(goal?.title || '')}" required></div>
      <div class="field"><label>Observação</label><input class="input" name="notes" value="${esc(goal?.notes || '')}"></div>
      <div class="field"><label>Caixinha vinculada</label><select class="input" name="box"><option value="">Nenhuma</option>${state.boxes.map(b => `<option value="${b.id}" ${goal?.box_id === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Valor alvo</label><input class="input" name="target" type="number" step="0.01" min="0.01" value="${goal?.target_amount || ''}"></div>
      ${goal ? '<button class="btn red" type="button" id="del">Excluir meta</button>' : ''}
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      if (goal) w.querySelector('#del').onclick = async () => {
        if (!confirm('Excluir esta meta?')) return;
        const { error } = await supabase.from('goals').delete().eq('id', goal.id);
        if (error) return toast(error.message, 'error');
        w.remove();
        await loadGoals();
        render();
      };
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          household_id: householdId(),
          title: fd.get('title').trim(),
          notes: fd.get('notes').trim() || null,
          box_id: fd.get('box') || null,
          target_amount: fd.get('target') ? Number(fd.get('target')) : null
        };
        let error;
        if (goal) ({ error } = await supabase.from('goals').update(payload).eq('id', goal.id));
        else ({ error } = await supabase.from('goals').insert({ ...payload, created_by: state.session.user.id }));
        if (error) return toast(error.message, 'error');
        w.remove();
        await loadGoals();
        render();
      };
    });
}

function openRecurring() {
  modal('Novo gasto fixo',
    `<form id="f" class="form-grid">
      <div class="field"><label>Descrição</label><input class="input" name="description" required></div>
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
      <div class="field"><label>Começa em</label><input class="input" name="start" type="month" value="${state.selectedMonth.slice(0,7)}" required></div>
      <div class="field"><label>Vai até (opcional)</label><input class="input" name="end" type="month"><div class="row-sub">Vazio = sem data final.</div></div>
      <div class="modal-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary">Criar gasto fixo</button></div>
    </form>`,
    w => {
      w.querySelector('[data-cancel]').onclick = () => w.remove();
      w.querySelector('#f').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const end = fd.get('end');
        if (end && `${end}-01` < `${fd.get('start')}-01`) return toast('O mês final não pode ser anterior ao inicial.', 'error');
        const { error } = await supabase.rpc('create_recurring_expense', {
          p_household_id: householdId(),
          p_description: fd.get('description').trim(),
          p_amount: Number(fd.get('amount')),
          p_start_month: `${fd.get('start')}-01`,
          p_end_month: end ? `${end}-01` : null
        });
        if (error) return toast(error.message, 'error');
        w.remove();
        await refresh();
        render();
        toast('Gasto fixo criado.');
      };
    });
}

function openHouseholdInfo() {
  modal('Nosso JuHelo',
    `<div class="form-grid">
      <div class="invite-card"><span>Código para a segunda pessoa</span><strong>${esc(state.household.invite_code)}</strong><button class="btn soft" id="copy-code">Copiar código</button></div>
      <div class="members-list">
        ${state.members.map(m => `<div class="member-row"><div class="avatar">${esc(initials(m.profile?.display_name || 'JH'))}</div><div><strong>${esc(m.profile?.display_name || 'Pessoa')}</strong><span>${m.role === 'owner' ? 'Criou o JuHelo' : 'Participante'}</span></div></div>`).join('')}
      </div>
      <button class="btn ghost" id="logout">Sair da conta</button>
    </div>`,
    w => {
      w.querySelector('#copy-code').onclick = async () => {
        try {
          await navigator.clipboard.writeText(state.household.invite_code);
          toast('Código copiado.');
        } catch {
          toast(`Código: ${state.household.invite_code}`);
        }
      };
      w.querySelector('#logout').onclick = async () => {
        await supabase.auth.signOut();
        w.remove();
      };
    });
}

async function loadProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  if (error) throw error;
  state.profile = data;
}
async function loadHousehold() {
  const { data: member, error } = await supabase.from('household_members')
    .select('household_id').eq('user_id', state.session.user.id).maybeSingle();
  if (error) throw error;
  if (!member) { state.household = null; state.members = []; return; }

  const { data, error: h } = await supabase.from('households').select('*').eq('id', member.household_id).single();
  if (h) throw h;
  state.household = data;

  const { data: members, error: me } = await supabase.from('household_members')
    .select('user_id,role,joined_at').eq('household_id', member.household_id).order('joined_at');
  if (me) throw me;

  const ids = (members || []).map(m => m.user_id);
  let profiles = [];
  if (ids.length) {
    const { data: p, error: pe } = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', ids);
    if (pe) throw pe;
    profiles = p || [];
  }
  state.members = (members || []).map(m => ({ ...m, profile: profiles.find(p => p.id === m.user_id) || null }));
}
async function loadTransactions() {
  if (!state.household) return;
  const year = Number(state.selectedMonth.slice(0, 4));
  const { data, error } = await supabase.from('transactions').select('*')
    .eq('household_id', householdId())
    .gte('month', `${year - 1}-01-01`).lte('month', `${year + 1}-12-01`)
    .order('month', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  state.transactions = data || [];
}
async function loadRecurringPlans() {
  if (!state.household) return;
  const { data, error } = await supabase.from('recurring_plans').select('*')
    .eq('household_id', householdId()).order('start_month', { ascending: false });
  if (error) throw error;
  state.recurringPlans = data || [];
}
async function loadBoxes() {
  if (!state.household) return;
  const [{ data: boxes, error: e1 }, { data: balances, error: e2 }] = await Promise.all([
    supabase.from('boxes').select('*').eq('household_id', householdId()).eq('is_archived', false).order('created_at'),
    supabase.from('box_balances').select('*').eq('household_id', householdId())
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  state.boxes = boxes || [];
  state.boxBalances = balances || [];
}
async function loadBoxMovements() {
  if (!state.household) return;
  const { data, error } = await supabase.from('box_movements').select('*')
    .eq('household_id', householdId()).order('month', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  state.boxMovements = data || [];
}
async function loadGoals() {
  if (!state.household) return;
  const { data, error } = await supabase.from('goals').select('*')
    .eq('household_id', householdId()).order('sort_order').order('created_at');
  if (error) throw error;
  state.goals = data || [];
}
async function loadSummary() {
  if (!state.household) return;
  const { data, error } = await supabase.from('monthly_summary').select('*')
    .eq('household_id', householdId()).order('month');
  if (error) throw error;
  state.monthlySummary = data || [];
}
async function ensureRecurring() {
  if (!state.household) return;
  const { error } = await supabase.rpc('ensure_recurring_for_month', {
    p_household_id: householdId(),
    p_month: state.selectedMonth
  });
  if (error) console.warn('ensure_recurring_for_month', error);
}
async function refresh() {
  await Promise.all([
    loadTransactions(), loadRecurringPlans(), loadBoxes(), loadBoxMovements(), loadGoals(), loadSummary()
  ]);
}
async function loadAll() {
  state.loading = true;
  render();
  try {
    await loadProfile();
    await loadHousehold();
    if (state.household) {
      await ensureRecurring();
      await refresh();
    }
  } catch (err) {
    console.error(err);
    toast(err.message || 'Falha ao carregar dados.', 'error');
  } finally {
    state.loading = false;
    render();
  }
}
async function init() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
  const { data: { session } } = await supabase.auth.getSession();
  state.session = session;
  supabase.auth.onAuthStateChange(async (_event, s) => {
    state.session = s;
    if (s) await loadAll();
    else {
      state.profile = null;
      state.household = null;
      state.members = [];
      state.loading = false;
      render();
    }
  });
  if (session) await loadAll();
  else { state.loading = false; render(); }
}
init();
