/* =========================================================
   Crypto TV Terminal — слой реальных данных
   Тянет данные с публичных API, приводит к форме DTO (ТЗ §7),
   кэширует последнее валидное значение и рассылает события.
   UI (terminal.js) подписывается на FEED и только перерисовывает.
   Все запросы — с таймаутом и запасными источниками; при сбое
   данные не фабрикуются (показывается «—» или последнее валидное).
   ========================================================= */
'use strict';

/* ---------- простая шина событий ---------- */
const FEED = (() => {
  const subs = {};
  return {
    on(ch, cb) { (subs[ch] = subs[ch] || []).push(cb); },
    emit(ch, data) { (subs[ch] || []).forEach((cb) => { try { cb(data); } catch (e) { console.error(e); } }); },
  };
})();

/* ---------- сетевые помощники с таймаутом ---------- */
async function fetchText(url, timeout = 12000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}
async function fetchJSON(url, opts = {}, timeout = 12000) {
  return JSON.parse(await fetchText(url, timeout, opts));
}
function cgHeaders() {
  return CONFIG.keys.coingeckoDemo ? { 'x-cg-demo-api-key': CONFIG.keys.coingeckoDemo } : {};
}

/* ---------- утилиты ---------- */
let lastMarkets = {};
function cleanText(s) {
  if (!s) return '';
  return s.replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
          .trim();
}
function relTime(date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return 'сейчас';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' мин';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' ч';
  return Math.floor(hr / 24) + ' дн';
}
function fmtQty(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return Math.round(n).toLocaleString('en-US');
  if (n >= 1)   return n.toFixed(0);
  return n.toFixed(2);
}
function fmtUsdShort(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}
function categorize(title) {
  const t = (title || '').toLowerCase();
  if (/\bnft\b|нфт/.test(t)) return 'nft';
  if (/binance|coinbase|kraken|okx|exchange|listing|бирж/.test(t)) return 'exchange';
  if (/defi|tvl|stak|staking|yield|rollup|\bl2\b|liquidity|стейк|дефи/.test(t)) return 'defi';
  if (/bitcoin|btc|биткоин|биткойн/.test(t)) return 'btc';
  return 'market';
}

/* ---------- 1. РЫНОК: цены/24ч/7д/объём/спарклайн (CoinGecko) ---------- */
async function pollMarkets() {
  const ids = Object.values(CONFIG.coingeckoIds).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}` +
              `&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h,7d`;
  const data = await fetchJSON(url, { headers: cgHeaders() }, 15000);
  if (!Array.isArray(data)) throw new Error('markets: bad shape');
  const idToSym = {};
  Object.entries(CONFIG.coingeckoIds).forEach(([s, i]) => { idToSym[i] = s; });
  const bySym = {};
  data.forEach((c) => {
    const sym = idToSym[c.id];
    if (!sym) return;
    bySym[sym] = {
      symbol: sym,
      priceUsd: c.current_price,
      change24hPct: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0,
      change7dPct: c.price_change_percentage_7d_in_currency ?? 0,
      volumeUsd: c.total_volume,
      high24h: c.high_24h,
      low24h: c.low_24h,
      sparkline: (c.sparkline_in_7d && c.sparkline_in_7d.price) ? c.sparkline_in_7d.price : [],
    };
  });
  lastMarkets = bySym;
  FEED.emit('markets', bySym);
}

/* ---------- 2. ГЛОБАЛ: капитализация + доминация BTC ---------- */
async function pollGlobal() {
  const d = await fetchJSON('https://api.coingecko.com/api/v3/global', { headers: cgHeaders() }, 15000);
  const g = d && d.data;
  if (!g) throw new Error('global: bad shape');
  FEED.emit('global', {
    capUsd: g.total_market_cap.usd,
    capChangePct: g.market_cap_change_percentage_24h_usd,
    btcDominance: g.market_cap_percentage.btc,
  });
}

/* ---------- 3. Индекс страха и жадности (alternative.me) ---------- */
async function pollFng() {
  const d = await fetchJSON('https://api.alternative.me/fng/?limit=1', {}, 12000);
  const v = d && d.data && d.data[0];
  if (!v) throw new Error('fng: bad shape');
  FEED.emit('fng', { value: +v.value, label: v.value_classification });
}

/* ---------- 4. ГАЗ Ethereum (публичный JSON-RPC) ---------- */
async function rpc(method, params) {
  for (const url of CONFIG.ethRpc) {
    try {
      const d = await fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      }, 12000);
      if (d && d.result !== undefined) return d.result;
    } catch (e) { /* следующий RPC */ }
  }
  throw new Error('eth rpc: all failed');
}
async function pollGas() {
  let low, avg, high;
  try {
    const r = await rpc('eth_feeHistory', ['0x5', 'latest', [10, 50, 90]]);
    const baseArr = r.baseFeePerGas;
    const base = parseInt(baseArr[baseArr.length - 1], 16);
    const rew = r.reward;
    const n = rew.length || 1;
    const avgP = (i) => rew.reduce((s, a) => s + parseInt(a[i], 16), 0) / n;
    low = (base + avgP(0)) / 1e9;
    avg = (base + avgP(1)) / 1e9;
    high = (base + avgP(2)) / 1e9;
  } catch (e) {
    const gp = parseInt(await rpc('eth_gasPrice', []), 16) / 1e9;
    low = gp * 0.85; avg = gp; high = gp * 1.25;
  }
  const ethPrice = (lastMarkets.ETH && lastMarkets.ETH.priceUsd) || 0;
  const usd = ethPrice ? (21000 * avg * 1e-9 * ethPrice) : null; // стоимость обычного перевода
  FEED.emit('gas', {
    low: Math.max(1, Math.round(low)),
    avg: Math.max(1, Math.round(avg)),
    high: Math.max(1, Math.round(high)),
    usd: usd != null ? '$' + usd.toFixed(2) : null,
  });
}

/* ---------- 5. ФАНДИНГ (OKX → Bybit) ---------- */
async function pollFunding() {
  const out = [];
  for (const sym of CONFIG.funding.symbols) {
    let rate = null;
    try {
      const d = await fetchJSON(`https://www.okx.com/api/v5/public/funding-rate?instId=${CONFIG.funding.okxInst(sym)}`, {}, 10000);
      const r = d && d.data && d.data[0] && d.data[0].fundingRate;
      if (r != null && r !== '') rate = parseFloat(r) * 100;
    } catch (e) { /* пробуем bybit */ }
    if (rate === null) {
      try {
        const d = await fetchJSON(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${CONFIG.funding.bybitSym(sym)}`, {}, 10000);
        const r = d && d.result && d.result.list && d.result.list[0] && d.result.list[0].fundingRate;
        if (r != null && r !== '') rate = parseFloat(r) * 100;
      } catch (e) { /* оставляем null */ }
    }
    out.push({ sym, val: rate });
  }
  FEED.emit('funding', out);
}

/* ---------- 6. НОВОСТИ (CryptoPanic / RSS через прокси) ---------- */
let newsSeen = new Set();
let newsBootstrapped = false;
let newsIdx = 0;

function parseRss(xml) {
  const out = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    let nodes = [...doc.querySelectorAll('item')];
    if (!nodes.length) nodes = [...doc.querySelectorAll('entry')]; // Atom
    nodes.forEach((it) => {
      const title = (it.querySelector('title') || {}).textContent || '';
      let link = (it.querySelector('link') || {}).textContent || '';
      if (!link) { const l = it.querySelector('link'); if (l) link = l.getAttribute('href') || ''; }
      const dt = (it.querySelector('pubDate') || it.querySelector('published') || it.querySelector('updated') || {}).textContent || '';
      out.push({ title, link, date: dt });
    });
  } catch (e) { /* ignore */ }
  return out;
}

function ingestNews(items) {
  let added = 0;
  items.forEach((it) => {
    if (!it.title || newsSeen.has(it.id)) return;
    newsSeen.add(it.id);
    added++;
    FEED.emit('news:item', {
      id: it.id,
      title: it.title,
      source: it.source,
      glyph: it.glyph || (it.source ? it.source[0].toUpperCase() : '•'),
      color: it.color || '#2BE3F0',
      cat: categorize(it.title),
      date: it.date instanceof Date ? it.date : new Date(it.date || Date.now()),
      isNew: newsBootstrapped, // первая загрузка — без вспышки; далее — подсветка нового
    });
  });
  if (newsSeen.size > 4000) newsSeen = new Set([...newsSeen].slice(-2000));
  return added;
}

async function fetchFeed(src) {
  for (const proxy of CONFIG.rssProxies) {
    try {
      if (proxy.type === 'rss2json') {
        const d = await fetchJSON(proxy.build(src.url, CONFIG.keys.rss2json), {}, 15000);
        if (d && d.status === 'ok' && Array.isArray(d.items) && d.items.length) {
          ingestNews(d.items.slice(0, 6).map((it) => ({
            id: src.name + ':' + (it.guid || it.link || it.title),
            title: cleanText(it.title), source: src.name, glyph: src.glyph, color: src.color,
            date: it.pubDate ? new Date(it.pubDate) : new Date(),
          })));
          return true;
        }
      } else {
        const xml = await fetchText(proxy.build(src.url), 15000);
        const parsed = parseRss(xml).slice(0, 6).map((it) => ({
          id: src.name + ':' + (it.link || it.title),
          title: cleanText(it.title), source: src.name, glyph: src.glyph, color: src.color,
          date: it.date ? new Date(it.date) : new Date(),
        }));
        if (parsed.length) { ingestNews(parsed); return true; }
      }
    } catch (e) { /* следующий прокси */ }
  }
  return false;
}

async function pollNews() {
  if (CONFIG.keys.cryptopanic) {
    try {
      const api = `https://cryptopanic.com/api/v1/posts/?auth_token=${CONFIG.keys.cryptopanic}&public=true&kind=news`;
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(api)}`;
      const d = await fetchJSON(proxied, {}, 15000);
      if (d && Array.isArray(d.results) && d.results.length) {
        ingestNews(d.results.map((p) => ({
          id: 'cp' + p.id,
          title: cleanText(p.title),
          source: (p.source && (p.source.title || p.source.domain)) || 'CryptoPanic',
          date: p.published_at ? new Date(p.published_at) : new Date(),
        })));
        newsBootstrapped = true;
        return;
      }
    } catch (e) { /* откат к RSS */ }
  }
  // RSS: по 3 источника за опрос, по кругу
  const srcs = CONFIG.newsSources;
  await Promise.allSettled([0, 1, 2].map(() => fetchFeed(srcs[(newsIdx++) % srcs.length])));
  newsBootstrapped = true;
}

/* ---------- 7. КРУПНЫЕ СДЕЛКИ (биржевой поток OKX) ---------- */
let whaleSeen = new Set();
async function pollWhale() {
  for (const p of CONFIG.whale.pairs) {
    try {
      const d = await fetchJSON(`https://www.okx.com/api/v5/market/trades?instId=${p.okx}&limit=60`, {}, 10000);
      const arr = d && d.data;
      if (!Array.isArray(arr)) continue;
      const fresh = [];
      for (const t of arr) {
        const px = parseFloat(t.px), sz = parseFloat(t.sz);
        const usd = px * sz;
        const key = p.okx + ':' + t.tradeId;
        if (usd >= p.minUsd && !whaleSeen.has(key)) {
          whaleSeen.add(key);
          fresh.push({ t, px, sz, usd });
        }
      }
      // эмитим от старых к новым, чтобы самый свежий встал первым на ленте
      fresh.sort((a, b) => (+a.t.ts) - (+b.t.ts));
      fresh.forEach(({ t, sz, usd }) => {
        FEED.emit('whale', {
          asset: p.sym,
          dir: t.side === 'buy' ? 'in' : 'out',
          amount: (t.side === 'buy' ? '+' : '-') + fmtQty(sz) + ' ' + p.sym,
          usd: '$' + fmtUsdShort(usd),
          addr: 'OKX · спот',
          ts: +t.ts,
        });
      });
    } catch (e) { /* пропускаем пару */ }
  }
  if (whaleSeen.size > 3000) whaleSeen = new Set([...whaleSeen].slice(-1500));
}

/* ---------- планировщик ---------- */
function runSafe(fn, label) {
  return Promise.resolve().then(fn).catch((e) => {
    FEED.emit('status', { channel: label, ok: false, err: String(e) });
    console.warn('[' + label + ']', e && e.message);
  });
}
function startPolling() {
  const I = CONFIG.intervals;
  const jobs = [
    ['markets', pollMarkets, I.markets],
    ['global', pollGlobal, I.global],
    ['fng', pollFng, I.fng],
    ['gas', pollGas, I.gas],
    ['funding', pollFunding, I.funding],
    ['news', pollNews, I.news],
    ['whale', pollWhale, I.whale],
  ];
  jobs.forEach(([label, fn, ms], idx) => {
    setTimeout(() => {
      runSafe(fn, label);
      setInterval(() => runSafe(fn, label), ms);
    }, idx * 500); // разносим стартовые запросы
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPolling);
} else {
  startPolling();
}

// экспорт для terminal.js
window.FEED = FEED;
window.relTime = relTime;
