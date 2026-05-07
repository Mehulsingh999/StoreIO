// backend/routes/catalog.js
const router = require("express").Router();
const { run, get, all } = require("../db/database");
const { auth } = require("../middleware/auth");

// ── Outlets ──────────────────────────────────────────────────────────────────
router.get("/outlets", async (_, res) => {
  try { res.json(await all("SELECT * FROM outlets ORDER BY name")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/outlets", auth, async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const r = await run("INSERT INTO outlets (name,address) VALUES (?,?)", [name.trim(), address?.trim() || ""]);
    res.json(await get("SELECT * FROM outlets WHERE id=?", [r.lastInsertRowid]));
  } catch (e) {
    res.status(400).json({ error: e.message.includes("UNIQUE") ? "Outlet name already exists" : e.message });
  }
});

router.delete("/outlets/:id", auth, async (req, res) => {
  try {
    await run("DELETE FROM outlets WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Categories ───────────────────────────────────────────────────────────────
const buildTree = (rows) => {
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const roots = [];
  rows.forEach(r => {
    r.parent_id && map[r.parent_id]
      ? map[r.parent_id].children.push(map[r.id])
      : roots.push(map[r.id]);
  });
  return roots;
};

router.get("/categories", async (req, res) => {
  try {
    const { outlet_id } = req.query;
    const sql    = outlet_id
      ? "SELECT * FROM categories WHERE outlet_id=? ORDER BY sort_order,name"
      : "SELECT * FROM categories ORDER BY sort_order,name";
    const params = outlet_id ? [outlet_id] : [];
    res.json(buildTree(await all(sql, params)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/categories", auth, async (req, res) => {
  try {
    const { name, parent_id, outlet_id } = req.body;
    if (!name?.trim() || !outlet_id) return res.status(400).json({ error: "Name and outlet_id required" });
    const ex = await get(
      "SELECT id FROM categories WHERE name=? AND parent_id IS ? AND outlet_id=?",
      [name.trim(), parent_id || null, outlet_id]
    );
    if (ex) return res.status(400).json({ error: "Category already exists at this level" });
    const r = await run(
      "INSERT INTO categories (name,parent_id,outlet_id) VALUES (?,?,?)",
      [name.trim(), parent_id || null, outlet_id]
    );
    res.json(await get("SELECT * FROM categories WHERE id=?", [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/categories/:id", auth, async (req, res) => {
  try {
    await run("DELETE FROM categories WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Products ─────────────────────────────────────────────────────────────────
const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, o.name AS outlet_name,
    COALESCE(i.quantity,0)            AS quantity,
    COALESCE(i.low_stock_threshold,5) AS threshold
  FROM products p
  JOIN categories c ON c.id=p.category_id
  JOIN outlets    o ON o.id=p.outlet_id
  LEFT JOIN inventory i ON i.product_id=p.id AND i.outlet_id=p.outlet_id
`;

router.get("/products", async (req, res) => {
  try {
    const { outlet_id, category_id } = req.query;
    let sql = PRODUCT_SELECT + " WHERE 1=1";
    const params = [];
    if (outlet_id)   { sql += " AND p.outlet_id=?";   params.push(outlet_id); }
    if (category_id) { sql += " AND p.category_id=?"; params.push(category_id); }
    res.json(await all(sql + " ORDER BY p.name", params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/products", auth, async (req, res) => {
  try {
    const { name, category_id, outlet_id, price, sku } = req.body;
    if (!name?.trim() || !category_id || !outlet_id) return res.status(400).json({ error: "name, category_id, outlet_id required" });
    const r = await run(
      "INSERT INTO products (name,category_id,outlet_id,price,sku) VALUES (?,?,?,?,?)",
      [name.trim(), category_id, outlet_id, price || 0, sku || null]
    );
    const pid = r.lastInsertRowid;
    await run(
      "INSERT OR IGNORE INTO inventory (product_id,outlet_id,quantity,low_stock_threshold) VALUES (?,?,0,5)",
      [pid, outlet_id]
    );
    res.json(await get(PRODUCT_SELECT + " WHERE p.id=?", [pid]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/products/:id", auth, async (req, res) => {
  try {
    const { name, price, sku } = req.body;
    await run("UPDATE products SET name=?,price=?,sku=? WHERE id=?", [name, price, sku, req.params.id]);
    res.json(await get(PRODUCT_SELECT + " WHERE p.id=?", [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/products/:id", auth, async (req, res) => {
  try {
    await run("DELETE FROM products WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
