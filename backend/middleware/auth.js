// backend/middleware/auth.js
const jwt    = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "storeio-secret";

const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(h.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const admin = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ error: "Admin only" });

module.exports = { auth, admin };
