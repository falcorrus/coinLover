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
- **Category Items:** Unified large **52px** icons across all themes. Frameless appearance (no borders or backgrounds) in Modern theme, standard borders in others. Uses `lucide-react` icons with subtle 20% opacity fills.
- **Typography:** Retained the professional **Inter** font for readability while using **Space Grotesk** for the splash screen brand identity.
- **4-Column Grid:** Optimized for mobile reachability and quick visual scanning of expenses.
- **Density:** Reduced vertical spacing between icons and labels (`gap-1`) for a tighter, high-information density layout.

---

## 5. Experience & Persistence Overhaul (April 2026)

### Decision: Activity-Based Category Hierarchy
**Context:** Flat category lists lead to UI clutter and fragmented analytics (e.g., separate categories for "School Misha" and "School Danya").
**Implementation:**
- **Hierarchy:** Moved to a "Category -> Tag" model. General areas (Home, Food, Transport, Kids) are main categories. Specifics (Names, types of services) are Tags.
- **Cleanup:** Eliminated duplicates and merged redundant categories (e.g., "Utilities" into "Home").

### Decision: iOS PWA "Ironclad" Persistence
**Context:** iOS Safari PWA containers often lose URL parameters and `localStorage` state on cold start, breaking personal base connections.
**Implementation:**
- **Path-based Routing:** Adopted `/s/[ID]` format. iOS preserves path segments in PWA manifests better than query strings.
- **Cookie Bridge:** Implemented a 1-year Cookie for SSID. PWA containers share cookies with the main Safari session, allowing the app to "remember" the user even if `localStorage` is wiped or isolated.

### Decision: Mint Theme (Neumorphism 2.0) Refinement
**Context:** The "Mint" theme needed better visual feedback for interactions and a more premium color palette.
**Implementation:**
- **Dynamic Highlights:** Switched from generic Amber to **Harvest Gold** (`#CA8A04`) for a more organic feel.
- **Target Logic:** Targets now scale to **1.2x** (consistent with Dark theme). Removed `translateY` and `inset` shadows during hover to avoid the "button being pressed" illusion, replacing it with a выпуклый (`outset`) volume and a soft copper glow.
- **Translucency:** Target backgrounds now use a **15% opacity copper tint** instead of solid colors, preserving icon visibility.

