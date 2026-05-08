const request = require("supertest");
const jwt     = require("jsonwebtoken");
const XLSX    = require("xlsx");

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeExcel = (rows) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

const VALID_ROW = {
  outlet: "Main Store", category: "Beverages", subcategory: "Coffee",
  sub_subcategory: "", product: "Dark Roast", price: 14.99, quantity: 30, sku: "COF-001",
};

let app;
beforeAll(() => { app = buildApp(); });
beforeEach(() => {
  db.run.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
  db.get.mockResolvedValue(undefined);
  db.all.mockResolvedValue([]);
  db.batch.mockImplementation(async (fn) => fn());
});

// ── GET /api/import/template ──────────────────────────────────────────────────

describe("GET /api/import/template", () => {
  test("returns xlsx attachment with correct Content-Type", async () => {
    const res = await request(app).get("/api/import/template");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("inventory-template.xlsx");
  });

  test("template is a parseable Excel file with expected columns", async () => {
    // Use a custom parser to reliably buffer the binary XLSX response body.
    const res = await request(app)
      .get("/api/import/template")
      .parse((r, cb) => {
        const bufs = [];
        r.on("data", (c) => bufs.push(c));
        r.on("end", () => cb(null, Buffer.concat(bufs)));
      });

    expect(Buffer.isBuffer(res.body)).toBe(true);
    const wb   = XLSX.read(res.body, { type: "buffer" });
    expect(wb.SheetNames).toHaveLength(1);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    expect(rows.length).toBeGreaterThan(0);
    ["outlet", "category", "product"].forEach((col) =>
      expect(rows[0]).toHaveProperty(col)
    );
  });

  test("does not require authentication", async () => {
    const res = await request(app).get("/api/import/template");
    expect(res.status).toBe(200);
  });
});

// ── POST /api/import/excel ────────────────────────────────────────────────────

describe("POST /api/import/excel", () => {
  test("returns 401 without auth token", async () => {
    const res = await request(app).post("/api/import/excel");
    expect(res.status).toBe(401);
  });

  test("returns 400 when no file is attached", async () => {
    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No file uploaded");
  });

  test("returns 400 for an empty spreadsheet", async () => {
    const ws  = XLSX.utils.aoa_to_sheet([]); // header-less empty sheet
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", buf, "empty.xlsx");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Empty sheet");
  });

  test("returns 400 for a non-Excel binary payload", async () => {
    // XLSX.read is lenient — it may parse arbitrary text as an empty CSV sheet
    // (→ "Empty sheet") OR throw a parse error (→ "Could not parse Excel file").
    // Either way the route must reject with 400.
    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("definitely not xlsx"), "bad.xlsx");

    expect(res.status).toBe(400);
    expect(["Could not parse Excel file", "Empty sheet"]).toContain(res.body.error);
  });

  test("imports a valid row and reports imported=1, skipped=0, errors=[]", async () => {
    // Sequence: outlet get→miss run→id1, cat1 get→miss run→id1, cat2 get→miss run→id2,
    //           product get→miss run→id1, inventory run→id1
    db.get
      .mockResolvedValueOnce(undefined) // outlet
      .mockResolvedValueOnce(undefined) // category l1
      .mockResolvedValueOnce(undefined) // category l2
      .mockResolvedValueOnce(undefined); // product
    db.run
      .mockResolvedValueOnce({ lastInsertRowid: 1 }) // create outlet
      .mockResolvedValueOnce({ lastInsertRowid: 1 }) // create cat l1
      .mockResolvedValueOnce({ lastInsertRowid: 2 }) // create cat l2
      .mockResolvedValueOnce({ lastInsertRowid: 1 }) // create product
      .mockResolvedValueOnce({ lastInsertRowid: 1 }); // create inventory

    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", makeExcel([VALID_ROW]), "data.xlsx");

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.total).toBe(1);
  });

  test("skips rows that have no outlet or no product name", async () => {
    const rows = [
      { outlet: "",           category: "Bev", product: "Coffee" }, // no outlet
      { outlet: "Main Store", category: "Bev", product: ""       }, // no product
    ];
    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", makeExcel(rows), "partial.xlsx");

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(2);
    expect(res.body.imported).toBe(0);
  });

  test("skips rows with outlet and product but no category (parentId stays null)", async () => {
    const rows = [{ outlet: "Store", product: "Widget", price: 1, quantity: 5 }];
    const res  = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", makeExcel(rows), "nocat.xlsx");

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(1);
  });

  test("re-uses existing outlet / category / product instead of duplicating them", async () => {
    db.get
      .mockResolvedValueOnce({ id: 10 }) // outlet exists
      .mockResolvedValueOnce({ id: 20 }) // cat l1 exists
      .mockResolvedValueOnce({ id: 30 }) // cat l2 exists
      .mockResolvedValueOnce({ id: 40 }); // product exists → UPDATE path

    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", makeExcel([VALID_ROW]), "update.xlsx");

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    // Product UPDATE (not INSERT) was used
    const updateCall = db.run.mock.calls.find((c) => c[0].includes("UPDATE products"));
    expect(updateCall).toBeDefined();
  });

  test("captures per-row DB errors without aborting the entire import", async () => {
    // Row 1 throws a DB error; row 2 succeeds
    db.get
      .mockRejectedValueOnce(new Error("lock timeout")) // row 1 explodes
      .mockResolvedValueOnce(undefined)                 // row 2 outlet
      .mockResolvedValueOnce(undefined)                 // row 2 cat l1
      .mockResolvedValueOnce(undefined)                 // row 2 cat l2
      .mockResolvedValueOnce(undefined);                // row 2 product
    db.run.mockResolvedValue({ lastInsertRowid: 1 });

    const res = await request(app)
      .post("/api/import/excel")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", makeExcel([VALID_ROW, VALID_ROW]), "two.xlsx");

    expect(res.status).toBe(200);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    expect(res.body.errors[0]).toMatch(/Row \d+/);
    expect(res.body.imported).toBe(1); // second row succeeded
  });
});
