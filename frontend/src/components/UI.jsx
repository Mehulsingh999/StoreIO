// src/components/UI.jsx
import { C, card } from "../styles";

export const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
    <div>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{title}</h1>
      {subtitle && <p style={{ color: C.muted, fontSize: 13 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
  </div>
);

export const Empty = ({ icon = "📭", message = "Nothing here yet" }) => (
  <div style={{ textAlign: "center", padding: "48px 32px", color: C.muted }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14 }}>{message}</div>
  </div>
);

export const Spinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid ${C.border}`,
    borderTopColor: C.accent,
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  }} />
);

export const Alert = ({ type = "error", children, onClose }) => {
  const colors = { error: C.red, success: C.green, warning: C.yellow };
  const color  = colors[type] || C.muted;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      background: color + "18", border: `1px solid ${color}44`,
      borderRadius: 10, padding: "12px 16px", fontSize: 13, color,
    }}>
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none", color, cursor: "pointer", fontSize: 16, marginLeft: 12 }}>×</button>
      )}
    </div>
  );
};

export const StatCard = ({ label, value, color = C.accent, icon }) => (
  <div style={{ ...card(), flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1 }}>{label}</div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
  </div>
);

// Inline spin keyframes injected once
if (typeof document !== "undefined" && !document.getElementById("storeio-spin")) {
  const s = document.createElement("style");
  s.id = "storeio-spin";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}
