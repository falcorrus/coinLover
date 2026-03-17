# Навигационный стек для модальных окон (Возврат в Историю/Аналитику/Календарь)

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Обеспечить корректный возврат пользователя по цепочке: Редактирование -> История (Лента/День/Категория) -> Исходный экран (Главная/Календарь/Аналитика).

**Architecture:** 
1. Добавление `returnState` в `NumpadData` для возврата в `HistoryModal`.
2. Добавление `returnTo` в `HistoryModalState` для возврата в `AnalyticsModal` или `CalendarAnalyticsModal`.
3. Обновление логики закрытия в `ModalManager` и `App` для поддержки этого стека.

**Tech Stack:** React, TypeScript

---

### Task 1: Обновление типов

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Шаг 1: Расширить NumpadData полем returnState**
```typescript
export interface NumpadData {
  // ... existing fields
  returnState?: HistoryModalState;
}
```

- [ ] **Шаг 2: Расширить HistoryModalState полем returnTo**
```typescript
export interface HistoryModalState {
  // ... existing fields
  returnTo?: "analytics" | "calendar";
}
```

---

### Task 2: Реализация навигации в ModalManager

**Files:**
- Modify: `src/components/ModalManager.tsx`

- [ ] **Шаг 1: Обновить onItemClick в AnalyticsModal**
Устанавливать `returnTo: "analytics"` при открытии истории из аналитики.

- [ ] **Шаг 2: Обновить onItemClick в CalendarAnalyticsModal**
Устанавливать `returnTo: "calendar"` при открытии истории из календаря.

- [ ] **Шаг 3: Обновить onEditTransaction в HistoryModal**
Сохранять текущее состояние истории в `returnState` при переходе к редактированию.

- [ ] **Шаг 4: Обновить closeHistoryModal**
Использовать поле `returnTo` для возврата в нужный экран вместо проверки иконок.

- [ ] **Шаг 5: Обновить onClose и onSubmit для Numpad**
Восстанавливать историю, если есть `returnState`.

---

### Task 3: Обработка жестов и ESC в App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Шаг 1: Обновить функцию closeAllModals**
Реализовать приоритетный возврат: 
1. Из Numpad -> в History (если есть `returnState`).
2. Из History -> в Analytics/Calendar (если есть `returnTo`).
3. В остальных случаях закрывать всё.

---

### Task 4: Верификация всех сценариев

- [ ] **Шаг 1: Аналитика -> Категория -> Транзакция -> Сохранить -> Назад до Главной**
- [ ] **Шаг 2: Календарь -> День -> Транзакция -> Сохранить -> Назад до Главной**
- [ ] **Шаг 3: Меню -> Лента -> Транзакция -> Крестик -> Должен остаться в Ленте**
- [ ] **Шаг 4: Проверить "жест назад" на каждом этапе цепочки**

