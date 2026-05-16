---
author: gemini CLI
tags: [design, theme, coinlover, organic-mint]
---

# Design Concept: CoinLover "Organic Mint" Theme

Третья тема фокусируется на **эмоциональном спокойствии** и **визуальном росте**. Она заменяет агрессивный блеск золота на мягкость меди и природные оттенки, что идеально сочетается с логотипом «Сердечная Монета».

## 🎨 Palette (HEX Codes)

### 1. Backgrounds & Surfaces
* **Primary Background:** `#E8F0ED` (Светлый шалфей, база для интерфейса)
* **Secondary Surface:** `#FFFFFF` (Чистый белый для карточек с легкой тенью)
* **Dark Mode Variant:** `#1B2421` (Глубокий хвойный для любителей темных, но мягких тем)

### 2. Category & Icon Colors
* **Transport (Coral):** `#EF5350`
* **Apartment (Cyan):** `#4DD0E1`
* **Sport (Orange):** `#FFB74D`
* **Cafe (Green):** `#81C784`
* **Tests (Pink):** `#F06292`

### 3. Functional Colors
* **Success (Income):** `#66BB6A` (Травяной зеленый)
* **Danger (Expense):** `#EF5350` (Коралловый красный)
* **Neutral Text:** `#37474F` (Темно-серый с синеватым подтоном)
* **Status Chip BG:** `#F8F9F0` (Очень светлый пастельный желтый/зеленый)
* **Status Chip Text:** `#C0A040` (Золотистая охра)

---

## 💎 Visual Style: Neumorphism 2.0 (Soft UI)
В отличие от Glassmorphism в темной теме, здесь мы используем **Soft UI**:
* **Shapes:**
    * **Action Buttons:** Идеально круглые (`borderRadius: 50%`) белые контейнеры с мягкими тенями для "+" и "Menu".
    * **Cards/Wallets:** Крупные карточки кошельков (`borderRadius: 32`) с центрированными иконками.
* **Shadows:** Двойные мягкие тени.
    * *Light Shadow:* `-5px -5px 10px #FFFFFF`
    * *Dark Shadow:* `5px 5px 10px #D1D9D6`
* **Iconography:**
    * **Style:** Line-art с толстыми линиями (approx. 2.5px weight).
    * **Details:** Закругленные края (round stroke caps) и мягкие формы. Категории используют цветные иконки, кошельки — контурные коричневатые/темные.

---

## 🖋 Typography
* **Main Headings ("TOTAL BALANCE"):** Serif font (например, Inter Tight или Garamond style), All-Caps, увеличенный межбуквенный интервал (letter-spacing: 0.1em).
* **Section Labels ("КОШЕЛЬКИ"):** Sans-serif, Bold, All-Caps, цвет `#37474F` с прозрачностью 60%.
* **Amounts & Subtitles:** Sans-serif, Regular для валют и Medium для цифр.

---

## 🕹 UX & Animations
Поскольку главная фишка CoinLover — перетаскивание, в этой теме оно должно ощущаться иначе:

1.  **Status Feedback:** Чип под балансом ("-din 18 672 в этом месяце") служит быстрым индикатором состояния бюджета.
2.  **Haptic Feedback:** При захвате монетки — короткий мягкий виброотклик.
3.  **Magnetic Effect:** Когда монетка подносится к категории, та плавно «прогибается» внутри (эффект нажатия).
4.  **Particle Effect:** При «падении» монетки в категорию — мимолетные искры медного цвета.

---

## 🛠 Implementation Details (React/Web)
* **Primary:** `#D27D56` (Copper - Main Accent for Coins)
* **Secondary:** `#66BB6A` (Mint Green)
* **Background:** `#E8F0ED`
* **Surface:** `#FFFFFF`

> **Note:** Для реализации эффекта «меди» используй **Linear Gradient** на объекте монетки: `from: #D27D56 to: #E9B298` под углом 45°.
