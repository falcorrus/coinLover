# 🏗 CoinLover: Системная архитектура

## 📱 Гибридное ядро (Capacitor + React)
CoinLover построен как высокопроизводительное гибридное приложение:
- **Frontend:** React 19, TypeScript, Vite.
- **Стилизация:** Tailwind CSS v4 + Vanilla CSS (Linear Style).
- **Мобильный слой:** Capacitor 8. Обеспечивает нативные мосты для:
    - **Passkey/Биометрия:** через `@simplewebauthn/browser`.
    - **Нативные API-вызовы:** `universalFetch` использует `CapacitorHttp` для обхода CORS.
    - **Безопасность UI:** Обработка `safe-area-inset` для "челок" и логика нативной кнопки "Назад".

## 🖥 Бэкенд и База данных
- **Прокси-сервер:** Node.js Express сервер, работающий на VPS (`server.reloto.ru`).
    - Служит защищенным мостом к Google Sheets API.
    - Обрабатывает аутентификацию, проверку подписки и логирование транзакций.
    - API Endpoint: `/api/sheets`.
- **База данных (Google Таблицы):** 
    - **Мастер-таблица:** Хранит метаданные пользователей и статус подписки.
    - **Таблицы пользователей:** Индивидуальные таблицы для данных пользователей (Configs и Transactions).
    - **Сервисный аккаунт:** Все операции выполняются через `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`.

## 🚀 Деплой (Развертывание)
- **Инструмент:** скрипт `./deploy.sh`.
- **Окружения:** 
    - **Main:** `coinlover.ru` (Порт 8010, ветка `main`).
    - **Dev:** `coin.reloto.ru` (Порт 8011, ветка `preview`).
- **Процесс:** Vite Build -> Push в GitHub -> SSH на VPS -> Docker Compose Rebuild.
