# 📱 CoinLover: Мобильное приложение и APK

## 📦 Процесс сборки
1. **Скрипт:** `./build_and_send.sh`.
2. **Шаги:**
    - `pnpm run build` (Веб).
    - `npx cap copy android`.
    - `./gradlew assembleDebug` (Android).
    - Результат: `apk/coinlover-debug.apk`.
3. **Дистрибуция:** Скрипт автоматически отправляет билд в Telegram-бот проекта.

## 🌐 Синхронизация лендинга
- Лендинг (`index.html`) ссылается на `/download/coinlover.apk`.
- **ОБЯЗАТЕЛЬНО ВРУЧНУЮ КОПИРОВАТЬ** после успешной сборки:
  `cp apk/coinlover-debug.apk public/download/coinlover.apk`

## 🛠 Нативные возможности
- **Биометрия:** Регистрация и вход через Passkey.
- **Тактильная отдача:** Вибрация при транзакциях и смене режимов.
- **Deep Links:** Поддержка `coinlover://` и роутинга на основе путей.
