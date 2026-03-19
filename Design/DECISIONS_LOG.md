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
- **Category Items:** Large 48px icons without borders or backgrounds. Uses `lucide-react` icons with subtle 20% opacity fills.
- **Typography:** Retained the professional **Inter** font for readability while using **Space Grotesk** for the splash screen brand identity.
- **4-Column Grid:** Optimized for mobile reachability and quick visual scanning of expenses.

---

## 4. Technical Debt & Scaling (March 2026)

### Decision: Strategic Decomposition
**Context:** `App.tsx` and `useFinance.ts` grew into "God" modules (500+ lines, high complexity).
**Implementation:**
- **Hook Decomposition:** Split logic into `useSync`, `useTransactions`, `useEntities`, and `useAppDnD`.
- **UI Isolation:** Created `ModalManager.tsx` to handle 10+ modal states, keeping `App.tsx` focused on the main layout structure.
- **Strict Typing:** Eliminated `any` in favor of strict TypeScript interfaces for all financial entities and state payloads.
- **Testing:** Introduced **Vitest** for critical business logic (e.g., `RatesService` conversion math).
