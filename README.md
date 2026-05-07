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
