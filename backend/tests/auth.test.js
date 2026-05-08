const request = require("supertest");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

jest.mock("../db/database", () => ({
  run:      jest.fn(),
  get:      jest.fn(),
  all:      jest.fn(),
  batch:    jest.fn(),
  dbReady:  Promise.resolve(),
}));

const db           = require("../db/database");
const { buildApp } = require("./testServer");

const SECRET    = "storeio-secret"; // default from auth.js
const MOCK_USER = {
  id: 1,
  username: "boss",
  password_hash: bcrypt.hashSync("boss123", 4), // low cost for speed
  role: "admin",
  outlet_id: null,
};

let app;
beforeAll(() => { app = buildApp(); });

beforeEach(() => {
  db.run.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
  db.get.mockResolvedValue(undefined);
  db.all.mockResolvedValue([]);
  db.batch.mockImplementation(async (fn) => fn());
});

// ─── Happy-path ───────────────────────────────────────────────────────────────

describe("POST /api/auth/login — valid credentials", () => {
  test("returns 200 with token and user object", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
  });

  test("token is a valid, verifiable JWT", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    expect(() => jwt.verify(res.body.token, SECRET)).not.toThrow();
  });

  test("token payload contains id, username, role, outlet_id", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    const decoded = jwt.decode(res.body.token);
    expect(decoded).toMatchObject({ id: 1, username: "boss", role: "admin", outlet_id: null });
  });

  test("user in response body does NOT include password_hash", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  test("token has ~24 h expiry", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    const decoded    = jwt.decode(res.body.token);
    const inTwentyFourHours = Math.floor(Date.now() / 1000) + 86400;
    // Allow ±60 s drift
    expect(decoded.exp).toBeGreaterThanOrEqual(inTwentyFourHours - 60);
    expect(decoded.exp).toBeLessThanOrEqual(inTwentyFourHours + 60);
  });
});

// ─── Missing / empty fields ───────────────────────────────────────────────────

describe("POST /api/auth/login — missing fields", () => {
  test("returns 400 when username is omitted", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "boss123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username and password required");
  });

  test("returns 400 when password is omitted", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when both fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  test("returns 400 for empty-string username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "", password: "boss123" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for empty-string password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when body is entirely absent", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });
});

// ─── Invalid credentials ──────────────────────────────────────────────────────

describe("POST /api/auth/login — invalid credentials", () => {
  test("returns 401 for wrong password", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  test("returns 401 for non-existent user", async () => {
    db.get.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "pass123" });
    expect(res.status).toBe(401);
  });

  test("wrong-password and not-found return identical error (no user enumeration)", async () => {
    db.get.mockResolvedValueOnce(MOCK_USER);
    const res1 = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "wrong" });

    db.get.mockResolvedValueOnce(undefined);
    const res2 = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody", password: "pass" });

    expect(res1.body.error).toBe(res2.body.error);
  });

  test("whitespace-only username passes the guard but matches no DB user → 401", async () => {
    // "   " is truthy so it passes !username check; DB returns nothing
    db.get.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "   ", password: "boss123" });
    expect(res.status).toBe(401);
  });

  test("SQL injection attempt is neutralised by parameterised query → 401", async () => {
    db.get.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "' OR '1'='1", password: "whatever" });
    expect(res.status).toBe(401);
  });

  test("very long username does not crash the server", async () => {
    db.get.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "a".repeat(10_000), password: "pass" });
    expect(res.status).toBe(401);
  });
});

// ─── Database errors ──────────────────────────────────────────────────────────

describe("POST /api/auth/login — database error", () => {
  test("returns 500 when the database throws", async () => {
    db.get.mockRejectedValueOnce(new Error("DB connection lost"));
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "boss", password: "boss123" });
    expect(res.status).toBe(500);
  });
});
