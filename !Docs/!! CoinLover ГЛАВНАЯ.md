---
author:
  - LLM
  - Broz
type:
  - прога
  - автоматизация
status: 🟢 active
description:
  - Приложение для учета личных финансов с интерфейсом Drag & Drop и облачной синхронизацией.
location:
  - server.reloto.ru
path: /Users/eugene/MyProjects/CoinLover
stack:
  - React + TypeScript
  - Vite
  - Docker + Nginx
  - Google Sheets API (v4)
created: 2026-03-02
github: https://github.com/falcorrus/coinLover
title: CoinLover.ru (Main) / coin.reloto.ru (Dev)
url: https://coinlover.ru
---

# 🪙 CoinLover: Central Project Hub

> [!abstract] Overview
> **CoinLover** — современное, геймифицированное приложение для учета личных финансов. Фокус на осознанности трат, простоте ввода через Drag-and-Drop и глубокой мультивалютной аналитике.

## 🎯 Vision & Philosophy
- **Минимализм:** Только самое необходимое. Никаких сложных бухгалтерских таблиц.
- **Интуитивность:** Запись расхода одним движением — перетаскиванием «монетки» с мгновенным визуальным откликом.
- **Travel-ready:** Продвинутая работа с мультивалютностью (Source vs Target currency).
- **Философия:** Осознанность вместо слепой автоматизации (No Bank Sync). Ручной ввод как элемент финансовой гигиены.

---

## 🚀 Key Features
- **Smart Interaction:** Разные механики для сортировки (Long Press) и действия (Quick Swipe).
- **Interactive Analytics:** Аналитика «в два клика» с мгновенным пересчетом сумм и визуализацией.
- **Multi-user Support:** Поддержка множества независимых таблиц через мастер-таблицу админа.
- **Robust Sync:** Snapshot-based разрешение конфликтов и динамический маппинг колонок.

---

## 📈 Strategic Directions (CEO & SEO)
> [!info] SEO Priorities
> 1. Настройка Open Graph для превью в Telegram.
> 2. Добавление микроразметки `WebApplication` для Google.
> 3. Оптимизация заголовков и мета-описаний.

> [!tip] Product Growth
> - Упор на "акцентный ручной ввод" как конкурентное преимущество.
> - Развитие визуальной мотивации (прогресс-бары накоплений).

---

## 🚀 Продвинутые возможности (Main: coinlover.ru | Dev: coin.reloto.ru)

### 📝 Описание
✦ **CoinLover** — это интуитивный финансовый менеджер, вдохновленный классическими механиками (CoinKeeper), но переосмысленный в современном стиле **Linear Style** (Glassmorphism + Bento Grid).
✦ **Data Ownership:** Твои данные принадлежат только тебе. База данных хранится в **твоих Google Sheets** — полная приватность и доступ к истории 24/7.
✦ **Premium UX:** Основное взаимодействие — тактильное перетаскивание «монетки» со счета на категорию (Drag & Drop) с мгновенным визуальным откликом и микро-вибрациями.

### 🎯 Ценностное предложение (Value Prop 2026)
* **Для новичков:** Магнетическая эстетика и простота. Начни вести учет за 2 секунды, просто перетаскивая иконки.
* **Для профи:** Глубокая система тегов и категорий (опционально), интеллектуальное разрешение конфликтов синхронизации и детальный контроль за каждой транзакцией.
* **Философия:** Осознанность вместо слепой автоматизации (No Bank Sync). Ручной ввод как элемент финансовой гигиены в премиальной обертке.

### 1. Как запустить
Просто скажи Gemini CLI одну из фраз:
* "деплой coinlover"
* "создай счет [имя] в coinlover"
* "добавь расход в категорию [название]"

## 🛠 Конфигурация
- **Сервер/Среда:** VPS server.reloto.ru (Ubuntu 24.04), Docker-контейнер `coinlover`.
- **Путь к конфигам/ENV:** `/Users/eugene/MyProjects/CoinLover/.env` (локально) и переменные окружения в Docker.
- **Инфраструктура:** Проксирование через Nginx на основном сервере, SSL через Certbot.

> Таблица моя: https://docs.google.com/spreadsheets/d/1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M/edit?gid=1856785524#gid=1856785524

## ⌨️ Команды запуска
Команда для локального запуска
```bash
npm run dev
```

Команда для деплоя
```bash
./deploy.sh
```

Команда для проверки логов Docker
```bash
ssh root@server.reloto.ru "docker logs -f coinlover"
```

## 🔗 Related Documents & Quick Access
- **Main (Production):** [https://coinlover.ru](https://coinlover.ru)
- **Dev (Staging):** [https://coin.reloto.ru](https://coin.reloto.ru)
- **Source Code:** [GitHub Repository](https://github.com/falcorrus/coinLover.git)
- **Admin Email:** `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`

**Project Documentation & History:**
- [[!SOLUTIONS|Technical Solutions Log]]
- [[Archive/|Archive (Legacy Docs)]]
- [[Design/|Design System & Concepts]]
- [[images/|Asset Library]]

---
## 🗒 Заметки по обслуживанию
- 2026-03-02: Проект инициализирован в Obsidian. Оптимизирован сплэш-скрин (векторный) и настроен автоматический деплой.
- 2026-03-24: Переход на двухдоменную структуру. 
- 2026-04-14: Внедрена система Cookie-Persistence для надежной работы PWA на iOS.
