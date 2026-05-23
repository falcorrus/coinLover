# 📖 CoinLover: Decisions Log & Troubleshooting

> [!NOTE]
> В данном логе зафиксированы ключевые архитектурные решения проекта, а также
> база готовых решений (Troubleshooting & Solutions) для сложных платформенных багов.

## Содержание
1. [[#📄 Раздел: DECISIONS_LOG.md|Журнал архитектурных решений]]
2. [[#📄 Раздел: SOLUTIONS.md|База решений критических багов (Troubleshooting)]]


---

## 📄 Раздел: Архив архитектурных решений

# Design & Architecture Decisions Log

This document records major technical and visual decisions made during the evolution of CoinLover.

## 1. Multi-User Architecture (March 2026)

### Decision: Master-Table Driven User Management
**Context:** Need to support multiple users with isolated Google Sheets without complex backend databases.
**Implementation:**
- **Master Table:** The admin's spreadsheet (sheet `Configs`) contains a `=== USERS ===` section with `Name` and `Spreadsheet ID`.
- **Dynamic Access:** Backend (`Code.gs`) accepts an optional `ssId` parameter. If provided, it opens that specific spreadsheet using `SpreadsheetApp.openById(ssId)`.
- **Automatic Initialization:** If a connected spreadsheet is empty, the backend automatically creates `Configs` and `Transactions` sheets with initial data (Account: "Наличные", Category: "Магазины").
- **Admin Access:** A "hidden" menu triggered by a **3-second long press** on the Menu icon allows the admin to switch between users loaded from the Master Table.
- **Client Access:** Users connect via personal links: `https://coin.reloto.ru/?ssId=YOUR_ID`. The app saves this ID and forces "Real Mode" (disabling Demo).

---

## 2. Smart Currency System (March 2026)

### Decision: Dynamic Category Currency Toggle
**Context:** Users often spend in local currency (e.g., RSD, BRL) but want to track budgets in a base currency (USD).
**Implementation:**
- **Live Local Symbol:** The "Local" currency is dynamically determined by the current selection in the Numpad (last used non-USD currency).
- **Subtle Mode Toggle:** A neutral toggle button in the Expenses header switches between `$` (USD) and `L` (Local).
- **Visual Feedback:** 
    - **USD Mode:** Standard grey text, format `-$1,234`.
    - **Local Mode:** The entire amount string uses the **accent color** (`var(--primary-color)`) and a full currency code prefix, format `BRL 1,234`.
- **Persistence:** The chosen mode is saved in `localStorage` per user.

---

## 3. Visual Language Refinement (March 2026)

### Decision: Frameless Category Grid
**Context:** Experimented with a fully frameless "Stitch" design, decided to return to classic layout but keep large categories.
**Implementation:**
- **Category Items:** Unified large **52px** icons across all themes. Frameless appearance (no borders or backgrounds) in Modern theme, standard borders in others. Uses `lucide-react` icons with subtle 20% opacity fills.
- **Typography:** Retained the professional **Inter** font for readability while using **Space Grotesk** for the splash screen brand identity.
- **4-Column Grid:** Optimized for mobile reachability and quick visual scanning of expenses.
- **Density:** Reduced vertical spacing between icons and labels (`gap-1`) for a tighter, high-information density layout.

---

## 5. Experience & Persistence Overhaul (April 2026)

### Decision: Activity-Based Category Hierarchy
**Context:** Flat category lists lead to UI clutter and fragmented analytics (e.g., separate categories for "School Misha" and "School Danya").
**Implementation:**
- **Hierarchy:** Moved to a "Category -> Tag" model. General areas (Home, Food, Transport, Kids) are main categories. Specifics (Names, types of services) are Tags.
- **Cleanup:** Eliminated duplicates and merged redundant categories (e.g., "Utilities" into "Home").

### Decision: iOS PWA "Ironclad" Persistence
**Context:** iOS Safari PWA containers often lose URL parameters and `localStorage` state on cold start, breaking personal base connections.
**Implementation:**
- **Path-based Routing:** Adopted `/s/[ID]` format. iOS preserves path segments in PWA manifests better than query strings.
- **Cookie Bridge:** Implemented a 1-year Cookie for SSID. PWA containers share cookies with the main Safari session, allowing the app to "remember" the user even if `localStorage` is wiped or isolated.

### Decision: Mint Theme (Neumorphism 2.0) Refinement
**Context:** The "Mint" theme needed better visual feedback for interactions and a more premium color palette.
**Implementation:**
- **Dynamic Highlights:** Switched from generic Amber to **Harvest Gold** (`#CA8A04`) for a more organic feel.
- **Target Logic:** Targets now scale to **1.2x** (consistent with Dark theme). Removed `translateY` and `inset` shadows during hover to avoid the "button being pressed" illusion, replacing it with a выпуклый (`outset`) volume and a soft copper glow.
- **Translucency:** Target backgrounds now use a **15% opacity copper tint** instead of solid colors, preserving icon visibility.

---

## 📄 Раздел: База решений критических багов (iOS PWA / Capacitor)

# Решения и архитектурные находки CoinLover

## 1. Решение проблемы PWA на iOS (Persistence)
**Проблема:** При добавлении сайта на экран «Домой» в iOS Safari создается изолированный контейнер, который часто теряет параметры URL (`?ssId=...`) и не всегда имеет доступ к `localStorage` основной сессии.
**Решение:**
- Внедрена маршрутизация через пути: `/s/[tableId]`. iOS лучше сохраняет путь в манифесте PWA.
- Внедрен **Cookie-мостик**: при заходе по ссылке ID записывается в Cookie на 1 год. Cookie надежнее передаются между Safari и PWA-контейнером.
- Логика инициализации в `useUsers.ts` проверяет: 1. URL path, 2. URL search, 3. LocalStorage, 4. Cookies.

## 2. Динамический центр диаграммы аналитики
**Решение:** Для улучшения UX в `AnalyticsModal.tsx` центральный текст круговой диаграммы (`Doughnut`) сделан динамическим.
- По умолчанию: «Всего» + общая сумма.
- При выборе сектора/элемента: Название категории (в её цвете) + сумма расхода по этой категории.

## 3. Реорганизация структуры категорий
**Принцип:** Уход от плоского списка к иерархии «Деятельность -> Детали».
- Было: «Школа Миша», «Учеба Юра» (отдельные категории).
- Стало: Категория «Дети» -> Теги «Миша», «Юра» и т.д.
- Это упростило главный экран и сделало аналитику по группам (Жилье, Еда, Дети) мгновенно доступной.

## 4. UI/UX: Тема Mint (Neumorphism 2.0)
**Особенности:**
- Вместо вдавленных теней (`inset`) при наведении (target) используется масштаб `1.2` и выпуклая тень с мягким свечением.
- Замена системного желтого на органический **Harvest Gold** (`#CA8A04`).
- Для таргетов используется полупрозрачная медная тонировка (`#924A2815`), что сохраняет видимость иконки и выглядит эстетично.

## 5. Умная навигация на лендинге
**Логика:** Кнопка "Demo" и CTA-кнопки на лендинге проверяют наличие `cl_active_table_id` в памяти. Если пользователь уже «привязан» к базе, его отправляют в приложение, а не в демо-режим.

## 6. Адаптация под Android (Capacitor)
**Проблемы:** 
1. «Челка» (notch) перекрывала хедер Numpad. 
2. CORS блокировал запросы к API с локального адреса телефона. 
3. Кнопка «Назад» закрывала все приложение вместо модальных окон.

**Решения:**
- **Safe Area:** Внедрена структура Overlay -> Wrapper -> Content. К последнему применен `padding-top: env(safe-area-inset-top)`. Это гарантирует, что фон подстилается под системную область, а контент выталкивается ниже.
- **CapacitorHttp:** Создана обертка `universalFetch`, которая на мобильных устройствах использует нативный HTTP-клиент Capacitor. Это обходит ограничения CORS браузера, позволяя приложению общаться с сервером напрямую.
- **Native Back Button:** Интегрирован плагин `@capacitor/app`. Добавлен слушатель `backButton`, который при наличии открытых модалок (проверка через `stackRef`) делает `history.back()`, закрывая окна по одному.
- **Auto-Provisioning:** В `useUsers.ts` добавлена логика `isNativePlatform`. Если приложение запущено на телефоне и ID таблицы не задан, оно автоматически инициализирует Master ID, обеспечивая бесшовный вход.

## 7. Оптимизация Splash Screen (Premium Launch Experience)
**Проблема:** Сплеш-экран исчезал слишком быстро и резко, создавая ощущение «дерганого» запуска и обнажая процесс подгрузки веб-интерфейса.
**Решение:**
- **Длительность:** Увеличен `SPLASH_SCREEN_DURATION` до 1500мс (в `settings.ts`). Это дает время на осознание бренда и стабилизацию WebView.
- **Двухэтапное скрытие:** 
    1. Через 1.5с включается `isSplashFading`.
    2. К контейнеру сплеша применяется CSS: `opacity-0 scale-110 duration-500`.
    3. Спустя еще 500мс (после завершения анимации) компонент полностью удаляется из DOM.
- **Native Sync:** Интегрирован `@capacitor/splash-screen`. Вызов `SplashScreen.hide()` происходит одновременно с началом React-анимации. Это устраняет «белые вспышки» и мерцание между системным загрузчиком и веб-кодом.
- **Центрирование:** Элементы сплеша переведены на `flex items-center justify-center`, что гарантирует идеальное положение логотипа на экранах с любыми пропорциями.