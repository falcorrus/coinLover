# CoinLover

## 📂 Индекс знаний проекта
Все инструкции и детали архитектуры структурированы в папке `Obsidian_Docs/`:
1. [[Obsidian_Docs/01_ARCHITECTURE.md|Архитектура и Стек]] - Capacitor, React, VPS Proxy.
2. [[Obsidian_Docs/02_UX_DESIGN.md|UX и Дизайн-система]] - Linear Style, DND механики, Темы.
3. [[Obsidian_Docs/03_DEVELOPMENT.md|Разработка и Процессы]] - Стандарты, Тестирование, Цикл успеха.
4. [[Obsidian_Docs/04_SYNC_DATA.md|Синхронизация и Данные]] - VPS Proxy, Разрешение конфликтов, Безопасность.
5. [[Obsidian_Docs/05_SOLUTIONS_INDEX.md|Индекс решений]] - iOS PWA, лаги DND, Android Notch.
6. [[Obsidian_Docs/06_ROADMAP.md|Роадмап]] - Multi-tenant, AI функции, глобальная экспансия.
7. [[Obsidian_Docs/07_MOBILE_APK.md|Мобильное приложение и APK]] - Процесс сборки и синхронизация лендинга.


## 🚀 Quick Commands
- **Build & Send APK:** `./build_and_send.sh`
- **Deploy:** `./deploy.sh` (Wait for user target: Main/Dev)
- **Update Landing APK:** `cp apk/coinlover-debug.apk public/download/coinlover.apk`

## 🛡 Security & Sync Policy
- **Primary Sync:** Always use VPS Proxy (`/api/sheets/`).
- **Service Account:** `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`.
- **Auth:** Passkey-first registration. Subscription checks are performed server-side (403 lock).

## 📝 Success Loop (Trigger: "работает.")
1. **Analyze:** Record technical essence of the fix.
2. **SOLUTIONS.md:** Update `!Docs/!SOLUTIONS.md`.
3. **Memory:** Update `memoir` and global `manager.py` memory.
