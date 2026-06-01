/* =========================================================
   Crypto TV Terminal — конфигурация реальных источников данных
   Здесь включаются провайдеры, интервалы опроса, ключи (если есть)
   и БОЛЬШОЙ список источников новостей. Меняйте без правки логики.
   ========================================================= */
'use strict';

const CONFIG = {
  // -------- Ключи (по желанию; без них работает большинство данных) --------
  keys: {
    coingeckoDemo: '',   // x-cg-demo-api-key (бесплатный demo-ключ CoinGecko, 100 req/min). Пусто = публичный режим.
    cryptopanic:   '',   // токен cryptopanic.com/developers/api/keys → агрегатор новостей из сотен источников
    rss2json:      '',   // api.rss2json.com (бесплатный ключ повышает лимит). Пусто = публичный лимит.
    coinglass:     '',   // нужен для РЕАЛЬНЫХ ликвидаций (платный). Пусто = виджет покажет «н/д».
  },

  // -------- Интервалы опроса (мс) --------
  intervals: {
    markets:   45000,   // цены/изменения/спарклайны (CoinGecko)
    global:    60000,   // капитализация + доминация BTC (CoinGecko /global)
    fng:      300000,   // индекс страха и жадности (обновляется раз в сутки)
    gas:       30000,   // газ Ethereum (публичный RPC)
    funding:   60000,   // ставки фандинга (биржа)
    news:      90000,   // опрос новостей (ротация источников)
    whale:      8000,   // крупные сделки (биржевые сделки выше порога)
  },

  // -------- Сопоставление тикер → id CoinGecko --------
  coingeckoIds: {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
    XRP: 'ripple', TON: 'the-open-network', DOGE: 'dogecoin', ADA: 'cardano',
    AVAX: 'avalanche-2', LINK: 'chainlink', TRX: 'tron', DOT: 'polkadot',
    USDC: 'usd-coin',
  },

  // -------- Фандинг: инструменты по биржам (пробуем по очереди) --------
  funding: {
    symbols: ['BTC', 'ETH', 'SOL', 'XRP'],
    okxInst:    (s) => `${s}-USDT-SWAP`,
    bybitSym:   (s) => `${s}USDT`,
  },

  // -------- Крупные сделки: пары и пороги (USD) для биржевого потока --------
  whale: {
    pairs: [
      { sym: 'BTC', okx: 'BTC-USDT', minUsd: 750000 },
      { sym: 'ETH', okx: 'ETH-USDT', minUsd: 400000 },
      { sym: 'SOL', okx: 'SOL-USDT', minUsd: 250000 },
      { sym: 'XRP', okx: 'XRP-USDT', minUsd: 250000 },
    ],
  },

  // -------- Публичные Ethereum RPC (для газа) — пробуем по очереди --------
  ethRpc: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com',
  ],

  // -------- CORS-прокси для RSS (новости). Пробуем по очереди. --------
  // rss2json отдаёт уже разобранный JSON; allorigins — сырой XML (парсим в JS).
  rssProxies: [
    { type: 'rss2json',   build: (u, key) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}${key ? '&api_key=' + key : ''}` },
    { type: 'allorigins', build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  ],

  // =========================================================
  //  БОЛЬШОЙ СПИСОК ИСТОЧНИКОВ НОВОСТЕЙ (RSS)
  //  Добавляйте/убирайте свободно. glyph — буква аватара, color — её цвет.
  //  lang: 'en'/'ru'. Опрашиваются по ротации, дубликаты по ссылке отсекаются.
  // =========================================================
  newsSources: [
    // --- Англоязычные ---
    { name: 'CoinDesk',        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', glyph: 'C', color: '#F7931A', lang: 'en' },
    { name: 'Cointelegraph',   url: 'https://cointelegraph.com/rss',                   glyph: 'C', color: '#F0B23B', lang: 'en' },
    { name: 'The Block',       url: 'https://www.theblock.co/rss.xml',                 glyph: 'B', color: '#6F7CE0', lang: 'en' },
    { name: 'Decrypt',         url: 'https://decrypt.co/feed',                         glyph: 'D', color: '#1FD98A', lang: 'en' },
    { name: 'CryptoSlate',     url: 'https://cryptoslate.com/feed/',                   glyph: 'C', color: '#2BE3F0', lang: 'en' },
    { name: 'BeInCrypto',      url: 'https://beincrypto.com/feed/',                    glyph: 'B', color: '#8C7BF0', lang: 'en' },
    { name: 'Bitcoin Magazine',url: 'https://bitcoinmagazine.com/feed',                glyph: 'B', color: '#F7931A', lang: 'en' },
    { name: 'U.Today',         url: 'https://u.today/rss',                             glyph: 'U', color: '#2775CA', lang: 'en' },
    { name: 'CoinGape',        url: 'https://coingape.com/feed/',                      glyph: 'C', color: '#E0146C', lang: 'en' },
    { name: 'AMBCrypto',       url: 'https://ambcrypto.com/feed/',                     glyph: 'A', color: '#14F0C8', lang: 'en' },
    { name: 'CryptoBriefing',  url: 'https://cryptobriefing.com/feed/',                glyph: 'C', color: '#F0B90B', lang: 'en' },
    { name: 'Bitcoinist',      url: 'https://bitcoinist.com/feed/',                    glyph: 'B', color: '#F7931A', lang: 'en' },
    { name: 'NewsBTC',         url: 'https://www.newsbtc.com/feed/',                   glyph: 'N', color: '#1FD98A', lang: 'en' },
    { name: 'CryptoPotato',    url: 'https://cryptopotato.com/feed/',                  glyph: 'C', color: '#F0B23B', lang: 'en' },
    { name: 'The Defiant',     url: 'https://thedefiant.io/feed',                      glyph: 'D', color: '#8C7BF0', lang: 'en' },
    { name: 'DL News',         url: 'https://www.dlnews.com/arc/outboundfeeds/rss/',   glyph: 'D', color: '#2BE3F0', lang: 'en' },
    { name: 'Blockworks',      url: 'https://blockworks.co/feed',                      glyph: 'B', color: '#6F7CE0', lang: 'en' },
    { name: 'CoinJournal',     url: 'https://coinjournal.net/feed/',                   glyph: 'C', color: '#2775CA', lang: 'en' },
    { name: 'crypto.news',     url: 'https://crypto.news/feed/',                       glyph: 'C', color: '#14F0C8', lang: 'en' },
    { name: 'Watcher.Guru',    url: 'https://watcher.guru/news/feed',                  glyph: 'W', color: '#F0B23B', lang: 'en' },
    { name: 'CCN',             url: 'https://www.ccn.com/feed/',                       glyph: 'C', color: '#E84142', lang: 'en' },
    { name: 'The Daily Hodl',  url: 'https://dailyhodl.com/feed/',                     glyph: 'D', color: '#1FD98A', lang: 'en' },
    { name: 'ZyCrypto',        url: 'https://zycrypto.com/feed/',                      glyph: 'Z', color: '#8C7BF0', lang: 'en' },
    { name: 'Coinpedia',       url: 'https://coinpedia.org/feed/',                     glyph: 'C', color: '#E0146C', lang: 'en' },
    { name: 'Finbold',         url: 'https://finbold.com/feed/',                       glyph: 'F', color: '#2BE3F0', lang: 'en' },
    // --- Русскоязычные ---
    { name: 'ForkLog',         url: 'https://forklog.com/feed/',                       glyph: 'F', color: '#2BE3F0', lang: 'ru' },
    { name: 'Bits.media',      url: 'https://bits.media/rss/news/',                    glyph: 'B', color: '#F7931A', lang: 'ru' },
    { name: 'Incrypted',       url: 'https://incrypted.com/feed/',                     glyph: 'I', color: '#1FD98A', lang: 'ru' },
    { name: 'BeInCrypto RU',   url: 'https://ru.beincrypto.com/feed/',                 glyph: 'B', color: '#8C7BF0', lang: 'ru' },
    { name: 'Cointelegraph RU',url: 'https://ru.cointelegraph.com/rss',                glyph: 'C', color: '#F0B23B', lang: 'ru' },
  ],
};
