# Onboarding Feature Showcase

The goal is to implement a visually stunning onboarding flow for new users that highlights 3-5 main capabilities of the CoinLover app before they proceed to the technical setup (currencies, templates).

## User Review Required

> [!IMPORTANT]
> The onboarding will be shown to all new users (where `accounts.length === 0`).
> It will be a series of interactive or highly visual slides in the "Linear Style" (Dark, Premium, Inter font).

## Proposed Changes

### [Frontend Components]

#### [NEW] [FeatureShowcase.tsx](file:///Users/eugene/MyProjects/CoinLover/src/components/FeatureShowcase.tsx)
Создание нового компонента для визуальной демонстрации возможностей.
- **Слайд 1: Запись расхода**. Анимация перетаскивания монеты на категорию.
  - *Текст:* "Записывай расходы жестом. Просто перетащи монету на категорию."
- **Слайд 2: Сортировка иконок**. Зажимаем иконку на 1 секунду и перетаскиваем.
  - *Текст:* "Меняй порядок иконок. Зажми любую иконку на 1 секунду и перетащи в нужное место."
- **Слайд 3: Редактирование**. Зажимаем иконку на 2 секунды для открытия редактора.
  - *Текст:* "Настраивай под себя. Зажми иконку на 2 секунды, чтобы изменить название, цвет или лимит."
- **Слайд 4: Быстрый доступ**. Иконки на панели «Расходы».
  - *Текст:* "Всё под рукой. Быстрый доступ к аналитике, календарю и созданию категорий прямо на панели расходов."

#### [MODIFY] [OnboardingModal.tsx](file:///Users/eugene/MyProjects/CoinLover/src/components/OnboardingModal.tsx)
- Интеграция `FeatureShowcase` как первого шага (Step 0).
- Переход к технической настройке (валюты, шаблоны) только после просмотра преимуществ.

### [Assets & Styling]

#### [MODIFY] [index.css](file:///Users/eugene/MyProjects/CoinLover/src/index.css)
- Add necessary animations for the showcase (shimmers, glares, smooth transitions).
- Ensure "Linear Style" tokens are correctly applied.

## Verification Plan

### Manual Verification
- Reset `localStorage` (`cl_onboarding_completed`) and clear the database (or use a test table).
- Verify that the showcase appears first.
- Check animations and responsiveness on different screen sizes.
- Ensure the flow transitions smoothly to the setup wizard.
