# Checklist: Внедрение Passkey в CoinLover

- `[x]` Шаг 1: Добавление зависимостей `@simplewebauthn/browser` и `@simplewebauthn/server` в `package.json`
- `[x]` Шаг 2: Реализация вспомогательных утилит для работы с Passkey на бэкенде (криптография, генерация challenge)
- `[x]` Шаг 3: Добавление эндпоинтов аутентификации в бэкенд (`api/sheets.ts` / `server.ts`)
  - `[x]` `GET /api/auth/register-options`
  - `[x]` `POST /api/auth/register-verify`
  - `[x]` `GET /api/auth/login-options`
  - `[x]` `POST /api/auth/login-verify`
- `[x]` Шаг 4: Расширение парсинга и сохранения конфигурации Google Sheets (`src/services/googleSheets.ts`)
- `[x]` Шаг 5: Реализация клиентской логики регистрации ключа в настройках профиля (`src/components/Settings.tsx`)
- `[x]` Шаг 6: Реализация кнопки входа через биометрию на Landing-экране (`src/components/LandingPage.tsx`)
- `[x]` Шаг 7: Верификация, сборка и деплой
  - `[x]` Локальный запуск линтера (`npm run lint`)
  - `[x]` Локальная сборка проекта (`npm run build`)
  - `[x]` Полный деплой на сервер (`./deploy.sh main`)
