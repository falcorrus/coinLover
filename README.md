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
  CoinLover — это приложение для учета финансов с интерфейсом Drag & Drop. Основная механика:
  пользователь перетаскивает иконку счета на иконку категории, после чего открывается цифровая
  клавиатура (Numpad) для ввода суммы транзакции.


  Текущее состояние `App.tsx`:
   - Используется @dnd-kit/core для реализации перетаскивания.
   - Есть счета (Cash, Card, Savings) и категории (Food, Transit, Cafe и др.).
   - Реализован Numpad (Bottom Sheet) для ввода суммы.
   - При сохранении транзакции баланс счета уменьшается.
   - Данные пока не сохраняются персистентно (только в стейте React)
