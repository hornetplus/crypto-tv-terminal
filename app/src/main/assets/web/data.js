/* =========================================================
   Crypto TV Terminal — mock data layer
   Shapes mirror the DTOs in the dev spec (section 7).
   Everything here is fake, generated client-side.
   ========================================================= */

// --- helpers ---------------------------------------------
const rnd  = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function genSpark(base, n, vol) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += rnd(-vol, vol);
    out.push(v);
  }
  return out;
}

// --- asset universe (section 10.1) -----------------------
// color keys map to CSS --c-* vars; glyph is the icon letter/symbol
const ASSETS = {
  BTC:  { name: 'Bitcoin',  color: 'btc',  glyph: '₿', price: 111250.50, c24: 2.35,  c7: 6.72,  vol: '42.1B' },
  ETH:  { name: 'Ethereum', color: 'eth',  glyph: 'Ξ', price: 2680.45,   c24: 3.17,  c7: 8.35,  vol: '21.8B' },
  SOL:  { name: 'Solana',   color: 'sol',  glyph: 'S', price: 176.61,    c24: -1.25, c7: 2.10,  vol: '5.6B'  },
  BNB:  { name: 'BNB',      color: 'bnb',  glyph: 'B', price: 668.17,    c24: 0.78,  c7: 1.90,  vol: '1.2B'  },
  XRP:  { name: 'XRP',      color: 'xrp',  glyph: 'X', price: 2.42,      c24: 4.11,  c7: 9.20,  vol: '2.9B'  },
  TON:  { name: 'Toncoin',  color: 'ton',  glyph: '◈', price: 3.21,      c24: -0.35, c7: -1.10, vol: '681M'  },
  DOGE: { name: 'Dogecoin', color: 'doge', glyph: 'Ð', price: 0.1824,    c24: 1.42,  c7: 4.30,  vol: '1.4B'  },
  ADA:  { name: 'Cardano',  color: 'ada',  glyph: '₳', price: 0.6210,    c24: -0.82, c7: 1.20,  vol: '720M'  },
  AVAX: { name: 'Avalanche',color: 'avax', glyph: 'A', price: 28.44,     c24: 2.10,  c7: 5.60,  vol: '540M'  },
  LINK: { name: 'Chainlink',color: 'link', glyph: 'L', price: 18.22,     c24: 0.94,  c7: 3.10,  vol: '610M'  },
  TRX:  { name: 'TRON',     color: 'trx',  glyph: 'T', price: 0.2410,    c24: 0.31,  c7: 0.90,  vol: '480M'  },
  DOT:  { name: 'Polkadot', color: 'dot',  glyph: '●', price: 5.12,      c24: -1.10, c7: -2.40, vol: '320M'  },
};

// build runtime state with sparklines
const ASSET_STATE = {};
Object.keys(ASSETS).forEach((sym) => {
  const a = ASSETS[sym];
  ASSET_STATE[sym] = {
    symbol: sym,
    name: a.name,
    color: a.color,
    glyph: a.glyph,
    priceUsd: a.price,
    change24hPct: a.c24,
    change7dPct: a.c7,
    volume: a.vol,
    direction: a.c24 >= 0 ? 'up' : 'down',
    sparkline: genSpark(a.price, 28, a.price * 0.012),
  };
});

// watchlist config (section 16)
const WATCHLIST_CFG = {
  fixedAssets: ['BTC', 'ETH'],
  rotatingPool: ['SOL', 'BNB', 'XRP', 'TON', 'DOGE', 'ADA', 'AVAX', 'LINK', 'TRX', 'DOT'],
  windowSize: 6,
  rotationIntervalSec: 45, // продакшн-значение из ТЗ §16 (в демо было 12 для наглядности)
};

// hero assets (section 11) — richer levels
const HERO_STATE = {
  BTC: {
    symbol: 'BTC', name: 'Bitcoin', color: 'btc', glyph: '₿',
    priceUsd: 111250.50, change24hPct: 2.35, change7dPct: 6.72,
    support: [108850, 105300], resistance: [112500, 115700],
    direction: 'up',
    sparkline: genSpark(108000, 60, 900),
  },
  ETH: {
    symbol: 'ETH', name: 'Ethereum', color: 'eth', glyph: 'Ξ',
    priceUsd: 2680.45, change24hPct: 3.17, change7dPct: 8.35,
    support: [2620, 2550], resistance: [2720, 2850],
    direction: 'up',
    sparkline: genSpark(2520, 60, 28),
  },
};

// market overview (section 7.2) — header stats
const MARKET = {
  status: 'open',          // открыт
  fearGreed: 68,           // Greed
  btcDominance: 61.3,
  totalMarketCapUsd: 2.45, // trillions
  capChange: 2.35,
  altseason: 41,
  pulse: 'risk-on',
};

// --- news (section 7.6) ----------------------------------
const NEWS_SEED = [
  { src: 'Cointelegraph', glyph: 'C', color: '#F0B23B', title: 'Bitcoin преодолел $111K на фоне возврата бычьего импульса', cat: 'market',   age: '10 мин' },
  { src: 'The Block',     glyph: 'B', color: '#6F7CE0', title: 'Приток в Ethereum-ETF достиг $200M на фоне институционального спроса', cat: 'defi', age: '25 мин' },
  { src: 'CryptoSlate',   glyph: 'C', color: '#2BE3F0', title: 'Binance анонсирует новые торговые пары и промо с нулевой комиссией', cat: 'exchange', age: '1 ч' },
  { src: 'Decrypt',       glyph: 'D', color: '#1FD98A', title: 'Рынок NFT прибавил 15% за неделю — лидируют ETH-коллекции', cat: 'nft', age: '2 ч' },
  { src: 'BeInCrypto',    glyph: 'B', color: '#8C7BF0', title: 'Доминация биткоина превысила 61%, альтсезон пока на паузе', cat: 'btc', age: '3 ч' },
];

const NEWS_POOL = [
  { src: 'CoinDesk',      glyph: 'C', color: '#F7931A', title: 'Bitcoin-ETF зафиксировали рекордный недельный приток средств', cat: 'market' },
  { src: 'Cointelegraph', glyph: 'C', color: '#F0B23B', title: 'Solana обновила максимум по числу активных адресов за сутки', cat: 'defi' },
  { src: 'The Block',     glyph: 'B', color: '#6F7CE0', title: 'Крупный фонд раскрыл позицию на $480M в спотовом BTC', cat: 'btc' },
  { src: 'Decrypt',       glyph: 'D', color: '#1FD98A', title: 'Новый L2-роллап привлёк $1.2B TVL за первую неделю', cat: 'defi' },
  { src: 'CryptoSlate',   glyph: 'C', color: '#2BE3F0', title: 'Coinbase запускает бессрочные фьючерсы для розничных клиентов', cat: 'exchange' },
  { src: 'BeInCrypto',    glyph: 'B', color: '#8C7BF0', title: 'Индекс страха и жадности вернулся в зону жадности', cat: 'market' },
  { src: 'Decrypt',       glyph: 'D', color: '#1FD98A', title: 'Продажи голубых NFT-коллекций выросли на 22% за сутки', cat: 'nft' },
  { src: 'The Block',     glyph: 'B', color: '#6F7CE0', title: 'XRP прибавил 4% после новостей о платёжном партнёрстве', cat: 'market' },
  { src: 'Cointelegraph', glyph: 'C', color: '#F0B23B', title: 'Газ в сети Ethereum опустился до минимума за месяц', cat: 'defi' },
];

// --- whale transactions (section 7.7) --------------------
const WHALE_SEED = [
  { asset: 'BTC',  dir: 'in',  amount: '+1,250 BTC',         usd: '$138.76M', addr: 'bc1q...8k7a', age: '9 мин' },
  { asset: 'ETH',  dir: 'out', amount: '-5,000 ETH',         usd: '$13.42M',  addr: '0x7a...3f91', age: '22 мин' },
  { asset: 'USDC', dir: 'in',  amount: '+12,500,000 USDC',   usd: '$12.50M',  addr: '0x4d...9c1n', age: '30 мин' },
  { asset: 'SOL',  dir: 'out', amount: '-75,000 SOL',        usd: '$13.20M',  addr: '7xK9...Q2w3', age: '38 мин' },
  { asset: 'BTC',  dir: 'in',  amount: '+2,000 BTC',         usd: '$222.50M', addr: 'bc1p...7s8d', age: '45 мин' },
];

const WHALE_POOL = [
  { asset: 'ETH',  dir: 'in',  amount: '+18,400 ETH',        usd: '$49.32M',  addr: '0x91...2ab4' },
  { asset: 'BTC',  dir: 'out', amount: '-640 BTC',           usd: '$71.20M',  addr: 'bc1q...c4e1' },
  { asset: 'USDC', dir: 'out', amount: '-40,000,000 USDC',   usd: '$40.00M',  addr: '0x3e...88fa' },
  { asset: 'SOL',  dir: 'in',  amount: '+220,000 SOL',       usd: '$38.85M',  addr: 'Hd92...kLmn' },
  { asset: 'XRP',  dir: 'in',  amount: '+22,000,000 XRP',    usd: '$53.24M',  addr: 'rPq8...9XzT' },
  { asset: 'BTC',  dir: 'in',  amount: '+3,100 BTC',         usd: '$344.87M', addr: 'bc1q...m0p2' },
  { asset: 'TON',  dir: 'out', amount: '-9,800,000 TON',     usd: '$31.46M',  addr: 'EQB3...7Yd9' },
  { asset: 'ETH',  dir: 'out', amount: '-12,000 ETH',        usd: '$32.16M',  addr: '0xbe...5510' },
  { asset: 'AVAX', dir: 'in',  amount: '+1,400,000 AVAX',    usd: '$39.82M',  addr: 'X-av...q7r3' },
];

// indicators (section 7.8)
const INDICATORS = {
  liquidations: { total: '$285.47M', longUsd: '$195.21M', shortUsd: '$90.26M', longPct: 68 },
  funding: [
    { sym: 'BTC', val: 0.0100 },
    { sym: 'ETH', val: 0.0082 },
    { sym: 'SOL', val: -0.0021 },
    { sym: 'XRP', val: 0.0054 },
  ],
  gas: { value: 18, low: 12, avg: 18, high: 26, usd: '$0.62' },
};
