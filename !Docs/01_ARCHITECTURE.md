---
type: "entity"
category: "project"
project: "easyfaq.online"
---
# Architecture Overview - easyFAQ.online

## What This Project Is
easyFAQ.online is a multi-tenant RAG (Retrieval-Augmented Generation) platform. It allows users to upload a Markdown file as a Knowledge Base (KB) and provides a beautiful, AI-powered chat interface to answer questions based on that content.

## System Design
The system is built with a **Monolithic Backend** using FastAPI, serving a **Vanilla JS Frontend**.

### High-Level Components:
1.  **Frontend:** A single-page application (`index.html`, `script.js`, `style.css`) that adapts its UI based on the tenant's settings and the detected language.
2.  **Backend (FastAPI):** Handles authentication, tenant management, KB processing, and proxies chat requests to AI models via OpenRouter.
3.  **Storage:** A simple file-based storage system (`storage/` directory) for both multi-tenant configurations (`tenants.json`) and private tenant data (KB files and logs).
4.  **AI Integration:** Uses Google Gemini (via OpenRouter) for:
    *   **Chat:** Answering user queries based on KB context.
    *   **Preprocessing:** Automatically extracting business names, suggestions, and signatures from the uploaded KB.
    *   **Language Detection:** Detecting the primary language of the KB content.

## Directory Structure
```
easyFAQ.online/
├── server.py              # Main FastAPI server logic
├── index.html             # Frontend entry point
├── script.js              # Frontend logic
├── style.css              # Main styles
├── genui.css              # Styles for Generative UI components
├── storage/               # Main data directory
│   ├── tenants.json       # Central tenant database (hashed passwords, settings, cache)
│   └── [subdomain]/       # Private tenant folder
│       ├── base.md        # The Knowledge Base file
│       └── logs.json      # Chat history for the tenant
├── Themes/                # UI Theme definitions (Linear, Glass)
├── Stories_Generator/     # Utility for generating visual "stories"
├── !Docs/                 # Project documentation and strategy
└── MAIN_PROMPT.md         # The system prompt used for AI responses
```

## Data Flow
1.  **Registration/Login:** User signs up with an email and a subdomain. A private directory is created in `storage/[subdomain]`.
2.  **KB Upload:** User uploads a `.md` file.
    *   Backend saves it as `base.md`.
    *   A background task runs to detect the KB language and extract "General Settings" (Business Name, Suggestions, Signature).
    *   Extracted data is cached in `tenants.json` for fast retrieval.
3.  **Chat Interaction:**
    *   A visitor visits `[subdomain].easyfaq.online`.
    *   The frontend fetches public settings (theme, name, suggestions).
    *   When a message is sent, the backend retrieves `base.md`, injects it into the `MAIN_PROMPT.md` template, and calls OpenRouter.
    *   The AI response is saved to `logs.json` for the owner to review.

## Key Design Decisions
*   **File-based Storage:** Chosen for simplicity and ease of backup/migration. No external database (like PostgreSQL) is required for the current scale.
*   **Subdomain-based Multi-tenancy:** Uses the `Host` header to isolate tenant context, making it easy to scale with wild-card SSL certificates.
*   **Generative UI:** The AI is instructed to use custom HTML tags (`<ui-button>`, `<ui-card>`, etc.) which the frontend renders as interactive components, moving beyond plain text answers.
*   **Background Processing:** Tasks like SSL setup and AI-based KB analysis are handled in the background to keep the UI responsive.

## Security
*   **JWT Authentication:** Used for secure communication between the frontend and backend.
*   **Bcrypt Password Hashing:** Ensures user credentials are stored safely.
*   **Context Filtering:** Sensitive sections like "General Settings" are stripped from the context sent to the AI to prevent accidental leakage of raw configuration.
