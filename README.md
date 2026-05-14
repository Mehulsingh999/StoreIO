# StoreIO v1.1

Multi-outlet inventory management system with AI assistant.

## Quick Start

### 1. Backend
```bash
cd backend
npm install
# Edit .env — uncomment GEMINI_API_KEY or ANTHROPIC_API_KEY
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — login: **boss / boss123**

---

## AI Setup

Edit `backend/.env` and uncomment **one** key:

| Provider | Key | Free Tier |
|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | ✅ Yes — get at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Anthropic Claude | `ANTHROPIC_API_KEY` | ❌ Paid — get at [console.anthropic.com](https://console.anthropic.com) |

---

## Excel Import Format

| Column | Required | Description |
|---|---|---|
| outlet | ✅ | Store name |
| category | ✅ | Top-level category |
| subcategory | | 2nd level |
| sub_subcategory | | 3rd level |
| product | ✅ | Product name |
| price | | Price in $ |
| quantity | | Stock count |
| sku | | SKU code |

Download a pre-filled template from the Import page.

---

## Deployment

### Railway (backend)

1. Create a new Railway project and connect your repo (or push via CLI).
2. Set the following environment variables in Railway:
   - `PORT` — Railway sets this automatically; you can omit it.
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -hex 32`).
   - `FRONTEND_URL` — your Netlify URL (set after the Netlify deploy; update post-deploy).
   - `GEMINI_API_KEY` **or** `ANTHROPIC_API_KEY` — one AI provider key.
   - `NODE_ENV=production`
3. Attach a **Volume** to the service, mounted at `/data`. The database file is stored there as `store.db` and survives deploys/restarts.
4. Deploy. Railway uses `railway.json` (Nixpacks builder, `node server.js` start, `/api/health` health check).

> **DB path**: `database.js` defaults to `/data/store.db`. Override with `DB_PATH` env var if needed for local dev.

---

### Netlify (frontend)

1. Connect your repo to Netlify. In the Netlify UI set **Base directory** to `frontend`.
2. Build command: `npm run build` · Publish directory: `dist` (both set in `frontend/netlify.toml`).
3. Add the environment variable:
   - `VITE_API_URL` — the Railway backend URL (e.g. `https://storeio-backend-production.up.railway.app`).
4. Deploy. The `netlify.toml` SPA redirect ensures react-router routes don't 404 on reload.

---

### Post-deploy

After both services are live:

- Go back to Railway and set `FRONTEND_URL` to the Netlify site URL (e.g. `https://storeio-web.netlify.app`). This tightens CORS so only your frontend can call the API.
- Trigger a Railway redeploy to pick up the updated env var.

---

## What's new in v1.1

- **Fixed**: Gemini API model updated to `gemini-2.0-flash` (1.5-flash was deprecated)
- **Optimized**: Excel imports now persist the database once at the end instead of after every row — 10x faster for large files
- **Added**: Shared app context — outlets are fetched once and shared across all pages
- **Improved**: Inventory `UPSERT` replaces the `SELECT` + `INSERT/UPDATE` two-step — fewer queries
- **Added**: Markdown rendering in AI chat (bold, bullets, italics)
- **Added**: Chat shows which AI provider is active (Gemini / Claude)
- **Added**: Chat "Clear chat" button
- **Added**: Spinner component, Empty state component, PageHeader component
- **Improved**: `button:disabled` style in global CSS
- **Fixed**: Chat sends all messages in parallel context, uses `Promise.all` for context queries
