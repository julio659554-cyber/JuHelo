import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const reportsDb=createClient('https://fjysngoakqbemhjyfima.supabase.co','sb_publishable_dIs-fsCy5wKEdFyDbf7Geg_2kZw_4Cp');
const reportsMoney=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const reportsMonthFmt=new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'});
let reportHousehold=null;
let reportRenderToken=0;

function reportsActive(){return document.querySelector('.bottom-nav .nav-item.active')?.dataset.tab==='reports'}
function isoMonth(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`}
function monthText(iso){const t=reportsMonthFmt.format(new Date(`${iso}T12:00:00`));return t.replace('.','').replace(' de ',' ').replace(/^./,c=>c.toUpperCase())}
function addMonths(iso,delta){const d=new Date(`${iso}T12:00:00`);return isoMonth(new Date(d.getFullYear(),d.getMonth()+delta,1))}
function betweenMonths(start,end){const out=[];let cursor=start;let guard=0;while(cursor<=end&&guard<120){out.push(cursor);cursor=addMonths(cursor,1);guard++}return out}
function rEsc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function ensureReportHousehold(){
  if(reportHousehold) return reportHousehold;
  const {data:{session}}=await reportsDb.auth.getSession();
  if(!session) return null;
  const {data,error}=await reportsDb.from('household_members').select('household_id').eq('user_id',session.user.id).maybeSingle();
  if(error) throw error;
  reportHousehold=data?.household_id||null;
  return reportHousehold;
}

function defaultRange(){
  const now=new Date();
  return {start:`${now.getFullYear()}-01-01`,end:isoMonth(now)};
}
function monthOptions(selected){
  const now=isoMonth(new Date());
  let html='';
  for(let i=-30;i<=12;i++){
    const iso=addMonths(now,i);
    html+=`<option value="${iso}" ${iso===selected?'selected':''}>${rEsc(monthText(iso))}</option>`;
  }
  return html;
}
function periodControl(start,end){
  return `<div class="jh-report-period">
    <span class="jh-report-period-label">Período</span>
    <div class="jh-report-period-fields">
      <label><small>De</small><select class="jh-report-select" data-report-start>${monthOptions(start)}</select></label>
      <span class="jh-report-arrow">→</span>
      <label><small>Até</small><select class="jh-report-select" data-report-end>${monthOptions(end)}</select></label>
    </div>
  </div>`;
}

function chartSvg(rows,months){
  const W=640,H=250,L=38,R=18,T=18,B=42;
  const vals=rows.flatMap(r=>[Number(r.total_income||0),Number(r.total_expense||0)]);
  const max=Math.max(1,...vals);
  const plotW=W-L-R,plotH=H-T-B;
  const x=i=>months.length===1?L+plotW/2:L+(i/(months.length-1))*plotW;
  const y=v=>T+plotH-(Number(v||0)/max)*plotH;
  const incomePoints=rows.map((r,i)=>`${x(i).toFixed(1)},${y(r.total_income).toFixed(1)}`).join(' ');
  const expensePoints=rows.map((r,i)=>`${x(i).toFixed(1)},${y(r.total_expense).toFixed(1)}`).join(' ');
  const guides=[0,.5,1].map(p=>`<line x1="${L}" y1="${(T+plotH*(1-p)).toFixed(1)}" x2="${W-R}" y2="${(T+plotH*(1-p)).toFixed(1)}" class="jh-chart-guide"/>`).join('');
  const labels=months.map((m,i)=>{
    if(months.length>8 && i%2===1 && i!==months.length-1) return '';
    const short=new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m}T12:00:00`)).replace('.','');
    return `<text x="${x(i).toFixed(1)}" y="${H-14}" text-anchor="middle" class="jh-chart-label">${rEsc(short)}</text>`;
  }).join('');
  const dotsIncome=rows.map((r,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(r.total_income).toFixed(1)}" r="3.5" class="jh-chart-dot income"/>`).join('');
  const dotsExpense=rows.map((r,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(r.total_expense).toFixed(1)}" r="3.5" class="jh-chart-dot expense"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de receitas e despesas no período">${guides}<polyline points="${incomePoints}" class="jh-chart-line income"/>${dotsIncome}<polyline points="${expensePoints}" class="jh-chart-line expense"/>${dotsExpense}${labels}</svg>`;
}

async function loadReportRows(start,end){
  const household=await ensureReportHousehold();
  if(!household) return [];
  const {data,error}=await reportsDb.from('monthly_summary').select('month,total_income,total_expense,month_result').eq('household_id',household).gte('month',start).lte('month',end).order('month');
  if(error) throw error;
  return data||[];
}

async function renderReportData(main,start,end){
  const token=++reportRenderToken;
  const mount=main.querySelector('.jh-report-dashboard');
  if(!mount) return;
  mount.classList.add('loading');
  try{
    const raw=await loadReportRows(start,end);
    if(token!==reportRenderToken||!document.body.contains(main)) return;
    const months=betweenMonths(start,end);
    const map=new Map(raw.map(r=>[String(r.month).slice(0,10),r]));
    const rows=months.map(month=>({month,total_income:Number(map.get(month)?.total_income||0),total_expense:Number(map.get(month)?.total_expense||0),month_result:Number(map.get(month)?.month_result||0)}));
    const income=rows.reduce((s,r)=>s+r.total_income,0);
    const expense=rows.reduce((s,r)=>s+r.total_expense,0);
    const result=income-expense;
    mount.innerHTML=`
      <section class="jh-report-balance-card">
        <div class="jh-report-balance-head"><span>Saldo no período</span><strong>${reportsMoney.format(result)}</strong><small>${rEsc(monthText(start))} até ${rEsc(monthText(end))}</small></div>
        <div class="jh-report-mini-grid">
          <article class="income"><span>Receitas</span><strong>${reportsMoney.format(income)}</strong></article>
          <article class="expense"><span>Despesas</span><strong>${reportsMoney.format(expense)}</strong></article>
        </div>
      </section>
      <section class="jh-line-chart-card">
        <div class="jh-chart-head"><div><h2>Receitas x despesas</h2><p>Evolução mês a mês no período escolhido.</p></div><div class="jh-chart-legend"><span class="income">Receitas</span><span class="expense">Despesas</span></div></div>
        <div class="jh-chart-wrap">${chartSvg(rows,months)}</div>
      </section>
      <section class="jh-report-month-list">
        <div class="jh-report-list-head"><h2>Mês a mês</h2><span>${months.length} ${months.length===1?'mês':'meses'}</span></div>
        ${rows.map(r=>`<div class="jh-report-month-row"><strong>${rEsc(monthText(r.month))}</strong><span class="income">${reportsMoney.format(r.total_income)}</span><span class="expense">${reportsMoney.format(r.total_expense)}</span><b>${reportsMoney.format(r.month_result)}</b></div>`).join('')}
      </section>`;
  }catch(error){
    console.warn('JuHelo reports v21',error);
    mount.innerHTML='<div class="panel empty">Não foi possível carregar o relatório agora.</div>';
  }finally{mount.classList.remove('loading')}
}

function mountReports(){
  if(!reportsActive()) return;
  const main=document.querySelector('#app > main.page');
  if(!main||main.dataset.jhReportsMounted==='1') return;
  main.classList.add('jh-reports-v21');
  const section=main.querySelector('.section-title');
  if(!section) return;
  const savedStart=sessionStorage.getItem('jh-report-start');
  const savedEnd=sessionStorage.getItem('jh-report-end');
  const defaults=defaultRange();
  let start=savedStart||defaults.start,end=savedEnd||defaults.end;
  if(start>end){start=end}
  section.innerHTML=periodControl(start,end);
  [...main.children].forEach(child=>{
    if(child===section||child.classList.contains('topbar')) return;
    if(child.classList.contains('bottom-nav')) return;
    if(child.classList.contains('report-kpis')||child.classList.contains('panel')) child.classList.add('jh-report-legacy');
  });
  const dashboard=document.createElement('div');
  dashboard.className='jh-report-dashboard';
  section.after(dashboard);
  const startEl=section.querySelector('[data-report-start]');
  const endEl=section.querySelector('[data-report-end]');
  const update=()=>{
    let s=startEl.value,e=endEl.value;
    if(s>e){if(document.activeElement===startEl){endEl.value=s;e=s}else{startEl.value=e;s=e}}
    sessionStorage.setItem('jh-report-start',s);sessionStorage.setItem('jh-report-end',e);
    renderReportData(main,s,e);
  };
  startEl.addEventListener('change',update);endEl.addEventListener('change',update);
  main.dataset.jhReportsMounted='1';
  renderReportData(main,start,end);
}
let reports21raf=0;
function scheduleReports21(){cancelAnimationFrame(reports21raf);reports21raf=requestAnimationFrame(mountReports)}
new MutationObserver(scheduleReports21).observe(document.body,{childList:true,subtree:true});
reportsDb.auth.onAuthStateChange(()=>{reportHousehold=null});
document.addEventListener('click',()=>setTimeout(scheduleReports21,0),true);
window.addEventListener('load',scheduleReports21);
scheduleReports21();
