# Crypto TV Terminal — Android TV (APK)

Полноэкранное Android TV приложение — визуальное табло крипторынка для постоянной
работы на телевизоре и считывания с расстояния 2–4 м. Внешний слой (вёрстка, цвета,
анимации) уже собран в дизайне; этот проект превращает его в нативное, постоянно
работающее TV-приложение и собирает устанавливаемый APK.

![banner](app/src/main/res/drawable-xhdpi/banner.png)

---

## ⚠️ Как получить сам APK (важно прочитать)

Готовый `.apk` **не приложен бинарём**, потому что среда, где собирался проект, не
имеет ни Android SDK, ни доступа в интернет, чтобы его докачать — скомпилировать APK
там физически невозможно. Поэтому здесь — **полностью готовый к сборке проект** и три
способа получить из него APK. Самый простой — первый, он не требует ничего ставить
на компьютер.

### Способ A — GitHub Actions (рекомендуется, без установки инструментов)
1. Создайте репозиторий на GitHub и загрузите туда содержимое этой папки
   (либо `git init && git add . && git commit && git push`).
2. Откройте вкладку **Actions** → workflow **«Build APK»** уже лежит в проекте.
   Он запустится сам на `push`, либо нажмите **Run workflow**.
3. Через ~3–5 минут в завершённом запуске, внизу в разделе **Artifacts**, появится
   архив **`crypto-tv-terminal-debug`** — внутри `app-debug.apk`. Скачайте его.

Это полноценный устанавливаемый APK (подписан debug-ключом, ставится на любое TV).

### Способ B — Android Studio (если он установлен)
1. **File → Open** → выберите эту папку. Дайте студии синхронизироваться (она сама
   скачает Gradle, Android SDK-компоненты и зависимости, а также до-создаст
   `gradle-wrapper.jar`).
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. APK появится в `app/build/outputs/apk/debug/app-debug.apk`.

### Способ C — командная строка (Linux/macOS/Windows с интернетом)
Нужны JDK 17 и Android SDK (cmdline-tools). Затем из папки проекта:

```bash
# один раз материализуем gradle wrapper (если есть установленный gradle):
gradle wrapper --gradle-version 8.9
# затем сборка:
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```
Если установленного `gradle` нет — поставьте его (`sdkman`, `brew install gradle`,
или скачайте с gradle.org), либо используйте Способ A/B.

> Примечание про wrapper: бинарный `gradle/wrapper/gradle-wrapper.jar` намеренно не
> включён (его нельзя было скачать в офлайн-среде). Android Studio и команда
> `gradle wrapper` создают его автоматически; GitHub Actions использует Gradle напрямую
> и в нём не нуждается. Версия Gradle закреплена в `gradle/wrapper/gradle-wrapper.properties`.

---

## 📺 Установка на телевизор

**Через ADB по сети (Android TV / Google TV):**
```bash
# на ТВ: Настройки → Об устройстве → 7 раз по «Сборка» (вкл. режим разработчика),
#        затем Настройки → Система → Для разработчиков → Отладка по USB / по сети.
adb connect <IP_телевизора>:5555
adb install -r app-debug.apk
```
Приложение появится на главном экране Android TV (иконка + баннер «CRYPTO TERMINAL»).

**Через USB-флешку / файловый менеджер:** скопируйте `app-debug.apk` на флешку,
вставьте в ТВ, откройте любым файловым менеджером (напр. X-plore / Send files to TV)
и установите (разрешите установку из неизвестных источников).

**Fire TV:** `adb connect <IP>:5555` → `adb install -r app-debug.apk` (так же).

---

## Что было доделано (от дизайна к приложению)

Дизайн-пакет был **HTML/CSS/JS прототипом** (референс вида и поведения). Превращён в
рабочее TV-приложение:

- **Нативная Android-обёртка** (`MainActivity.kt`) — один полноэкранный `WebView`,
  который грузит локально упакованное табло из `assets/`. Реализовано:
  экран не гаснет (`KEEP_SCREEN_ON`), иммерсивный полноэкранный режим, фиксация
  landscape, защита от случайного закрытия с пульта (BACK), корректный lifecycle.
- **Полный офлайн** — убрана единственная сетевая зависимость прототипа (загрузка
  шрифта с Google Fonts); всё работает без интернета. Данные — mock-генерация на
  клиенте, как и было задумано в ТЗ (раздел 7/«Состояние и данные»).
- **TV-ресурсы** — иконка лаунчера (все плотности) и баннер 320×180 для
  Leanback-лаунчера; манифест с `LEANBACK_LAUNCHER`, баннером, landscape и
  обработкой `configChanges` (смена времени/таймзоны/UI-режима не перезапускает табло).
- **Сборка** — Gradle-проект (AGP 8.5.2 / Kotlin 1.9.24 / Gradle 8.9) + готовый
  GitHub Actions workflow, выдающий APK артефактом.
- **Правки по ТЗ** — интервал ротации watchlist возвращён к продакшн-значению 45 с
  (в демо было 12); добавлены устойчивые ре-фиты масштаба под ресайз/ориентацию
  WebView на реальном железе.

### Соответствие acceptance-критериям (ТЗ §19)
| Критерий | Где реализовано |
|---|---|
| §19.1 Локальное системное время, реакция на смену без перезапуска | веб `new Date()` каждую секунду + `configChanges` в манифесте (WebView не пересоздаётся) |
| §19.2 Watchlist: фикс.+ротация, pulse цены | `terminal.js` (rotation 45 с, `flash-up/down`), `terminal.css` |
| §19.3 BTC/ETH независимо, троттлинг мигания | `heroTick()` с throttle 1.2 с |
| §19.4 Новости без полной перезагрузки, подсветка, без дублей | `pushNews()` / `is-new` glow / dedup по id |
| §19.5 Лента транзакций: вход слева, сдвиг, выход справа, очередь | `pushWhale()` + `txEnter` анимация |
| §19.6 Stability, длительная работа | локальные обновления (§9.3), `KEEP_SCREEN_ON`, без полной перерисовки |

---

## Конфигурация и подключение реальных данных

Сейчас данные — реалистичные mock-значения (`assets/web/data.js`), обновляются
таймерами в `assets/web/terminal.js`. Структуры совпадают с DTO из ТЗ (раздел 7).

**Где менять интервалы/наборы:**
- `data.js → WATCHLIST_CFG` — фиксированные/ротируемые активы, размер окна,
  `rotationIntervalSec`.
- `terminal.js` — `setInterval(...)` у `priceTick` (2.4 с), `heroTick` (3 с),
  `pushNews` (11 с), `pushWhale` (4.2 с), funding (6 с), gas (4 с).

**Чтобы подключить настоящие API/вебсокеты:**
1. В `terminal.js` замените тело `*Tick()`/`push*()` на загрузку данных
   (`fetch`/`WebSocket`), сохранив форму объектов из ТЗ §7 — остальной рендер и
   анимации трогать не нужно.
2. Включите доступ в сеть: разрешение `INTERNET` уже есть в манифесте; для HTTPS
   ничего больше не требуется. Для cleartext (http) или для строгой загрузки локальных
   ассетов рассмотрите `WebViewAssetLoader` (androidx.webkit).
3. Соблюдайте отказоустойчивость ТЗ §18: кэшируйте последний валидный state, не
   очищайте блок при потере данных, показывайте stale-вид.

## Шрифт
Дизайн использует **Manrope**. В офлайн-сборке стоит системный фолбэк (Roboto на
Android TV) — выглядит чисто. Чтобы получить точный Manrope: положите
`Manrope-Variable.woff2` в `app/src/main/assets/web/fonts/` и раскомментируйте блок
`@font-face` в `terminal.css` (подробности — в `assets/web/fonts/README.txt`).

## Подпись релиза (для публикации, не для теста)
Debug-APK уже подписан debug-ключом и ставится на ТВ. Для релиза создайте keystore
(`keytool -genkey -v -keystore release.jks -alias key -keyalg RSA -keysize 2048 -validity 10000`),
добавьте `signingConfigs { release { ... } }` в `app/build.gradle`, привяжите к
`buildTypes.release` и соберите `assembleRelease`.

---

## Структура проекта
```
CryptoTVTerminal/
├─ app/
│  ├─ build.gradle                      конфиг модуля (compile/min/target SDK, Kotlin)
│  ├─ proguard-rules.pro
│  └─ src/main/
│     ├─ AndroidManifest.xml            leanback-лаунчер, баннер, landscape, configChanges
│     ├─ java/com/cryptotv/terminal/
│     │  └─ MainActivity.kt             полноэкранный kiosk-WebView хост
│     ├─ res/
│     │  ├─ values/                     strings, colors, fullscreen-тема
│     │  ├─ drawable-xhdpi/banner.png   TV-баннер 320×180
│     │  └─ mipmap-*/ic_launcher.png    иконки всех плотностей
│     └─ assets/web/                    ← собранное табло (тот самый дизайн)
│        ├─ index.html
│        ├─ terminal.css                токены/стили (сетевой шрифт убран)
│        ├─ data.js                     mock-данные по DTO из ТЗ §7
│        ├─ terminal.js                 логика+анимации (часы, ротация, pulse, лента)
│        └─ fonts/                      сюда можно положить Manrope (опционально)
├─ build.gradle · settings.gradle · gradle.properties
├─ gradle/wrapper/gradle-wrapper.properties   (gradle 8.9; jar до-создаётся студией/CI)
└─ .github/workflows/build-apk.yml      сборка APK в облаке → артефакт app-debug.apk
```

## Закреплённые версии
- Android Gradle Plugin **8.5.2**, Kotlin **1.9.24**, Gradle **8.9**
- `compileSdk` / `targetSdk` **34**, `minSdk` **21** (покрывает практически все Android TV / Fire TV)
- JDK **17** для сборки

## Альтернатива на будущее
Если позже потребуется чисто нативный UI (без WebView) ради максимальной
производительности на очень слабых ТВ — экран реалистично переписать на
**Jetpack Compose for TV** по тем же DTO и токенам из ТЗ. Для текущей задачи
WebView-обёртка воспроизводит утверждённый дизайн 1:1 и сохраняет все анимации.
