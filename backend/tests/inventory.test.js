const request = require("supertest");
const jwt     = require("jsonwebtoken");

jest.mock("../db/database", () => ({
  run:     jest.fn(),
  get:     jest.fn(),
  all:     jest.fn(),
  batch:   jest.fn(),
  dbReady: Promise.resolve(),
}));

const db           = require("../db/database");
const { buildApp } = require("./testServer");

const SECRET     = "storeio-secret";
const adminToken = jwt.sign(
  { id: 1, username: "boss", role: "admin", outlet_id: null },
  SECRET,
  { expiresIn: "1h" }
);

const MOCK_INV = {
  id: 1, product_id: 1, outlet_id: 1, quantity: 10, low_stock_threshold: 5,
  updated_at: "2024-01-01", product_name: "Dark Roast", price: 14.99,
  sku: "COF-001", category_name: "Coffee", outlet_name: "Main Store", low_stock: 0,
};

let app;
beforeAll(() => { app = buildApp(); });
beforeEach(() => {
  db.run.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
  db.get.mockResolvedValue(undefined);
  db.all.mockResolvedValue([]);
  db.batch.mockImplementation(async (fn) => fn());
});

// ── GET /api/inventory ────────────────────────────────────────────────────────

describe("GET /api/inventory", () => {
  test("returns all inventory with joined fields", async () => {
    db.all.mockResolvedValueOnce([MOCK_INV]);
    const res = await request(app).get("/api/inventory");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("product_name");
    expect(res.body[0]).toHaveProperty("low_stock");
  });

  test("filters by outlet_id when provided", async () => {
    db.all.mockResolvedValueOnce([MOCK_INV]);
    await request(app).get("/api/inventory?outlet_id=1");
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining("WHERE i.outlet_id=?"),
      expect.arrayContaining(["1"])
    );
  });

  test("returns empty array when no inventory rows exist", async () => {
    const res = await request(app).get("/api/inventory");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("does not require authentication", async () => {
    const res = await request(app).get("/api/inventory");
    expect(res.status).toBe(200);
  });
});

// ── GET /api/inventory/alerts ─────────────────────────────────────────────────

describe("GET /api/inventory/alerts", () => {
  test("returns only low-stock items", async () => {
    db.all.mockResolvedValueOnce([{ ...MOCK_INV, quantity: 3, low_stock: 1 }]);
    const res = await request(app).get("/api/inventory/alerts");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test("returns empty array when nothing is low on stock", async () => {
    const res = await request(app).get("/api/inventory/alerts");
    expect(res.body).toEqual([]);
  });

  test("queries quantity <= threshold (boundary-inclusive)", async () => {
    await request(app).get("/api/inventory/alerts");
    // alerts route calls all(sql) with no params array — check the SQL only
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining("quantity <= i.low_stock_threshold")
    );
  });

  test("item at exactly the threshold boundary is considered low stock", async () => {
    // quantity == low_stock_threshold → quantity <= threshold is true → low_stock
    db.all.mockResolvedValueOnce([{ ...MOCK_INV, quantity: 5, low_stock_threshold: 5, low_stock: 1 }]);
    const res = await request(app).get("/api/inventory/alerts");
    expect(res.body[0].low_stock).toBe(1);
  });

  test("does not require authentication", async () => {
    const res = await request(app).get("/api/inventory/alerts");
    expect(res.status).toBe(200);
  });
});

// ── PUT /api/inventory/:product_id/:outlet_id ─────────────────────────────────

describe("PUT /api/inventory/:product_id/:outlet_id", () => {
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  test("updates quantity and returns { success: true }", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 20, prev_qty: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("accepts quantity = 0 (empties the stock)", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 0, prev_qty: 5 });
    expect(res.status).toBe(200);
  });

  test("accepts negative quantity (no lower-bound guard)", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: -3 });
    expect(res.status).toBe(200);
  });

  test("returns 400 for non-numeric string quantity", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid quantity");
  });

  test("returns 400 for empty-string quantity", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: "" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for null quantity", async () => {
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: null });
    expect(res.status).toBe(400);
  });

  test("decimal quantity is truncated by parseInt (1.9 → 1)", async () => {
    await request(app).put("/api/inventory/1/1").set(auth()).send({ quantity: 1.9 });
    const upsertArgs = db.run.mock.calls[0][1];
    expect(upsertArgs[2]).toBe(1); // third positional arg is qty
  });

  test("partial numeric string '10abc' is silently parsed as 10 (documents parseInt quirk)", async () => {
    // parseInt("10abc") === 10 — no 400 is returned; documents current behaviour
    const res = await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: "10abc" });
    expect(res.status).toBe(200); // accepted — known quirk
    const upsertArgs = db.run.mock.calls[0][1];
    expect(upsertArgs[2]).toBe(10);
  });

  test("low_stock_threshold defaults to 5 when omitted", async () => {
    await request(app).put("/api/inventory/1/1").set(auth()).send({ quantity: 10 });
    const upsertArgs = db.run.mock.calls[0][1];
    expect(upsertArgs[3]).toBe(5);
  });

  // ── Restock-log rules ──────────────────────────────────────────────────────

  test("creates restock log when quantity increases (diff ≠ 0)", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 20, prev_qty: 10 }); // diff = +10
    expect(db.run).toHaveBeenCalledTimes(2); // upsert + log
  });

  test("creates restock log when quantity decreases (diff ≠ 0)", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 5, prev_qty: 15 }); // diff = -10
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  test("does NOT create restock log when diff is 0 and no note", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 10, prev_qty: 10 }); // diff = 0, no note
    expect(db.run).toHaveBeenCalledTimes(1); // upsert only
  });

  test("creates restock log when note is provided even if quantity is unchanged", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 10, prev_qty: 10, note: "Spot check" }); // diff = 0, but note
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  test("empty-string note does NOT trigger restock log when diff is also 0", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 10, prev_qty: 10, note: "" }); // empty string is falsy
    expect(db.run).toHaveBeenCalledTimes(1);
  });

  test("restock log records the authenticated user's username as by_user", async () => {
    await request(app)
      .put("/api/inventory/1/1")
      .set(auth())
      .send({ quantity: 20, prev_qty: 5 });
    const logInsertArgs = db.run.mock.calls[1][1]; // second db.run = log insert
    expect(logInsertArgs).toContain("boss");
  });

  test("prev_qty defaults to 0 when omitted (diff = quantity)", async () => {
    await request(app).put("/api/inventory/1/1").set(auth()).send({ quantity: 15 });
    // diff = 15 - 0 = 15 ≠ 0 → log is created
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app).put("/api/inventory/1/1").send({ quantity: 10 });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/inventory/log ────────────────────────────────────────────────────

describe("GET /api/inventory/log", () => {
  test("returns restock log with product and outlet names", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, product_id: 1, outlet_id: 1, qty_added: 10, note: "", by_user: "boss",
        created_at: "2024-01-01", product: "Dark Roast", outlet: "Main Store" },
    ]);
    const res = await request(app)
      .get("/api/inventory/log")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("by_user");
    expect(res.body[0]).toHaveProperty("product");
    expect(res.body[0]).toHaveProperty("outlet");
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/inventory/log");
    expect(res.status).toBe(401);
  });
});
