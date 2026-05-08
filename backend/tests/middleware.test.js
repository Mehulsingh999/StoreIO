const jwt = require("jsonwebtoken");

// Middleware reads the DB indirectly, but auth/admin don't touch DB — no mock needed.
const { auth, admin } = require("../middleware/auth");

const SECRET = "storeio-secret"; // default in middleware/auth.js

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeReq = (authHeader) => ({ headers: { authorization: authHeader } });

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const validAdminToken   = jwt.sign({ id: 1, username: "boss",    role: "admin",   outlet_id: null }, SECRET, { expiresIn: "1h" });
const validManagerToken = jwt.sign({ id: 2, username: "mgr",     role: "manager", outlet_id: 1   }, SECRET, { expiresIn: "1h" });
const expiredToken      = jwt.sign({ id: 1, username: "expired"                                   }, SECRET, { expiresIn: "-1s" });
const wrongSecretToken  = jwt.sign({ id: 1, username: "hacker"                                    }, "wrong-secret", { expiresIn: "1h" });

// ─── auth middleware ──────────────────────────────────────────────────────────

describe("auth middleware", () => {
  test("calls next() and populates req.user for a valid Bearer token", () => {
    const req  = makeReq(`Bearer ${validAdminToken}`);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, username: "boss", role: "admin" });
  });

  test("returns 401 when Authorization header is absent", () => {
    const req  = makeReq(undefined);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token" });
  });

  test("returns 401 when header lacks 'Bearer ' prefix", () => {
    const req  = makeReq(validAdminToken); // no prefix
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("returns 401 for lowercase 'bearer ' prefix (case-sensitive)", () => {
    const req  = makeReq(`bearer ${validAdminToken}`);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("returns 401 for token signed with a different secret", () => {
    const req  = makeReq(`Bearer ${wrongSecretToken}`);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
  });

  test("returns 401 for an expired token", () => {
    const req  = makeReq(`Bearer ${expiredToken}`);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("returns 401 for a structurally malformed JWT", () => {
    const req  = makeReq("Bearer not.a.real.jwt");
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("returns 401 when token is an empty string after 'Bearer '", () => {
    const req  = makeReq("Bearer ");
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("req.user contains correct decoded fields from manager token", () => {
    const req  = makeReq(`Bearer ${validManagerToken}`);
    const res  = makeRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 2, username: "mgr", role: "manager", outlet_id: 1 });
  });
});

// ─── admin middleware ─────────────────────────────────────────────────────────

describe("admin middleware", () => {
  test("calls next() for a user with role 'admin'", () => {
    const req  = { user: { role: "admin" } };
    const res  = makeRes();
    const next = jest.fn();
    admin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("returns 403 for role 'manager'", () => {
    const req  = { user: { role: "manager" } };
    const res  = makeRes();
    const next = jest.fn();
    admin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin only" });
  });

  test("returns 403 when req.user is undefined (auth not applied first)", () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();
    admin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("returns 403 for null role", () => {
    const req  = { user: { role: null } };
    const res  = makeRes();
    const next = jest.fn();
    admin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
