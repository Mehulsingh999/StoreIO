// backend/db/database.js
// sql.js — pure JS SQLite, no native deps, works on all platforms
const initSqlJs = require("sql.js");
const path      = require("path");
const bcrypt    = require("bcryptjs");
const fs        = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "store.db");

let _db = null;
let _persistTimer = null;
let _batchMode = false;

// ── Persist ─────────────────────────────────────────────────────────────────
// Debounced by default (16ms), immediate in sync writes, skipped in batch mode
const persist = (immediate = false) => {
  if (_batchMode) return;
  if (immediate) {
    try { fs.writeFileSync(DB_PATH, Buffer.from(_db.export())); }
    catch (e) { console.error("DB persist error:", e.message); }
    return;
  }
  clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    try { fs.writeFileSync(DB_PATH, Buffer.from(_db.export())); }
    catch (e) { console.error("DB persist error:", e.message); }
  }, 16);
};

// batch(fn) — runs all writes inside fn without persisting after each one,
// then persists exactly once at the end. Used by the import route.
const batch = async (fn) => {
  _batchMode = true;
  try {
    const result = await fn();
    return result;
  } finally {
    _batchMode = false;
    persist(true);
  }
};

// ── Core helpers ─────────────────────────────────────────────────────────────
const run = (sql, params = []) => {
  try {
    _db.run(sql, params);
    const lastInsertRowid = _db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0;
    const changes         = _db.exec("SELECT changes()")[0]?.values[0]?.[0] ?? 0;
    persist();
    return Promise.resolve({ lastInsertRowid: Number(lastInsertRowid), changes: Number(changes) });
  } catch (e) { return Promise.reject(e); }
};

const get = (sql, params = []) => {
  try {
    const stmt = _db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return Promise.resolve(row);
  } catch (e) { return Promise.reject(e); }
};

const all = (sql, params = []) => {
  try {
    const results = _db.exec(sql, params);
    if (!results.length) return Promise.resolve([]);
    const { columns, values } = results[0];
    return Promise.resolve(
      values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])))
    );
  } catch (e) { return Promise.reject(e); }
};

// ── Schema ───────────────────────────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS outlets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    address    TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    parent_id  INTEGER,
    outlet_id  INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    outlet_id   INTEGER NOT NULL,
    price       REAL DEFAULT 0,
    sku         TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id         INTEGER NOT NULL,
    outlet_id          INTEGER NOT NULL,
    quantity           INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
  );
  CREATE TABLE IF NOT EXISTS restock_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    outlet_id  INTEGER NOT NULL,
    qty_added  INTEGER NOT NULL,
    note       TEXT DEFAULT '',
    by_user    TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'manager',
    outlet_id     INTEGER
  );
`;

// ── Seed ─────────────────────────────────────────────────────────────────────
const seed = () => {
  const count = _db.exec("SELECT COUNT(*) FROM outlets")[0]?.values[0]?.[0] ?? 0;
  if (count > 0) return;
  console.log("🌱 Seeding database…");
  _db.run("INSERT OR IGNORE INTO users (username,password_hash,role) VALUES (?,?,?)",
    ["boss", bcrypt.hashSync("boss123", 10), "admin"]);
  persist(true);
  console.log("✅ Seeded — login: boss / boss123");
};

// ── Init ──────────────────────────────────────────────────────────────────────
const dbReady = initSqlJs().then(SQL => {
  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  _db.run("PRAGMA foreign_keys = ON");
  _db.run("PRAGMA journal_mode = WAL");
  _db.run(SCHEMA);
  seed();
  console.log("✅ Database ready");
  return { run, get, all };
});

module.exports = { run, get, all, batch, dbReady };
