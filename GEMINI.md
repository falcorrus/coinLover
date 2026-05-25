# CoinLover

## Success Loop (триггер "работает.")
При подтверждении успеха пользователем, ты ОБЯЗАН выполнить:
1. **Анализ:** Сформулируй, какую проблему решили и как (техническая суть).
2. **SOLUTIONS.md:** Добавь подробное описание в `!Docs/!SOLUTIONS.md`.
3. **Memoir AI:** Сохрани технический факт: `memoir -s ~/.gemini/memory/memoir_store remember "текст" --path .`.
4. **Global Memory:** Добавь краткую запись: `python3 ~/.gemini/commands/manager.py remember "текст"`.

## Architecture & Resources
- **Source Code:** `/Users/eugene/MyProjects/CoinLover`
- **AI Docs (llms.txt):** В папке `public/` находятся файлы `llms.txt` и `llms-full.txt` для улучшения понимания проекта LLM-агентами (согласно стандарту llmstxt.org).
- **Obsidian Docs:** `3. РЕСУРСЫ/00! Мои приложения/coinLover/`
- **Link:** Folder `/Users/eugene/MyProjects/CoinLover/!Docs` points to the project notes in Obsidian.
- **File Storage:** Все новые `.md` файлы (дизайны, планы, логи) сохраняй только в `/Users/eugene/MyProjects/CoinLover/Obsidian_Docs`.

## Behavioral Overrides
- **Senior Engineer Mode:** Пиши максимально кратко, технично, без приветствий и лишних объяснений. Фокус на результате и техническом обосновании.
- **Token Optimization:** 
    - Игнорируй `node_modules/`, `dist/`, `.git/` через `.geminiignore`.
    - Не читай файлы целиком, если можно использовать `grep_search` или `start_line`/`end_line`.
    - Минимизируй вывод инструментов в ответах.

## Sync & Database Policy
- **Primary Sync:** Всегда использовать VPS Proxy (`/api/sheets/`) вместо прямых запросов к Google Apps Script. Это решает проблемы CORS и прав доступа.
- **Service Account:** Для доступа к таблицам используется `coinlover-service-acc@baonlineru.iam.gserviceaccount.com`. Клиент должен добавить этот email как Editor.
- **Master Sheet:** Регистрация новых пользователей и лидов происходит автоматически через бэкенд в таблицу `1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M` (лист `Configs`, раздел `=== USERS ===`).
- **Flexible Parsing:** Бэкенд на Python поддерживает двойные заголовки и синонимы секций (`WALLETS`/`ACCOUNTS`).

## Deployment Policy
- **STRICT RULE:** NEVER deploy automatically. Deployment MUST only be triggered by an explicit user directive (e.g., "deploy", "деплой").
- **Standard Action:** On "deploy" command, ALWAYS use `ask_user` to clarify the target (Main, Dev, or Both) BEFORE running `./deploy.sh`. 
- **Production Flow:** To deploy to **MAIN**, strictly follow this sequence:
  1. Ensure latest code is in `preview` branch.
  2. Switch to `main` branch: `git checkout main`.
  3. Merge preview: `git merge preview`.
  4. Push to GitHub: `git push origin main`.
  5. Run `./deploy.sh` and choose option **2 (Main)**.
- **Dev Flow:** Run `./deploy.sh` and choose option **1 (Dev)**. Code will be pushed from current HEAD to remote `preview` branch automatically.

## Reporting & Analytics
- **Aggregation:** When requesting 'coinlover' or 'coin', merge data from `coinlover.ru` (Production) and `coin.reloto.ru` (Dev).
- **Financial Table (Google Sheets):** ID `1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M` (Income/Expenses).
