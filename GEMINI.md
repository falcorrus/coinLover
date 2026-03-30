# CoinLover

## Architecture & Resources
- **Source Code:** `/Users/eugene/MyProjects/CoinLover`
- **Obsidian Docs:** `3. РЕСУРСЫ/00! Мои приложения/coinLover/`
- **Link:** Folder `/Users/eugene/MyProjects/CoinLover/Obsidian_Docs` points to the project notes in Obsidian.
- **File Storage:** Все новые `.md` файлы (дизайны, планы, логи) сохраняй только в `/Users/eugene/MyProjects/CoinLover/Obsidian_Docs`.

## Sync & Database Policy
- **Primary Sync:** Всегда использовать VPS Proxy (`/api/sheets/`) вместо прямых запросов к Google Apps Script. Это решает проблемы CORS и прав доступа.
- **Service Account:** Для доступа к таблицам используется `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`. Клиент должен добавить этот email как Editor.
- **Master Sheet:** Регистрация новых пользователей и лидов происходит автоматически через бэкенд в таблицу `1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M` (лист `Configs`, раздел `=== USERS ===`).
- **Flexible Parsing:** Бэкенд на Python поддерживает двойные заголовки и синонимы секций (`WALLETS`/`ACCOUNTS`).

## Deployment Policy
- **Standard Action:** On "deploy" command, always run `./deploy.sh` without arguments and follow interactive prompts (1-Dev, 2-Main, 3-Both).
- **Production Flow:** To deploy to **MAIN**, strictly follow this sequence:
  1. Ensure latest code is in `preview` branch.
  2. Switch to `main` branch: `git checkout main`.
  3. Merge preview: `git merge preview`.
  4. Push to GitHub: `git push origin main`.
  5. Run `./deploy.sh` and choose option **2 (Main)**.
- **Dev Flow:** Run `./deploy.sh` and choose option **1 (Dev)**. Code will be pushed from current HEAD to remote `preview` branch automatically.

## Reporting & Analytics
- **Aggregation:** When requesting 'coinlover' or 'coin', merge data from `coin.reloto.ru` and `coinlover-dev.reloto.ru`.
- **Financial Table (Google Sheets):** ID `1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M` (Income/Expenses).
