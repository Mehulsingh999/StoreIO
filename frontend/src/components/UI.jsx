// src/components/UI.jsx
import { C, card } from "../styles";
import { CheckCircle, AlertTriangle, X } from "../icons";

export const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 28, paddingBottom: 22,
    borderBottom: `1px solid ${C.border}`,
  }}>
    <div>
      <h1 style={{
        fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 5,
        color: C.text, letterSpacing: -.3,
      }}>{title}</h1>
      {subtitle && <p style={{ color: C.muted, fontSize: 13 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>{actions}</div>}
  </div>
);

export const Empty = ({ icon, message = "Nothing here yet" }) => (
  <div style={{ textAlign: "center", padding: "52px 32px", color: C.muted }}>
    {icon && (
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
        background: `${C.border}80`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {typeof icon === "string"
          ? <span style={{ fontSize: 22 }}>{icon}</span>
          : icon
        }
      </div>
    )}
    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.textSoft }}>{message}</div>
  </div>
);

export const Spinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid ${C.border}`,
    borderTopColor: C.accent,
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  }} />
);

export const Skeleton = ({ width = "100%", height = 16, style = {} }) => (
  <div className="si-shimmer" style={{ width, height, borderRadius: 6, ...style }} />
);

export const Alert = ({ type = "error", children, onClose }) => {
  const map = {
    error:   { color: C.red,    Icon: AlertTriangle },
    success: { color: C.green,  Icon: CheckCircle   },
    warning: { color: C.yellow, Icon: AlertTriangle },
    info:    { color: C.accent, Icon: CheckCircle   },
  };
  const { color, Icon } = map[type] || map.error;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: color + "12",
      border: `1px solid ${color}35`,
      borderLeft: `4px solid ${color}`,
      borderRadius: "0 8px 8px 0",
      padding: "12px 14px", fontSize: 13, color,
      animation: "slideUp .22s ease",
    }}>
      <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, color: C.text }}>{children}</div>
      {onClose && (
        <button onClick={onClose} style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", padding: 2, display: "flex", flexShrink: 0,
        }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export const StatCard = ({ label, value, color = C.accent, icon: Icon, trend }) => (
  <div className="si-card-hover" style={{
    ...card(), flex: 1, minWidth: 150, position: "relative", overflow: "hidden",
    paddingLeft: 20,
  }}>
    {/* Left accent bar */}
    <div style={{
      position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
      background: color, borderRadius: "14px 0 0 14px",
    }} />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>
          {label}
        </div>
        <div style={{
          fontSize: 30, fontWeight: 800, fontFamily: "'Syne',sans-serif",
          color, lineHeight: 1,
        }}>
          {value}
        </div>
        {trend !== undefined && (
          <div style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, marginTop: 6, fontWeight: 600 }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      {Icon && (
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: color + "18", border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} stroke={color} />
        </div>
      )}
    </div>
  </div>
);
