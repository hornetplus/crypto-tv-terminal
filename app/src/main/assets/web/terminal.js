/* =========================================================
   Crypto TV Terminal — runtime / animation layer
   Modules (per spec §4.2): clock, watchlist+rotation, hero,
   news, whale ticker, indicators, visual signals.
   Vanilla JS, GPU-friendly, local updates only (§9.3).
   ========================================================= */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

/* ---------- stage scaling (1920×1080 → viewport) -------- */
function fitStage() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  $('#stage').style.transform = `scale(${s})`;
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
window.addEventListener('load', fitStage);
document.addEventListener('visibilitychange', () => { if (!document.hidden) fitStage(); });
fitStage();

/* ---------- formatters ---------------------------------- */
function fmtPrice(v) {
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)    return '$' + v.toFixed(2);
  return '$' + v.toFixed(4);
}
function fmtPct(v) { return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
const dirClass = (v) => (v >= 0 ? 'up' : 'down');

function coinIcon(state, cls = '') {
  return `<span class="coin-ic ${cls}" style="background:var(--c-${state.color})">${state.glyph}</span>`;
}

/* ---------- sparkline path builder ---------------------- */
function sparkGeo(vals, w, h, pad = 3) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (vals.length - 1);
  const pts = vals.map((v, i) => [
    pad + i * stepX,
    pad + (h - pad * 2) * (1 - (v - min) / span),
  ]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${(w - pad).toFixed(1)} ${h} L${pad} ${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

function miniSpark(vals, up) {
  const w = 92, h = 40;
  const g = sparkGeo(vals, w, h);
  const col = up ? 'var(--up)' : 'var(--down)';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${g.line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

/* =========================================================
   1. SYSTEM CLOCK (§6.2, §3.3) — real local device time
   ========================================================= */
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DOW = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  $('#clock-hms').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  $('#clock-date').innerHTML = `<b>${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</b> · ${DOW[d.getDay()]}`;
}
tickClock();
setInterval(tickClock, 1000);

/* =========================================================
   2. WATCHLIST + ROTATION (§10)
   ========================================================= */
let rotIndex = 0;
function currentWindow() {
  const pool = WATCHLIST_CFG.rotatingPool;
  const n = WATCHLIST_CFG.windowSize;
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(rotIndex * n + i) % pool.length]);
  return out;
}
function rowHtml(sym) {
  const a = ASSET_STATE[sym];
  const up = a.change24hPct >= 0;
  return `<div class="wl-row" data-sym="${sym}">
    ${coinIcon(a)}
    <div class="wl-name"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
    <div class="wl-price">
      <div class="p num">${fmtPrice(a.priceUsd)}</div>
      <div class="chg num ${dirClass(a.change24hPct)}">${fmtPct(a.change24hPct)}</div>
    </div>
    ${miniSpark(a.sparkline, up)}
  </div>`;
}
function renderWatchlist() {
  const syms = [...WATCHLIST_CFG.fixedAssets, ...currentWindow()];
  $('#wl-rows').innerHTML = syms.map(rowHtml).join('');
}
function rotateWatchlist() {
  const total = Math.ceil(WATCHLIST_CFG.rotatingPool.length / WATCHLIST_CFG.windowSize);
  rotIndex = (rotIndex + 1) % total;
  // fade the rotating rows only
  const rows = $$('#wl-rows .wl-row');
  rows.slice(WATCHLIST_CFG.fixedAssets.length).forEach((r) => {
    r.style.transition = 'opacity .35s var(--ease)';
    r.style.opacity = '0';
  });
  setTimeout(renderWatchlist, 360);
}
renderWatchlist();
setInterval(rotateWatchlist, WATCHLIST_CFG.rotationIntervalSec * 1000);

/* =========================================================
   3. PRICE ENGINE + visual pulse (§10.3, §15)
   ========================================================= */
function nudgeAsset(sym) {
  const a = ASSET_STATE[sym];
  const prev = a.priceUsd;
  const drift = (Math.random() - 0.48) * a.priceUsd * 0.0016;
  a.priceUsd = Math.max(a.priceUsd + drift, a.priceUsd * 0.5);
  a.change24hPct += (a.priceUsd - prev) / prev * 100;
  a.sparkline = [...a.sparkline.slice(1), a.priceUsd];
  return a.priceUsd >= prev ? 'up' : 'down';
}
function flashRow(sym, dir) {
  const row = $(`#wl-rows .wl-row[data-sym="${sym}"]`);
  if (!row) return;
  const a = ASSET_STATE[sym];
  const up = a.change24hPct >= 0;
  row.querySelector('.p').textContent = fmtPrice(a.priceUsd);
  const chg = row.querySelector('.chg');
  chg.textContent = fmtPct(a.change24hPct);
  chg.className = 'chg num ' + dirClass(a.change24hPct);
  row.querySelector('.spark').outerHTML = miniSpark(a.sparkline, up);
  row.classList.remove('flash-up', 'flash-down');
  void row.offsetWidth;
  row.classList.add(dir === 'up' ? 'flash-up' : 'flash-down');
  setTimeout(() => row.classList.remove('flash-up', 'flash-down'), 800);
}
function priceTick() {
  const visible = $$('#wl-rows .wl-row').map((r) => r.dataset.sym);
  const k = rndi(1, 2);
  const shuffled = [...visible].sort(() => Math.random() - 0.5).slice(0, k);
  shuffled.forEach((sym) => flashRow(sym, nudgeAsset(sym)));
}
setInterval(priceTick, 2400);

/* =========================================================
   4. HERO CARDS (§11)
   ========================================================= */
function heroChart(h) {
  const up = h.change24hPct >= 0;
  const g = sparkGeo(h.sparkline, 600, 200, 6);
  const col = up ? 'var(--up)' : 'var(--down)';
  const gid = 'g_' + h.symbol;
  return `<svg viewBox="0 0 600 200" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${col}" stop-opacity=".34"/>
      <stop offset="1" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${g.area}" fill="url(#${gid})"/>
    <path d="${g.line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${g.last[0].toFixed(1)}" cy="${g.last[1].toFixed(1)}" r="4.5" fill="${col}"/>
  </svg>`;
}
function heroHtml(sym) {
  const h = HERO_STATE[sym];
  return `<section class="panel hero" data-sym="${sym}">
    <div class="hero-top">
      ${coinIcon(h)}
      <div class="hero-id"><div class="tk">${sym}</div><div class="nm">${h.name}</div></div>
      <span class="hero-star"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9 12 2Z"/></svg></span>
    </div>
    <div class="hero-price num">${fmtPrice(h.priceUsd)}</div>
    <div class="hero-chg">
      <div class="grp"><span class="v num ${dirClass(h.change24hPct)}">${fmtPct(h.change24hPct)}</span><span class="t">24Ч</span></div>
      <div class="grp"><span class="v num ${dirClass(h.change7dPct)}">${fmtPct(h.change7dPct)}</span><span class="t">7Д</span></div>
    </div>
    <div class="hero-chart">${heroChart(h)}</div>
    <div class="hero-levels">
      <div><div class="lvl-label">Поддержка</div><div class="lvl-vals up num"><span>${fmtPrice(h.support[0]).replace('.00','')}</span><span>${fmtPrice(h.support[1]).replace('.00','')}</span></div></div>
      <div><div class="lvl-label">Сопротивление</div><div class="lvl-vals down num"><span>${fmtPrice(h.resistance[0]).replace('.00','')}</span><span>${fmtPrice(h.resistance[1]).replace('.00','')}</span></div></div>
    </div>
  </section>`;
}
function renderHeroes() { $('#hero-row').innerHTML = HERO_STATE.BTC ? heroHtml('BTC') + heroHtml('ETH') : ''; }
renderHeroes();

let lastHeroFlash = 0;
function heroTick() {
  const sym = Math.random() < 0.5 ? 'BTC' : 'ETH';
  const h = HERO_STATE[sym];
  const prev = h.priceUsd;
  const drift = (Math.random() - 0.47) * h.priceUsd * 0.0012;
  h.priceUsd += drift;
  h.change24hPct += (h.priceUsd - prev) / prev * 100;
  h.sparkline = [...h.sparkline.slice(1), h.priceUsd];
  const dir = h.priceUsd >= prev ? 'up' : 'down';

  const card = $(`.hero[data-sym="${sym}"]`);
  if (!card) return;
  card.querySelector('.hero-price').textContent = fmtPrice(h.priceUsd);
  const v24 = card.querySelectorAll('.hero-chg .v')[0];
  v24.textContent = fmtPct(h.change24hPct);
  v24.className = 'v num ' + dirClass(h.change24hPct);
  card.querySelector('.hero-chart').innerHTML = heroChart(h);

  // throttle the border flash so the card doesn't strobe (§11.4)
  const now = Date.now();
  if (now - lastHeroFlash > 1200) {
    lastHeroFlash = now;
    card.classList.remove('flash-up', 'flash-down');
    void card.offsetWidth;
    card.classList.add(dir === 'up' ? 'flash-up' : 'flash-down');
    setTimeout(() => card.classList.remove('flash-up', 'flash-down'), 900);
  }
}
setInterval(heroTick, 3000);

/* =========================================================
   5. FUNDING + GAS indicators (§14)
   ========================================================= */
function renderFunding() {
  $('#fund-list').innerHTML = INDICATORS.funding.map((f) => {
    const a = ASSET_STATE[f.sym];
    const cls = dirClass(f.val);
    return `<div class="fund-row">
      ${coinIcon(a, 'small')}
      <span class="fk">${f.sym}</span>
      <span class="fv num ${cls}">${(f.val >= 0 ? '+' : '') + f.val.toFixed(4)}%</span>
    </div>`;
  }).join('');
}
renderFunding();
setInterval(() => {
  INDICATORS.funding.forEach((f) => { f.val += (Math.random() - 0.5) * 0.0008; });
  renderFunding();
}, 6000);

let gas = INDICATORS.gas.value;
setInterval(() => {
  gas = Math.max(8, Math.min(40, gas + rndi(-2, 2)));
  $('#gas-val').textContent = gas;
  $('#gas-avg').textContent = gas;
}, 4000);

/* =========================================================
   6. NEWS feed + live highlight (§12)
   ========================================================= */
let newsItems = NEWS_SEED.map((n, i) => ({ ...n, id: 'seed' + i, isNew: false }));
const NEWS_MAX = 5;
function newsHtml(n) {
  return `<div class="news-item ${n.isNew ? 'is-new' : ''}" data-id="${n.id}">
    <div class="news-av" style="color:${n.color}">${n.glyph}</div>
    <div class="news-body">
      <div class="news-meta">
        <span class="news-src">${n.src}</span>
        <span class="news-verify"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1 2.4 1.8 3-.2.9 2.8 2.4 1.7-1 2.9 1 2.9-2.4 1.7-.9 2.8-3-.2L12 23l-2.4-1.8-3 .2-.9-2.8L3.3 17l1-2.9-1-2.9 2.4-1.7.9-2.8 3 .2L12 1Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#0C111C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="news-time">${n.age || 'сейчас'}</span>
      </div>
      <div class="news-title">${n.title}</div>
      <span class="news-tag tag-${n.cat}">${({market:'Маркет',defi:'DeFi',exchange:'Биржа',nft:'NFT',btc:'Биткоин'})[n.cat]}</span>
    </div>
  </div>`;
}
function renderNews() {
  $('#news-list').innerHTML = newsItems.slice(0, NEWS_MAX).map(newsHtml).join('');
}
renderNews();

let newsSeq = 0;
function pushNews() {
  const base = NEWS_POOL[newsSeq % NEWS_POOL.length];
  newsSeq++;
  const item = { ...base, id: 'n' + newsSeq, isNew: true, age: 'сейчас' };
  // age the existing items a touch
  newsItems.forEach((n) => { if (n.age === 'сейчас') n.age = '1 мин'; });
  newsItems.unshift(item);
  newsItems = newsItems.slice(0, NEWS_MAX);
  renderNews();
  const el = $(`#news-list .news-item[data-id="${item.id}"]`);
  if (el) { el.style.animation = 'txEnter .5s var(--ease) both'; }
  // strip the "new" flag after the highlight lifetime (§16: 12s)
  setTimeout(() => {
    item.isNew = false;
    const e2 = $(`#news-list .news-item[data-id="${item.id}"]`);
    if (e2) e2.classList.remove('is-new');
  }, 9000);
}
setInterval(pushNews, 11000);

/* =========================================================
   7. WHALE TICKER — conveyor (§13)
   ========================================================= */
const WHALE_MAX = 5;
let whaleCards = [...WHALE_SEED];
function whaleHtml(t, entering = false) {
  const a = ASSET_STATE[t.asset] || { color: 'usdc', glyph: '$' };
  const arrow = t.dir === 'in'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  return `<div class="tx-card ${entering ? 'entering' : ''}">
    <div class="tx-dir ${t.dir}">${arrow}</div>
    <div class="tx-coin">${coinIcon(a, 'small')}<span class="tk">${t.asset}</span></div>
    <div class="tx-body">
      <div class="tx-amt ${t.dir === 'in' ? 'up' : 'down'}">${t.amount}</div>
      <div class="tx-sub"><span class="tx-usd num">${t.usd}</span><span class="tx-addr">${t.addr}</span><span class="tx-time">${t.age || 'сейчас'}</span></div>
    </div>
  </div>`;
}
function renderWhale() {
  $('#whale-strip').innerHTML = whaleCards.slice(0, WHALE_MAX).map((t, i) => whaleHtml(t, i === 0 && t._enter)).join('');
}
renderWhale();

let whaleSeq = 0;
function pushWhale() {
  const base = WHALE_POOL[whaleSeq % WHALE_POOL.length];
  whaleSeq++;
  whaleCards.unshift({ ...base, age: 'сейчас', _enter: true });
  whaleCards.forEach((c, i) => { if (i > 0) c._enter = false; });
  whaleCards = whaleCards.slice(0, WHALE_MAX);
  renderWhale();
}
setInterval(pushWhale, 4200);
