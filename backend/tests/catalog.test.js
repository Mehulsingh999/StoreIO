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

let app;
beforeAll(() => { app = buildApp(); });
beforeEach(() => {
  db.run.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
  db.get.mockResolvedValue(undefined);
  db.all.mockResolvedValue([]);
  db.batch.mockImplementation(async (fn) => fn());
});

// ── GET /api/catalog/outlets ─────────────────────────────────────────────────

describe("GET /api/catalog/outlets", () => {
  test("returns 200 with empty array when no outlets exist", async () => {
    db.all.mockResolvedValueOnce([]);
    const res = await request(app).get("/api/catalog/outlets");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns all outlets", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, name: "Alpha", address: "1 St", created_at: "2024-01-01" },
      { id: 2, name: "Beta",  address: "2 St", created_at: "2024-01-02" },
    ]);
    const res = await request(app).get("/api/catalog/outlets");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("does not require authentication", async () => {
    const res = await request(app).get("/api/catalog/outlets");
    expect(res.status).toBe(200);
  });
});

// ── POST /api/catalog/outlets ────────────────────────────────────────────────

describe("POST /api/catalog/outlets", () => {
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  test("creates outlet and returns the new record", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 3, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 3, name: "New Store", address: "789 Ave", created_at: "2024-01-01" });

    const res = await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "New Store", address: "789 Ave" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Store");
    expect(res.body.address).toBe("789 Ave");
  });

  test("trims whitespace from name before persisting", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 4, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 4, name: "Trimmed", address: "" });

    await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "  Trimmed  " });

    expect(db.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["Trimmed"])
    );
  });

  test("address defaults to empty string when omitted", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 5, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 5, name: "Bare", address: "" });

    await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "Bare" });

    const runArgs = db.run.mock.calls[0][1];
    expect(runArgs[1]).toBe(""); // address arg is ""
  });

  test("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ address: "Somewhere" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name required");
  });

  test("returns 400 for empty-string name", async () => {
    const res = await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for whitespace-only name", async () => {
    const res = await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "   " });
    expect(res.status).toBe(400);
  });

  test("returns 400 with readable message for duplicate name", async () => {
    db.run.mockRejectedValueOnce(new Error("UNIQUE constraint failed: outlets.name"));

    const res = await request(app)
      .post("/api/catalog/outlets")
      .set(auth())
      .send({ name: "Existing" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Outlet name already exists");
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app).post("/api/catalog/outlets").send({ name: "Store" });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/catalog/outlets/:id ─────────────────────────────────────────

describe("DELETE /api/catalog/outlets/:id", () => {
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  test("deletes outlet and returns { success: true }", async () => {
    db.run.mockResolvedValueOnce({ changes: 1 });
    const res = await request(app).delete("/api/catalog/outlets/1").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns success even when id does not exist (idempotent)", async () => {
    db.run.mockResolvedValueOnce({ changes: 0 });
    const res = await request(app).delete("/api/catalog/outlets/9999").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app).delete("/api/catalog/outlets/1");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/catalog/categories ──────────────────────────────────────────────

describe("GET /api/catalog/categories", () => {
  test("returns empty array when no categories", async () => {
    const res = await request(app).get("/api/catalog/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("builds 3-level tree from flat list", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, name: "Beverages", parent_id: null, outlet_id: 1, sort_order: 0 },
      { id: 2, name: "Hot",       parent_id: 1,    outlet_id: 1, sort_order: 0 },
      { id: 3, name: "Coffee",    parent_id: 2,    outlet_id: 1, sort_order: 0 },
    ]);
    const res = await request(app).get("/api/catalog/categories");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Beverages");
    expect(res.body[0].children[0].name).toBe("Hot");
    expect(res.body[0].children[0].children[0].name).toBe("Coffee");
  });

  test("orphaned category (parent_id points to absent id) falls to root", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, name: "Root",   parent_id: null, outlet_id: 1, sort_order: 0 },
      { id: 2, name: "Orphan", parent_id: 999,  outlet_id: 1, sort_order: 0 },
    ]);
    const res = await request(app).get("/api/catalog/categories");
    expect(res.body).toHaveLength(2);
    expect(res.body.map((c) => c.name)).toContain("Orphan");
  });

  test("circular references produce empty root list (no infinite loop)", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, name: "A", parent_id: 2, outlet_id: 1, sort_order: 0 },
      { id: 2, name: "B", parent_id: 1, outlet_id: 1, sort_order: 0 },
    ]);
    const res = await request(app).get("/api/catalog/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // both trapped in cycle, neither becomes root
  });

  test("passes outlet_id filter to query when provided", async () => {
    await request(app).get("/api/catalog/categories?outlet_id=2");
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining("WHERE outlet_id=?"),
      ["2"]
    );
  });

  test("leaf nodes have an empty children array", async () => {
    db.all.mockResolvedValueOnce([
      { id: 1, name: "Root", parent_id: null, outlet_id: 1, sort_order: 0 },
    ]);
    const res = await request(app).get("/api/catalog/categories");
    expect(res.body[0].children).toEqual([]);
  });
});

// ── POST /api/catalog/categories ────────────────────────────────────────────

describe("POST /api/catalog/categories", () => {
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  test("creates a root-level category", async () => {
    db.get.mockResolvedValueOnce(undefined); // no duplicate
    db.run.mockResolvedValueOnce({ lastInsertRowid: 10, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 10, name: "Beverages", parent_id: null, outlet_id: 1 });

    const res = await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ name: "Beverages", outlet_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Beverages");
  });

  test("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ outlet_id: 1 });
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing outlet_id", async () => {
    const res = await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ name: "Test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("outlet_id");
  });

  test("returns 400 for duplicate category at same level", async () => {
    db.get.mockResolvedValueOnce({ id: 5 }); // duplicate found
    const res = await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ name: "Beverages", outlet_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("already exists");
  });

  test("allows the same name under different outlets", async () => {
    db.get.mockResolvedValueOnce(undefined); // no duplicate in outlet 2
    db.run.mockResolvedValueOnce({ lastInsertRowid: 11, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 11, name: "Beverages", outlet_id: 2 });

    const res = await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ name: "Beverages", outlet_id: 2 });
    expect(res.status).toBe(200);
  });

  test("parent_id = 0 is coerced to null (stored as top-level)", async () => {
    db.get.mockResolvedValueOnce(undefined);
    db.run.mockResolvedValueOnce({ lastInsertRowid: 12, changes: 1 });
    db.get.mockResolvedValueOnce({ id: 12, name: "Food", parent_id: null, outlet_id: 1 });

    await request(app)
      .post("/api/catalog/categories")
      .set(auth())
      .send({ name: "Food", parent_id: 0, outlet_id: 1 });

    // parent_id: 0 is falsy → stored as null
    const insertArgs = db.run.mock.calls[0][1];
    expect(insertArgs).toContain(null);
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/catalog/categories")
      .send({ name: "Test", outlet_id: 1 });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/catalog/categories/:id ───────────────────────────────────────

describe("DELETE /api/catalog/categories/:id", () => {
  test("deletes and returns success", async () => {
    const res = await request(app)
      .delete("/api/catalog/categories/5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/catalog/categories/1");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/catalog/products ────────────────────────────────────────────────

const MOCK_PRODUCT = {
  id: 1, name: "Dark Roast", category_id: 2, outlet_id: 1,
  price: 14.99, sku: "COF-001", created_at: "2024-01-01",
  category_name: "Coffee", outlet_name: "Main Store",
  quantity: 20, threshold: 5,
};

describe("GET /api/catalog/products", () => {
  test("returns products with joined fields", async () => {
    db.all.mockResolvedValueOnce([MOCK_PRODUCT]);
    const res = await request(app).get("/api/catalog/products");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("category_name");
    expect(res.body[0]).toHaveProperty("outlet_name");
    expect(res.body[0]).toHaveProperty("quantity");
    expect(res.body[0]).toHaveProperty("threshold");
  });

  test("filters by outlet_id when query param is provided", async () => {
    db.all.mockResolvedValueOnce([MOCK_PRODUCT]);
    await request(app).get("/api/catalog/products?outlet_id=1");
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining("p.outlet_id=?"),
      expect.arrayContaining(["1"])
    );
  });

  test("filters by category_id when query param is provided", async () => {
    db.all.mockResolvedValueOnce([MOCK_PRODUCT]);
    await request(app).get("/api/catalog/products?category_id=2");
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining("p.category_id=?"),
      expect.arrayContaining(["2"])
    );
  });

  test("does not require authentication", async () => {
    const res = await request(app).get("/api/catalog/products");
    expect(res.status).toBe(200);
  });
});

// ── POST /api/catalog/products ───────────────────────────────────────────────

describe("POST /api/catalog/products", () => {
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  test("creates product plus inventory row; returns joined record", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 5, changes: 1 }); // insert product
    db.run.mockResolvedValueOnce({ lastInsertRowid: 5, changes: 1 }); // insert inventory
    db.get.mockResolvedValueOnce(MOCK_PRODUCT);

    const res = await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: "Dark Roast", category_id: 2, outlet_id: 1, price: 14.99, sku: "COF-001" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Dark Roast", category_name: "Coffee" });
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  test("initial inventory quantity is 0 (hardcoded in SQL, not in params)", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 6, changes: 1 });
    db.run.mockResolvedValueOnce({ lastInsertRowid: 6, changes: 1 });
    db.get.mockResolvedValueOnce({ ...MOCK_PRODUCT, quantity: 0 });

    await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: "New Item", category_id: 2, outlet_id: 1 });

    // quantity=0 and threshold=5 are literal values in the SQL, not bound params
    const inventoryInsertSql = db.run.mock.calls[1][0];
    expect(inventoryInsertSql).toContain("VALUES (?,?,0,5)");
  });

  test("price defaults to 0 when omitted", async () => {
    db.run.mockResolvedValueOnce({ lastInsertRowid: 7, changes: 1 });
    db.run.mockResolvedValueOnce({ lastInsertRowid: 7, changes: 1 });
    db.get.mockResolvedValueOnce({ ...MOCK_PRODUCT, price: 0 });

    await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: "Free", category_id: 2, outlet_id: 1 });

    const productInsertArgs = db.run.mock.calls[0][1];
    expect(productInsertArgs).toContain(0); // price = 0
  });

  test("XSS payload in name is stored as-is (parameterised insert prevents injection)", async () => {
    const xss = "<script>alert(1)</script>";
    db.run.mockResolvedValueOnce({ lastInsertRowid: 8, changes: 1 });
    db.run.mockResolvedValueOnce({ lastInsertRowid: 8, changes: 1 });
    db.get.mockResolvedValueOnce({ ...MOCK_PRODUCT, name: xss });

    const res = await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: xss, category_id: 2, outlet_id: 1 });

    expect(res.status).toBe(200);
    expect(db.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([xss])
    );
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ category_id: 2, outlet_id: 1 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when category_id is missing", async () => {
    const res = await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: "Test", outlet_id: 1 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when outlet_id is missing", async () => {
    const res = await request(app)
      .post("/api/catalog/products")
      .set(auth())
      .send({ name: "Test", category_id: 2 });
    expect(res.status).toBe(400);
  });

  test("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/catalog/products")
      .send({ name: "Test", category_id: 2, outlet_id: 1 });
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/catalog/products/:id ────────────────────────────────────────────

describe("PUT /api/catalog/products/:id", () => {
  test("updates and returns the updated record", async () => {
    db.get.mockResolvedValueOnce({ ...MOCK_PRODUCT, name: "Updated", price: 9.99 });
    const res = await request(app)
      .put("/api/catalog/products/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated", price: 9.99, sku: "NEW-001" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated");
  });

  test("returns 401 without auth", async () => {
    const res = await request(app).put("/api/catalog/products/1").send({ name: "X" });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/catalog/products/:id ─────────────────────────────────────────

describe("DELETE /api/catalog/products/:id", () => {
  test("deletes and returns { success: true }", async () => {
    const res = await request(app)
      .delete("/api/catalog/products/1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/catalog/products/1");
    expect(res.status).toBe(401);
  });
});
