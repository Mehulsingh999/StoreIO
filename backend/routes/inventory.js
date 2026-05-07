// backend/routes/inventory.js
const router = require("express").Router();
const { run, get, all } = require("../db/database");
const { auth } = require("../middleware/auth");

const BASE = `
  SELECT i.*, p.name AS product_name, p.price, p.sku,
    c.name AS category_name, o.name AS outlet_name,
    (i.quantity <= i.low_stock_threshold) AS low_stock
  FROM inventory i
  JOIN products p ON p.id=i.product_id
  JOIN categories c ON c.id=p.category_id
  JOIN outlets o ON o.id=i.outlet_id
`;

router.get("/", async (req, res) => {
  try {
    const { outlet_id } = req.query;
    const sql    = outlet_id ? BASE + " WHERE i.outlet_id=? ORDER BY o.name,c.name,p.name" : BASE + " ORDER BY o.name,c.name,p.name";
    const params = outlet_id ? [outlet_id] : [];
    res.json(await all(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/alerts", async (_, res) => {
  try {
    res.json(await all(
      BASE + " WHERE i.quantity <= i.low_stock_threshold ORDER BY i.quantity ASC"
    ));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:product_id/:outlet_id", auth, async (req, res) => {
  try {
    const { quantity, low_stock_threshold, prev_qty, note } = req.body;
    const { product_id, outlet_id } = req.params;
    const qty = parseInt(quantity);
    if (isNaN(qty)) return res.status(400).json({ error: "Invalid quantity" });

    await run(
      `INSERT INTO inventory (product_id,outlet_id,quantity,low_stock_threshold)
       VALUES (?,?,?,?)
       ON CONFLICT(product_id,outlet_id) DO UPDATE
       SET quantity=excluded.quantity, low_stock_threshold=excluded.low_stock_threshold, updated_at=CURRENT_TIMESTAMP`,
      [product_id, outlet_id, qty, low_stock_threshold ?? 5]
    );

    const diff = qty - (prev_qty || 0);
    if (diff !== 0 || note) {
      await run(
        "INSERT INTO restock_log (product_id,outlet_id,qty_added,note,by_user) VALUES (?,?,?,?,?)",
        [product_id, outlet_id, diff, note || "", req.user.username]
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/log", auth, async (_, res) => {
  try {
    res.json(await all(`
      SELECT r.*, p.name AS product, o.name AS outlet
      FROM restock_log r
      JOIN products p ON p.id=r.product_id
      JOIN outlets  o ON o.id=r.outlet_id
      ORDER BY r.created_at DESC LIMIT 200
    `));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
