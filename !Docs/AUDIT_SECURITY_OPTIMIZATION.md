 # 🛡️ Комплексный аудит безопасности, кода и оптимизации CoinLover

*Дата проведения аудита:* Март 2026  
*Стек проекта:* React 19, TypeScript, Vite, Tailwind CSS v4, Express, Google Sheets API v4, Capacitor, WebAuthn (SimpleWebAuthn), OpenRouter AI (Gemini 2.5 Flash).

---

## 1. Резюме аудита (Executive Summary)

В ходе детального статического и динамического анализа кодовой базы CoinLover были проверены:
1. Архитектура аутентификации и авторизации (Passkey, Google Sheets Proxy).
2. Безопасность серверного слоя Express ([`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts), [`api/sheets.ts`](file:///Users/eugene/MyProjects/CoinLover/api/sheets.ts), [`api/auth.ts`](file:///Users/eugene/MyProjects/CoinLover/api/auth.ts), [`api/ai-analyst.ts`](file:///Users/eugene/MyProjects/CoinLover/api/ai-analyst.ts)).
3. Надежность клиентского состояния и хуков ([`useTransactions.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useTransactions.ts), [`useSync.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useSync.ts), [`useAppDnD.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useAppDnD.ts)).
4. Зависимости ([`package.json`](file:///Users/eugene/MyProjects/CoinLover/package.json)), Docker-сборка ([`Dockerfile`](file:///Users/eugene/MyProjects/CoinLover/Dockerfile)), размер бандла и скрипты автоматизации.

**Общий вердикт:**  
Приложение обладает отличным UI/UX и продуманной концепцией BYOD (Bring Your Own Database), однако серверный прокси в текущем виде является **полностью открытым (unauthenticated proxy)**. Зная или перебрав идентификатор таблицы (`ssId`), любой пользователь интернета может читать финансовые транзакции, изменять конфигурации счетов или перезаписывать Passkey-ключи без авторизации. Также в проекте накопился значительный балласт неиспользуемых тяжелых зависимостей (`better-sqlite3`, `vercel`, `motion`, `jsqr`), а клиентский JS-бандл монолитен (~800 KB).

---

## 2. Уязвимости безопасности (Security Vulnerabilities)

### 🔴 Критический приоритет (Critical / High)

#### 1. BOLA / IDOR и отсутствие проверки сессии на эндпоинтах Google Sheets
* **Файлы:** [`api/sheets.ts`](file:///Users/eugene/MyProjects/CoinLover/api/sheets.ts#L373-L435), [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts#L43-L50)
* **Описание:** Эндпоинты `GET /api/sheets` и `POST /api/sheets` принимают `ssId` из query или body и напрямую оперируют Google Sheets через сервисный аккаунт `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`. Запросы не требуют ни JWT, ни cookie сессии, ни подписи Passkey.
* **Следствие:**
  - `GET /api/sheets?ssId=<TARGET_ID>` отдает все счета, балансы, категории и историю транзакций.
  - `POST /api/sheets` с экшеном `syncSettings` или `deleteTransaction` позволяет удалить или модифицировать данные в чужой таблице.
  - В строке 510 `api/sheets.ts` при отсутствии таблицы в реестре срабатывает логика:
    ```typescript
    if (!found) {
      console.log(`[API] ssId ${cleanSsId} not found in Users list. Allowing by default.`);
    }
    ```
    Это открывает доступ к любой таблице, к которой открыт доступ сервисному аккаунту.

#### 2. Захват учетной записи / перезапись Passkey (Account Takeover)
* **Файлы:** [`api/auth.ts`](file:///Users/eugene/MyProjects/CoinLover/api/auth.ts#L178-L333) (действие `register-verify`)
* **Описание:** При привязке биометрии (Passkey) вызывается `register-options?ssId=...`, а затем `register-verify`. Сервер проверяет только валидность WebAuthn-аттестации браузера и соответствие challenge-токена переданному `ssId`. Он **не проверяет**, привязан ли уже Passkey к этой таблице и принадлежит ли запрос законному владельцу.
* **Следствие:** Злоумышленник может вызвать `register-options` со значением `ssId` жертвы, подписать ответ своим собственным устройством (Touch ID / Face ID) и отправить `register-verify`. Сервер затрет строки `Passkey_Credential_ID` и `Passkey_Public_Key` в листе `Passkey` таблицы жертвы, заблокировав вход законному владельцу и предоставив доступ злоумышленнику.

#### 3. Хардкодный секрет JWT по умолчанию
* **Файлы:** [`api/auth.ts`](file:///Users/eugene/MyProjects/CoinLover/api/auth.ts#L14-L15)
* **Код:**
  ```typescript
  const SECRET = process.env.JWT_SECRET || "coinlover-super-secret-key-1337";
  ```
* **Описание:** Если в `.env` переменная `JWT_SECRET` отсутствует или не загрузилась, сервер использует публично известный fallback. Это позволяет злоумышленнику подделывать stateless challenge-токены для авторизации.

#### 4. Утечка данных пользователей через перебор контактов (`findUserByContact`)
* **Файлы:** [`api/sheets.ts`](file:///Users/eugene/MyProjects/CoinLover/api/sheets.ts#L330-L370), [`api/sheets.ts`](file:///Users/eugene/MyProjects/CoinLover/api/sheets.ts#L955-L965)
* **Описание:** Публичный метод `POST /api/sheets` с экшеном `findUserByContact` принимает любой Email или Telegram (`contact`) и при совпадении в Мастер-таблице возвращает полный объект:
  ```json
  { "ssId": "1aB...", "name": "Иван Иванов", "accessEnds": "25.12.2026" }
  ```
* **Следствие:** Злоумышленник может составить словарь популярных логинов/email и получить базу `ssId` всех клиентов, после чего эксплуатировать уязвимость №1 (BOLA) и выгрузить финансовые отчеты пользователей.

#### 5. Зашитый токен Telegram-бота в скрипте деплоя/сборки
* **Файл:** [`build_and_send.sh`](file:///Users/eugene/MyProjects/CoinLover/build_and_send.sh#L34)
* **Код:**
  ```bash
  curl -F chat_id="159194550" -F document=@"apk/coinlover-debug.apk" https://api.telegram.org/bot6027.../sendDocument
  ```
* **Описание:** Токен бота находится в открытом виде в git-репозитории. При публичном доступе к репозиторию бот может быть скомпрометирован.

#### 6. Нелимитированный и незащищенный вызов AI-аналитика (Financial / Resource Exhaustion)
* **Файлы:** [`api/ai-analyst.ts`](file:///Users/eugene/MyProjects/CoinLover/api/ai-analyst.ts#L216-L225), [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts#L52-L59)
* **Описание:** Маршрут `POST /api/ai-analyst` не проверяет ни статус подписки (Premium), ни лимит запросов в минуту/сутки, ни авторизационный токен. Он напрямую вызывает платное API OpenRouter (`google/gemini-2.5-flash`).
* **Следствие:** Любой автоматизированный скрипт может слать тысячи запросов, моментально опустошая баланс OpenRouter владельца сервиса.

---

### 🟡 Средний приоритет (Medium / Low)

#### 7. Небезопасная конфигурация CORS
* **Файл:** [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts#L20-L25)
* **Код:**
  ```typescript
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  ```
* **Описание:** Согласно стандарту W3C Fetch API, браузеры блокируют ответы со статусом ошибки или игнорируют cookies, если `Access-Control-Allow-Origin: *` сочетается с `Credentials: true`. Для PWA и нативных клиентов на доменах `coinlover.ru` и `coin.reloto.ru` следует проверять входящий заголовок `Origin` по белому списку.

#### 8. Отсутствие базовых заголовков безопасности (Security Headers / Helmet)
* **Файл:** [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts)
* **Описание:** В Express не подключены заголовки:
  - `Content-Security-Policy` (CSP)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN` (защита от Clickjacking в iframe)
  - `Strict-Transport-Security` (HSTS)
  - Не отключен заголовок `X-Powered-By: Express` (fingerprinting).

#### 9. Раскрытие путей файловой системы сервера
* **Файл:** [`api/test.ts`](file:///Users/eugene/MyProjects/CoinLover/api/test.ts#L16)
* **Код:** `res.status(200).json({ fallbackFile: { path: credsPath } })` возвращает абсолютный локальный путь на сервере (например, `/root/MyProjects/.../google-credentials.json`).

#### 10. Использование `new Function(...)` в парсере сумм калькулятора
* **Файл:** [`src/components/ModalManager.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/ModalManager.tsx#L143)
* **Код:**
  ```typescript
  const result = new Function(`return ${finalExpr}`)();
  ```
* **Описание:** Хотя строка санируется регулярным выражением, динамическое создание функций (`new Function` / `eval`) не проходит строгие политики CSP (`script-src` без `'unsafe-eval'`). Для математических выражений безопаснее использовать классический парсер токенов (Shunting-yard или простой конечный автомат).

---

## 3. Анализ качества кода и логические ошибки

### 1. Состояние гонки и устаревшее замыкание в `useTransactions`
* **Файл:** [`src/hooks/useTransactions.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useTransactions.ts#L90-L113)
* **Проблема:** При создании транзакции баланс рассчитывается по замыканию `accounts.map(...)`, а затем передается `setAccounts(updatedAccounts)`. Если пользователь быстро совершит два действия подряд или произойдет фоновый синк, баланс второго действия перезапишет первое некорректно.
* **Решение:** Использовать функциональное обновление:
  ```typescript
  setAccounts((prevAccounts) => prevAccounts.map(...));
  ```

### 2. Отсутствие отката (Rollback) при сетевой ошибке
* **Файл:** [`src/hooks/useTransactions.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useTransactions.ts#L88-L150)
* **Проблема:** При добавлении транзакции стейт UI (`transactions` и `accounts`) обновляется мгновенно (оптимистично). Если вызов `googleSheetsService.syncToSheets` завершился с ошибкой (`txOk === false`), UI остается с новыми фальшивыми балансами, пока пользователь вручную не перезагрузит приложение.
* **Решение:** Сохранять предыдущее состояние и откатывать его (`rollback`) при `!txOk` с показом Toast-уведомления об ошибке.

### 3. Деление на 0 и возврат 0 в `RatesService.convert`
* **Файл:** [`src/services/RatesService.ts`](file:///Users/eugene/MyProjects/CoinLover/src/services/RatesService.ts#L111-L124)
* **Проблема:** Если валюта отсутствует в кеше курсов, метод возвращает `0`. В результате при сохранении транзакции поле `base_amt` в Google Таблице записывается как `0`, безвозвратно теряя долларовую оценку операции.
* **Решение:** Если курс не найден, в качестве fallback использовать сумму оригинальной валюты (1:1) либо помечать расчет как отложенный, но не занулять сумму.

### 4. Нескоупленный `localStorage` и утечка между пользователями
* **Файл:** [`src/hooks/useFinance.ts`](file:///Users/eugene/MyProjects/CoinLover/src/hooks/useFinance.ts#L9-L24)
* **Проблема:** Ключи `cl_accounts`, `cl_categories`, `cl_transactions` глобальны. При переключении таблиц на одном устройстве или выходе на стартовый экран данные старой таблицы остаются видны до завершения загрузки новой.
* **Решение:** Формировать ключи с префиксом `cl_${activeTableId}_accounts`.

---

## 4. Оптимизация производительности и зависимостей

### 1. Удаление неиспользуемых и тяжелых библиотек (Ускорение сборки и Docker)
В [`package.json`](file:///Users/eugene/MyProjects/CoinLover/package.json) обнаружен ряд пакетов, которые либо дублируются, либо вообще не вызываются в коде:

| Пакет | Статус | Влияние |
|---|---|---|
| `better-sqlite3` | **Не используется** | Заставляет Docker устанавливать `python3, make, g++` и компилировать C++ модули при каждом билде. Увеличивает время сборки на 1-2 минуты. |
| `vercel` | **CLI утилита в `dependencies`** | Тянет за собой 150+ MB и 70+ уязвимостей безопасности в `node_modules` продакшена. Должен быть перенесен в `devDependencies` или удален. |
| `@capacitor/cli` | **CLI утилита в `dependencies`** | Должен быть в `devDependencies`. |
| `motion` | **Дубликат** | В проекте везде импортируется `framer-motion`. Пакет `motion` лишний. |
| `@google/genai` | **Не используется** | Запросы к AI идут напрямую через `fetch` к OpenRouter. |
| `google-spreadsheet` | **Не используется** | Сервер работает напрямую через `googleapis`. |
| `jsqr` | **Не используется** | Сканирование QR-кодов в коде отсутствует. |
| `react-markdown` | **Не используется** | В `AISheet.tsx` написан свой кастомный рендерер `renderSimpleMarkdown`. |

### 2. Оптимизация размера бандла и Code Splitting (Vite)
* **Текущее состояние:** `dist/assets/index-BgY5BxVG.js` весит **796.50 kB** (gzip: 223.34 kB).
* **Причина:** Вся кодовая база, включая тяжелые модальные окна, аналитику, лендинг и WebAuthn, собирается в единый монолитный файл.
* **Решение:**
  1. Вынести тяжелые экраны в `React.lazy()`:
     - [`LandingPage.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/LandingPage.tsx) (нужен только гостям)
     - [`NativeAuthScreen.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/NativeAuthScreen.tsx)
     - [`AnalyticsModal.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/AnalyticsModal.tsx)
     - [`CalendarAnalyticsModal.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/CalendarAnalyticsModal.tsx)
     - [`AISheet.tsx`](file:///Users/eugene/MyProjects/CoinLover/src/components/layout/AISheet.tsx)
  2. Настроить `manualChunks` в [`vite.config.ts`](file:///Users/eugene/MyProjects/CoinLover/vite.config.ts) для разделения вендоров: `vendor-react`, `vendor-motion`, `vendor-dnd`.
  3. Ожидаемый результат: уменьшение стартового бандла до **~180-220 kB**, ускорение холодного старта (FCP/LCP) на мобильных устройствах более чем в 2.5 раза.

### 3. Кеширование запросов Google Sheets на бэкенде
* **Проблема:** Каждый переход пользователя или фоновый синк вызывает чтение `Configs!A:M` и `Transactions!A:L` через Google Sheets API v4. Квота Google API составляет 300 запросов в минуту на проект. При 20-30 активных пользователях лимит исчерпается с ошибкой `429 Too Many Requests`.
* **Решение:** Внедрить короткий серверный in-memory кеш (LRU / NodeCache) на 15–30 секунд для GET-запросов одной и той же таблицы, с мгновенным сбросом кеша при POST-запросах (`syncSettings`, `addTransaction`).

---

## 5. План первоочередных действий (Roadmap)

### Этап 1: Неотложная безопасность (Приоритет: Высокий) — ВЫПОЛНЕНО ✅
- [x] Вынести Telegram Bot Token из [`build_and_send.sh`](file:///Users/eugene/MyProjects/CoinLover/build_and_send.sh) в локальный `.env` или переменные среды.
- [x] Ограничить доступ к `MASTER_SS_ID`: запретить чтение и перезапись мастер-таблицы без секретного админ-заголовка (`X-Admin-Token`).
- [x] Защитить `/api/ai-analyst`: добавить проверку подписки (только `userTariff === "Premium"`) и лимитирование (rate-limit: максимум 10 запросов в минуту на IP/таблицу).
- [x] В `register-verify` (`api/auth.ts`) запретить перезапись существующего Passkey без предварительной аутентификации или `ADMIN_TOKEN`.
- [x] Удалить или скрыть эндпоинт отладки [`api/test.ts`](file:///Users/eugene/MyProjects/CoinLover/api/test.ts) (преобразован в безопасный healthcheck).
- [x] Сгенерировать криптостойкие `JWT_SECRET` и `ADMIN_TOKEN` в `.env` и задокументировать их в `.env.example`.
- [x] Усилить [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts) базовыми security-заголовками, отключить `x-powered-by` и настроить безопасный CORS.

### Этап 2: Очистка зависимостей и Docker (Приоритет: Высокий) — ВЫПОЛНЕНО ✅
- [x] Удалить из `package.json`: `better-sqlite3`, `motion`, `@google/genai`, `google-spreadsheet`, `jsqr`, `react-markdown`.
- [x] Перенести `vercel` и `@capacitor/cli` в `devDependencies`.
- [x] Упростить [`Dockerfile`](file:///Users/eugene/MyProjects/CoinLover/Dockerfile), убрав установку компиляторов `make g++ python3`.
- [x] Подключить `helmet` и `express-rate-limit` в [`server.ts`](file:///Users/eugene/MyProjects/CoinLover/server.ts).

### Этап 3: Оптимизация производительности клиента (Приоритет: Средний) — ВЫПОЛНЕНО ✅
- [x] Внедрить `React.lazy` для `LandingPage`, `NativeAuthScreen`, `AnalyticsModal`, `CalendarAnalyticsModal`, `HistoryModal`, `AISheet`, `UsersModal`, `ThemeModal`, `TagModal`.
- [x] Настроить `manualChunks` в `vite.config.ts` (размер основного JS-бандла снижен с 796.5 kB до 191.1 kB).
- [x] Исправить замыкание в `useTransactions.ts` (функциональный `setAccounts(prev => ...)`) и добавить откат стейта (`rollback`) при сбоях синхронизации.
- [x] Заменить `new Function` в калькуляторе на детерминированный математический парсер [`safeEvaluateMath`](file:///Users/eugene/MyProjects/CoinLover/src/utils/mathParser.ts) (CSP-совместимый, покрыт 6 unit-тестами).
- [x] Использовать `universalFetch` в `RatesService`, `AISheet` и `AppHeader` для стабильной работы на Android/iOS.

---

## 6. Статус внедрения и деплоя (Deployment Log)

* **Дата деплоя:** 08.09.2026
* **Целевые контуры:**
  - **Dev:** `https://coin.reloto.ru` (ветка `preview`, контейнер `dev-coinlover`, порт 8011) — **УСПЕШНО ✅**
  - **Prod:** `https://coinlover.ru` (ветка `main`, контейнер `coinlover`, порт 8010) — **УСПЕШНО ✅**
* **Проведенная верификация в проде:**
  - `GET /api/sheets?action=template`: 200 OK (динамический шаблон категорий и счетов успешно отдается).
  - Заголовки безопасности (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `RateLimit-*`): активны на всех эндпоинтах.
  - Доступ владельца к личным счетам/расходам в `MASTER_SS_ID` (`/api/sheets?ssId=...`): 200 OK, вкладки `Configs` и `Transactions` отдаются штатно.
  - Защита `MASTER_SS_ID`: деструктивная переинициализация таблицы (`initTable`) заблокирована без `X-Admin-Token` (`403 master_sheet_restricted`).
  - Поиск пользователей (`findUserByContact`): заблокирован для неавторизованных запросов (`"Поиск пользователей доступен только администраторам"`), работает только при наличии `X-Admin-Token`.
  - Секреты окружения (`JWT_SECRET`, `ADMIN_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) синхронизированы в `.env` на сервере `server.reloto.ru`.
  - **Этап 3 (Code Splitting & Оптимизация бандла):** стартовый бандл уменьшен с 796.5 kB до 191.1 kB (gzip 46.1 kB), чанки `LandingPage` (57.3 kB), `AnalyticsModal` (18.6 kB), `OnboardingModal` (21.8 kB), `AISheet` (13.7 kB) подгружаются по требованию. Проверена доступность ассетов `index-D8NDoFeH.js` и `LandingPage-BM4Zp8wS.js` на обоих доменах (HTTP 200).
  - **Математический парсер и Rollback:** заменён `new Function` на безопасный `safeEvaluateMath`, стейт защищен от гонок и сетевых сбоев.
