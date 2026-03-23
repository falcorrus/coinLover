# Stitch Export: CoinLover "Organic Mint" Theme

Use this structured prompt to implement or refine the "Organic Mint" theme in Stitch.

---

**ONE-LINE DESCRIPTION:**
A calm, biophilic personal finance interface focusing on emotional growth, copper accents, and a "Soft UI" (Neumorphism 2.0) aesthetic.

**DESIGN SYSTEM (REQUIRED):**
- **Platform:** Mobile-first Web App
- **Theme:** Light, Organic, Calm
- **Primary Background:** `#E8F0ED` (Light Sage)
- **Surface (Cards):** `#FFFFFF` (Pure White)
- **Primary Accent (Copper Coin):** Linear Gradient `135deg` from `#D27D56` to `#E9B298`
- **Text Primary:** `#37474F` (Deep Blue-Grey)
- **Text Secondary/Muted:** `#78909C`
- **Success (Income):** `#66BB6A` (Grass Green)
- **Danger (Expense):** `#EF5350` (Coral Red)
- **Typography:**
  - Headings: **Lora** (Serif, elegant, calm)
  - Body: **Raleway** (Sans-serif, clean, modern)
- **Border Radius:** `24px` for all main containers and cards.
- **Visual Style (Neumorphism 2.0):**
  - Use "Soft UI" instead of glassmorphism.
  - Light Shadow: `-5px -5px 10px #FFFFFF`
  - Dark Shadow: `5px 5px 10px #D1D9D6`
  - Cards should appear slightly "puffed" out from the background.

**COMPONENTS & INTERACTIONS:**
1. **The Copper Coin (Draggable):**
   - Perfectly circular.
   - High-end copper gradient with a subtle inner glow.
   - When grabbed: Scale down to `0.9`, add a deeper shadow for elevation.
2. **Category Cards:**
   - Square-ish with `24px` radius.
   - Subtle "Soft UI" elevation.
   - **Magnetic Effect (Active State):** When a coin is dragged over, the card should "press in" (inset shadow) to confirm target selection:
     - `inset 2px 2px 5px #D1D9D6`
     - `inset -2px -2px 5px #FFFFFF`
3. **App Header:**
   - Centered "Total Balance" in Lora.
   - Large amount display with prominent copper currency symbol.

**UX GOALS:**
- The interface should feel "alive" and responsive to touch.
- Every interaction (drag, drop, click) must feel soft and natural.
- Avoid harsh borders; use shadows to define hierarchy.

---
💡 **Tip:** Use this file as a reference for Stitch to ensure all generated screens follow the same "Organic Mint" visual language.
