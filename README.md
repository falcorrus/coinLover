<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/15577583-bfd2-424e-a4b9-4c4ed3f59667

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`





# О проекте:
  CoinLover — это современное приложение для учета личных финансов с инновационным интерфейсом Drag & Drop в стиле Glassmorphism.

  ### Ключевые возможности:
  - **Умное перетаскивание:** Система автоматически различает сортировку счетов (движение вбок) и финансовые операции (движение вниз).
  - **Трансферы:** Мгновенный перевод между кошельками простым перетаскиванием одного на другой.
  - **Калькулятор (Numpad):** Встроенный калькулятор с поддержкой тегов и быстрым выбором даты (Сегодня/Вчера).
  - **Синхронизация:** Автоматическая отправка данных в Google Таблицы в фоновом режиме.
  - **Persistence:** Данные надежно хранятся в `localStorage` вашего браузера.

  ### Управление кошельками:
  1. **Клик/Удержание (0.8с):** Редактирование счета.
  2. **Сдвиг в сторону:** Изменение порядка кошельков (сортировка).
  3. **Сдвиг вниз:** Перевод другому кошельку или расход в категорию.

  Текущее состояние проекта:
   - Полностью рабочий механизм DnD на базе `@dnd-kit`.
   - Интеграция с Google Sheets (Push-only).
   - Поддержка доходов, расходов и переводов.
   - Адаптивный дизайн (Bento Grid) для мобильных устройств.
