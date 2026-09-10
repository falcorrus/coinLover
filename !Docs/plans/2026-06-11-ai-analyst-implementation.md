---
type: "entity"
category: "project"
project: "coinlover"
---
# Implementation Plan: AI Analyst & Voice Entry

This plan details the technical steps to implement the AI Analyst feature in CoinLover, based on the [Design Spec](../specs/2026-06-11-ai-analyst-design.md).

---

## Phase 1: Infrastructure & API (Backend)

### 1.1 OpenRouter Integration
- [ ] Add `OPENROUTER_API_KEY` to `.env`.
- [ ] Create `api/ai-analyst.ts` (Vercel Serverless Function).
- [ ] Implement OpenRouter client using OpenAI SDK.
- [ ] Implement `fetchSystemPrompt` helper to read from `!Docs/AI_SYSTEM_PROMPT.md`.

### 1.2 Data Export Logic
- [ ] Implement `getRecentTransactionsCSV(spreadsheetId, days)` helper.
- [ ] Implement `getWalletCategoryMetadata(spreadsheetId)` helper (for Entry mode).
- [ ] Logic to switch context based on user intent (Analysis vs. Entry).

---

## Phase 2: Frontend Components

### 2.1 FAB Menu & Search Bar
- [ ] Update FAB menu component to include the search/voice input at the bottom.
- [ ] Style it to match the "Linear Style" (Glassmorphism, subtle borders).
- [ ] Implement `onLongPress` listener for the FAB to trigger voice mode.

### 2.2 AI Analyst Sheet (Shutter)
- [ ] Create `AISheet.tsx` using `framer-motion` or a Bottom Sheet library.
- [ ] Implement height transition (expanding to ~92%).
- [ ] Dynamic Header: Logic to switch between Theme Icons and AI Functional Icons (📋, 📅, 📊).

### 2.3 Voice & Visualization
- [ ] Install/Configure `@capacitor-community/speech-recognition` (or use Web API).
- [ ] Create `VoiceWave.tsx` component using Canvas or SVG filters for the pulsating purple wave.
- [ ] Implement Haptic feedback for recording states.

---

## Phase 3: AI Logic & Data Entry

### 3.1 Dual-Mode Handling
- [ ] Frontend logic to parse AI responses (JSON vs. Markdown).
- [ ] Implement "Wallet Picker" overlay for ambiguous entries.
- [ ] Integrate with existing `addTransaction` logic for instant saving.

### 3.2 Chat Persistence
- [ ] Implement local session history in `AISheet` state.
- [ ] Markdown rendering with custom styling for numbers and tags.

---

## Phase 4: Validation & Testing

- [ ] **Test Analysis:** "How much did I spend on Grocery last 2 weeks?" -> Verify calculation.
- [ ] **Test Entry:** "Spent 500 on dinner from Cash" -> Verify instant save.
- [ ] **Test Ambiguity:** "Spent 200 on gas" (multi-wallet) -> Verify picker appears.
- [ ] **Test Voice:** Verify STT works on mobile (Capacitor) and Web.
