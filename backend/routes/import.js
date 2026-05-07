// backend/routes/import.js
const router = require("express").Router();
const multer = require("multer");
const XLSX   = require("xlsx");
const { run, get, batch } = require("../db/database");
const { auth }            = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Helpers ──────────────────────────────────────────────────────────────────
const getOrCreate = async (table, whereClause, whereParams, insertSql, insertParams) => {
  const ex = await get(`SELECT id FROM ${table} WHERE ${whereClause}`, whereParams);
  if (ex) return ex.id;
  const r = await run(insertSql, insertParams);
  return r.lastInsertRowid;
};

const getField = (row, ...keys) =>
  String(keys.reduce((v, k) => v || row[k] || row[k.toUpperCase()] || row[k.toLowerCase()] || "", "") || "").trim();

// ── POST /api/import/excel ───────────────────────────────────────────────────
router.post("/excel", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  let rows;
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } catch {
    return res.status(400).json({ error: "Could not parse Excel file" });
  }

  if (!rows.length) return res.status(400).json({ error: "Empty sheet" });

  const results = { imported: 0, skipped: 0, errors: [] };

  // batch() defers all DB persists and writes disk ONCE at the end
  await batch(async () => {
    for (const [idx, row] of rows.entries()) {
      try {
        const outletName = getField(row, "outlet");
        const prodName   = getField(row, "product");
        const cat1       = getField(row, "category");
        const cat2       = getField(row, "subcategory");
        const cat3       = getField(row, "sub_subcategory");
        const price      = parseFloat(getField(row, "price"))  || 0;
        const qty        = parseInt(getField(row, "quantity"))  || 0;
        const sku        = getField(row, "sku") || null;

        if (!outletName || !prodName) { results.skipped++; continue; }

        const outletId = await getOrCreate(
          "outlets", "name=?", [outletName],
          "INSERT INTO outlets (name) VALUES (?)", [outletName]
        );

        let parentId = null;
        for (const catName of [cat1, cat2, cat3].filter(Boolean)) {
          parentId = await getOrCreate(
            "categories",
            "name=? AND parent_id IS ? AND outlet_id=?", [catName, parentId, outletId],
            "INSERT INTO categories (name,parent_id,outlet_id) VALUES (?,?,?)", [catName, parentId, outletId]
          );
        }

        if (!parentId) { results.skipped++; continue; }

        const ex = await get(
          "SELECT id FROM products WHERE name=? AND category_id=? AND outlet_id=?",
          [prodName, parentId, outletId]
        );

        let prodId;
        if (ex) {
          await run("UPDATE products SET price=?,sku=? WHERE id=?", [price, sku, ex.id]);
          prodId = ex.id;
        } else {
          const r = await run(
            "INSERT INTO products (name,category_id,outlet_id,price,sku) VALUES (?,?,?,?,?)",
            [prodName, parentId, outletId, price, sku]
          );
          prodId = r.lastInsertRowid;
        }

        await run(
          `INSERT INTO inventory (product_id,outlet_id,quantity,low_stock_threshold) VALUES (?,?,?,5)
           ON CONFLICT(product_id,outlet_id) DO UPDATE SET quantity=excluded.quantity, updated_at=CURRENT_TIMESTAMP`,
          [prodId, outletId, qty]
        );

        results.imported++;
      } catch (e) {
        results.errors.push(`Row ${idx + 2}: ${e.message}`);
      }
    }
  });

  res.json({ ...results, total: rows.length });
});

// ── GET /api/import/template ─────────────────────────────────────────────────
router.get("/template", (_, res) => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["outlet", "category", "subcategory", "sub_subcategory", "product", "price", "quantity", "sku"],
    ["Main Store", "Beverages", "Coffee",  "",          "Dark Roast Blend",   14.99, 30, "BEV-COF-001"],
    ["Main Store", "Beverages", "Coffee",  "",          "Light Roast Blend",  12.99, 25, "BEV-COF-002"],
    ["Main Store", "Beverages", "Tea",     "",          "Green Tea Box",       9.99, 40, "BEV-TEA-001"],
    ["Main Store", "Snacks",    "Nuts",    "",          "Mixed Nuts 200g",    11.99, 20, "SNK-NUT-001"],
    ["Downtown",   "Beverages", "Juice",   "Cold Press", "Orange Pressed",    6.99,  15, ""],
    ["Downtown",   "Snacks",    "Chips",   "",          "Sea Salt Crisps",     4.99, 50, "SNK-CHP-001"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", "attachment; filename=inventory-template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

module.exports = router;
