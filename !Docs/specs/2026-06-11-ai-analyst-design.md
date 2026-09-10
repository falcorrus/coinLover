---
type: "entity"
category: "project"
project: "coinlover"
---
# Design Spec: AI Analyst (In-App Assistant)

**Date:** 2026-06-11
**Status:** Draft
**Feature:** AI-Powered Financial Analyst with Voice Interaction

---

## 1. Objective
Transform CoinLover from a manual tracker into an intelligent financial assistant. Provide users with instant insights into their spending habits through a natural language chat interface (text & voice) integrated seamlessly into the existing Glassmorphism UI.

---

## 2. User Experience (UX)

### A. Entry Point & Navigation
- **Primary Trigger:** A new search bar with a microphone icon `🎤` added to the bottom of the existing FAB menu (styled to match the current theme).
- **Secondary Trigger:** **Long-press on the FAB** immediately activates Voice Recording mode.
- **Activation:** Tapping the search bar or the mic icon opens the **AI Analyst Sheet**.
- **Header Transformation:** 
  - Current theme icons (`Sun`, `Moon`, `Sparkle`) are hidden.
  - New functional icons appear in their place: `📋` (Feed), `📅` (Calendar), `📊` (Analytics).
  - Transition: Smooth `framer-motion` cross-fade.

### B. AI Dual-Mode (Analysis & Entry)
1. **Financial Analysis:** Answer questions about spending (last 30-90 days).
2. **Natural Language Entry:** 
   - Example: "из кошелька потратил 200 песо в магазине".
   - **Wallet Disambiguation:** If the AI cannot uniquely identify the wallet, it presents 2-3 most used options for the user to tap.
   - **Instant Save:** Selecting the wallet immediately saves the "Expense" transaction.

### C. Voice & Visualization
- **Input:** Native Speech-to-Text via Capacitor / Web Speech API.
- **Visualization:** A real-time pulsating purple/neon wave (Canvas-based) appears over the input area while the user is speaking.
- **Tactile Feedback:** Subtle haptic vibration on start/stop of recording.

---

## 3. Technical Architecture

### A. AI Integration (OpenRouter)
- **Model:** `google/gemini-2.5-flash-lite` (via OpenRouter).
- **Endpoint:** `/api/ai-analyst` (Vercel Serverless Function).
- **System Prompt:** Stored in `!Docs/AI_SYSTEM_PROMPT.md` for easy user editing.

### B. Data Flow
1. **Frontend:** Collects `query`, `chatHistory`, and `spreadsheetId`.
2. **Backend:** 
   - Reads the latest system prompt from `!Docs/AI_SYSTEM_PROMPT.md`.
   - Authenticates user and fetches `spreadsheetId`.
   - Downloads transactions for the last 60-90 days (Analysis mode) or current wallet/category list (Entry mode) via Google Sheets API.
   - Formats data into a compact CSV string.
3. **LLM Call:** Sends the CSV data + system prompt + user query to OpenRouter.
4. **Response:** 
   - **Analysis:** Markdown text.
   - **Entry:** Structured JSON indicating `amount`, `category`, `wallet_id`, and `is_ambiguous` flag.
5. **Frontend:** Executes the save or shows the wallet picker.

### C. Data Privacy & Efficiency
- **Stateless:** Chat history is kept in the frontend component state during the session.
- **Anonymization:** Transaction IDs and sensitive wallet names can be masked before sending to the LLM.

---

## 4. Visual Components (UI)

### Header (Dynamic)
```tsx
<AnimatePresence mode="wait">
  {isAISheetOpen ? (
    <AINav key="ai-nav" /> // 📋, 📅, 📊
  ) : (
    <ThemeNav key="theme-nav" /> // ☀️, 🌙, ✨
  )}
</AnimatePresence>
```

### AI Response Rendering
- **Format:** Clean Markdown via `react-markdown`.
- **Styling:** Bold numbers and categories highlighted with the primary purple accent `#6d5dfc`.

---

## 5. Success Criteria
- [ ] Users can open the AI sheet from the FAB menu.
- [ ] Voice input correctly transcribes Russian/English speech.
- [ ] The real-time wave visualization is fluid (60 FPS).
- [ ] AI correctly answers questions like "How much did I spend on Taxi last month?" using real Google Sheets data.
- [ ] The sheet can be swiped down to close smoothly.
