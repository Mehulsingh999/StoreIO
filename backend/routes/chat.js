// backend/routes/chat.js
const router = require("express").Router();
const { run, get, all } = require("../db/database");

// ── Build AI context ──────────────────────────────────────────────────────────
const buildContext = async () => {
  const [outlets, cats, rows] = await Promise.all([
    all("SELECT id, name, address FROM outlets ORDER BY name"),
    all(`SELECT c.id, c.name, c.parent_id, c.outlet_id, o.name AS outlet_name
         FROM categories c JOIN outlets o ON o.id=c.outlet_id ORDER BY o.name, c.name`),
    all(`
      SELECT i.quantity, i.low_stock_threshold,
        p.id AS product_id, p.name AS product, p.price,
        o.id AS outlet_id, o.name AS outlet,
        c.id AS cat_id, c.name AS category, c.parent_id,
        (SELECT name FROM categories WHERE id=c.parent_id)                              AS parent_cat,
        (SELECT name FROM categories WHERE id=(SELECT parent_id FROM categories WHERE id=c.parent_id)) AS grandparent_cat,
        (i.quantity <= i.low_stock_threshold) AS low_stock
      FROM inventory i
      JOIN products p ON p.id=i.product_id
      JOIN outlets  o ON o.id=i.outlet_id
      JOIN categories c ON c.id=p.category_id
      ORDER BY o.name, grandparent_cat, parent_cat, c.name, p.name
    `),
  ]);

  const lines = [
    "=== StoreIO — Inventory System ===",
    `Outlets (${outlets.length}):`,
    ...outlets.map(o => `  [ID:${o.id}] ${o.name}${o.address ? ` — ${o.address}` : ""}`),
    "",
    `Categories (${cats.length}):`,
    ...cats.map(c => {
      const parent = cats.find(p => p.id === c.parent_id);
      return `  [ID:${c.id}] ${parent ? parent.name + " > " : ""}${c.name} (outlet: ${c.outlet_name}, outlet_id:${c.outlet_id})`;
    }),
    "",
    "Inventory:",
  ];

  let lastOutlet = "";
  for (const r of rows) {
    if (r.outlet !== lastOutlet) {
      lines.push(`\n  === ${r.outlet} (outlet_id:${r.outlet_id}) ===`);
      lastOutlet = r.outlet;
    }
    const low = r.low_stock ? " ⚠️ LOW" : "";
    lines.push(`    [product_id:${r.product_id}, cat_id:${r.cat_id}] ${r.product} — $${r.price} | Qty: ${r.quantity}${low}`);
  }

  return lines.join("\n");
};

// ── Execute <action> blocks ───────────────────────────────────────────────────
const executeActions = async (reply, user = "AI Assistant") => {
  const results = [];
  const regex   = /<action>([\s\S]*?)<\/action>/g;
  let match;

  while ((match = regex.exec(reply)) !== null) {
    try {
      const action = JSON.parse(match[1].trim());

      if (action.type === "update_inventory") {
        await run(
          `INSERT INTO inventory (product_id,outlet_id,quantity,low_stock_threshold) VALUES (?,?,?,5)
           ON CONFLICT(product_id,outlet_id) DO UPDATE
           SET quantity=excluded.quantity, updated_at=CURRENT_TIMESTAMP`,
          [action.product_id, action.outlet_id, action.quantity]
        );
        await run(
          "INSERT INTO restock_log (product_id,outlet_id,qty_added,note,by_user) VALUES (?,?,?,?,?)",
          [action.product_id, action.outlet_id, action.quantity, action.note || "", user]
        );
        results.push({ executed: true, type: "update_inventory", product_id: action.product_id, outlet_id: action.outlet_id, quantity: action.quantity });
      }

      else if (action.type === "add_outlet") {
        const ex = await get("SELECT id FROM outlets WHERE name=?", [action.name]);
        if (ex) {
          results.push({ executed: false, type: "add_outlet", error: `Outlet "${action.name}" already exists` });
        } else {
          const r = await run("INSERT INTO outlets (name,address) VALUES (?,?)", [action.name, action.address || ""]);
          results.push({ executed: true, type: "add_outlet", id: r.lastInsertRowid, name: action.name });
        }
      }

      else if (action.type === "add_category") {
        const ex = await get(
          "SELECT id FROM categories WHERE name=? AND parent_id IS ? AND outlet_id=?",
          [action.name, action.parent_id || null, action.outlet_id]
        );
        if (ex) {
          results.push({ executed: false, type: "add_category", error: `Category "${action.name}" already exists` });
        } else {
          const r = await run(
            "INSERT INTO categories (name,parent_id,outlet_id) VALUES (?,?,?)",
            [action.name, action.parent_id || null, action.outlet_id]
          );
          results.push({ executed: true, type: "add_category", id: r.lastInsertRowid, name: action.name });
        }
      }

      else if (action.type === "add_product") {
        const r = await run(
          "INSERT INTO products (name,category_id,outlet_id,price,sku) VALUES (?,?,?,?,?)",
          [action.name, action.category_id, action.outlet_id, action.price || 0, action.sku || null]
        );
        const pid = r.lastInsertRowid;
        await run(
          "INSERT OR IGNORE INTO inventory (product_id,outlet_id,quantity,low_stock_threshold) VALUES (?,?,?,?)",
          [pid, action.outlet_id, action.quantity || 0, action.low_stock_threshold || 5]
        );
        results.push({ executed: true, type: "add_product", id: pid, name: action.name, outlet_id: action.outlet_id, price: action.price || 0 });
      }

    } catch (e) {
      results.push({ executed: false, error: e.message });
    }
  }

  return results.length ? results : null;
};

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = (context) => `You are StoreIO — an intelligent inventory management assistant for any retail business.

${context}

You can answer questions AND make live changes using <action> tags. Actions execute immediately.

## ACTIONS (chain multiple in one reply)

Set inventory quantity:
<action>{"type":"update_inventory","product_id":1,"outlet_id":1,"quantity":50,"note":"reason"}</action>

Add a new store location:
<action>{"type":"add_outlet","name":"Downtown Branch","address":"456 Main St"}</action>

Add a top-level category:
<action>{"type":"add_category","name":"Electronics","outlet_id":1,"parent_id":null}</action>

Add a subcategory (use existing category id as parent_id):
<action>{"type":"add_category","name":"Headphones","outlet_id":1,"parent_id":3}</action>

Add a new product:
<action>{"type":"add_product","name":"Widget Pro","category_id":4,"outlet_id":1,"price":29.99,"sku":"WGT-001","quantity":20,"low_stock_threshold":5}</action>

## RULES
- Confirm all actions in plain English after the <action> tags.
- If info is missing (which outlet? which category?), ASK before acting.
- Never guess IDs. Use only IDs from the context above.
- For multi-step setup (add category THEN product), include both actions in one reply — categories run first.
- Format responses clearly using **bold** for product names and quantities.`;

// ── Provider helpers ──────────────────────────────────────────────────────────
const tryGemini = async (system, messages, key) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({
          role:  m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      }),
    }
  );
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(`Gemini error: ${data.error?.message || JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const tryAnthropic = async (system, messages, key) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system,
      messages,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(`Anthropic error: ${data.error?.message || JSON.stringify(data)}`);
  return data.content?.filter(c => c.type === "text").map(c => c.text).join("") || "";
};

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "messages array required" });

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  console.log("Keys present:", { gemini: !!geminiKey, anthropic: !!anthropicKey });

  if (!geminiKey && !anthropicKey)
    return res.status(500).json({ error: "No API key set. Add ANTHROPIC_API_KEY or GEMINI_API_KEY to backend/.env" });

  try {
    const context = await buildContext();
    const system  = SYSTEM(context);
    let reply    = "";
    let provider = "";

    if (geminiKey) {
      try {
        reply    = await tryGemini(system, messages, geminiKey);
        provider = "gemini";
      } catch (e) {
        if (!anthropicKey) throw e;
        console.warn("Gemini failed, falling back to Anthropic:", e.message);
        reply    = await tryAnthropic(system, messages, anthropicKey);
        provider = "anthropic";
      }
    } else {
      reply    = await tryAnthropic(system, messages, anthropicKey);
      provider = "anthropic";
    }

    if (!reply) return res.status(502).json({ error: "Empty response from AI" });

    const actionResults = await executeActions(reply);
    const cleanReply    = reply.replace(/<action>[\s\S]*?<\/action>/g, "").trim();

    res.json({ reply: cleanReply, actionResults, provider });

  } catch (e) {
    console.error("Chat error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
