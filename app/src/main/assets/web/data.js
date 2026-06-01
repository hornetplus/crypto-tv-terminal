/* =========================================================
   Crypto TV Terminal — метаданные и НАЧАЛЬНОЕ состояние
   Цвета/глифы/имена монет + стартовые значения для первого кадра.
   Реальные числа приходят из api.js и перезаписывают эти значения
   в течение пары секунд после запуска. Новости и крупные сделки
   начинаются пустыми (показывается «загрузка»), чтобы на экране не
   было выдуманного контента до прихода реальных данных.
   ========================================================= */
'use strict';

// color -> CSS var --c-*, glyph -> символ в кружке
const ASSETS = {
  BTC:  { name: 'Bitcoin',   color: 'btc',  glyph: '₿' },
  ETH:  { name: 'Ethereum',  color: 'eth',  glyph: 'Ξ' },
  SOL:  { name: 'Solana',    color: 'sol',  glyph: 'S' },
  BNB:  { name: 'BNB',       color: 'bnb',  glyph: 'B' },
  XRP:  { name: 'XRP',       color: 'xrp',  glyph: 'X' },
  TON:  { name: 'Toncoin',   color: 'ton',  glyph: '◈' },
  DOGE: { name: 'Dogecoin',  color: 'doge', glyph: 'Ð' },
  ADA:  { name: 'Cardano',   color: 'ada',  glyph: '₳' },
  AVAX: { name: 'Avalanche', color: 'avax', glyph: 'A' },
  LINK: { name: 'Chainlink', color: 'link', glyph: 'L' },
  TRX:  { name: 'TRON',      color: 'trx',  glyph: 'T' },
  DOT:  { name: 'Polkadot',  color: 'dot',  glyph: '●' },
  USDC: { name: 'USD Coin',  color: 'usdc', glyph: '$' },
};

// рабочее состояние активов (сидируется нулями/плейсхолдером, наполняется из api.js)
const ASSET_STATE = {};
Object.keys(ASSETS).forEach((sym) => {
  const a = ASSETS[sym];
  ASSET_STATE[sym] = {
    symbol: sym, name: a.name, color: a.color, glyph: a.glyph,
    priceUsd: 0, change24hPct: 0, change7dPct: 0,
    volumeUsd: 0, direction: 'up', sparkline: [],
  };
});

// левый список (ТЗ §10): фикс + ротация окна
const WATCHLIST_CFG = {
  fixedAssets: ['BTC', 'ETH'],
  rotatingPool: ['SOL', 'BNB', 'XRP', 'TON', 'DOGE', 'ADA', 'AVAX', 'LINK', 'TRX', 'DOT'],
  windowSize: 6,
  rotationIntervalSec: 45,
};

// hero-карточки (ТЗ §11) — уровни считаются из 24ч/7д при обновлении
const HERO_STATE = {
  BTC: { symbol: 'BTC', name: 'Bitcoin',  color: 'btc', glyph: '₿', priceUsd: 0, change24hPct: 0, change7dPct: 0, support: [0, 0], resistance: [0, 0], direction: 'up', sparkline: [] },
  ETH: { symbol: 'ETH', name: 'Ethereum', color: 'eth', glyph: 'Ξ', priceUsd: 0, change24hPct: 0, change7dPct: 0, support: [0, 0], resistance: [0, 0], direction: 'up', sparkline: [] },
};

// шапка (ТЗ §7.2)
const MARKET = {
  status: 'open',           // крипторынок работает 24/7
  fearGreed: 50, fgLabel: 'Neutral',
  btcDominance: 0,
  totalMarketCapUsd: 0, capChange: 0,
  altseason: 0,
};

// индикаторы (ТЗ §7.8). funding/gas наполняются реально; liquidations требует платного провайдера → «н/д»
const INDICATORS = {
  liquidations: { total: '—', longUsd: '—', shortUsd: '—', longPct: null },
  funding: [
    { sym: 'BTC', val: null }, { sym: 'ETH', val: null },
    { sym: 'SOL', val: null }, { sym: 'XRP', val: null },
  ],
  gas: { value: null, low: null, avg: null, high: null, usd: null },
};

// стартуют пустыми — наполняются реальными данными из api.js
const NEWS_SEED = [];
const WHALE_SEED = [];
