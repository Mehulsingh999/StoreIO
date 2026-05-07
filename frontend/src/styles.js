// src/styles.js
export const C = {
  bg:        "#080b0f",
  surface:   "#0d1117",
  card:      "#111827",
  border:    "#1e2d3d",
  accent:    "#3b82f6",
  accentDim: "#1d4ed8",
  green:     "#10b981",
  red:       "#ef4444",
  yellow:    "#f59e0b",
  purple:    "#8b5cf6",
  text:      "#e2e8f0",
  muted:     "#64748b",
};

export const btn = (variant = "primary", extra = {}) => ({
  padding: "9px 18px", borderRadius: 8, border: "none",
  cursor: "pointer", fontSize: 13, fontWeight: 500,
  transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 6,
  ...(variant === "primary" ? { background: C.accent,       color: "#fff" }                                          : {}),
  ...(variant === "ghost"   ? { background: "transparent",  color: C.muted,  border: `1px solid ${C.border}` }      : {}),
  ...(variant === "danger"  ? { background: "transparent",  color: C.red,    border: `1px solid ${C.red}33` }       : {}),
  ...(variant === "success" ? { background: C.green + "22", color: C.green,  border: `1px solid ${C.green}44` }     : {}),
  ...(variant === "purple"  ? { background: C.purple + "22",color: C.purple, border: `1px solid ${C.purple}44` }    : {}),
  ...extra,
});

export const input = (extra = {}) => ({
  padding: "9px 14px", borderRadius: 8,
  background: C.surface, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13, outline: "none", width: "100%",
  ...extra,
});

export const card = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: 20,
  ...extra,
});

export const badge = (color = C.muted, extra = {}) => ({
  display: "inline-flex", alignItems: "center",
  padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
  background: color + "22", color, border: `1px solid ${color}44`,
  ...extra,
});
