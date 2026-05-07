// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { api } from "../api";
import { C, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { StatCard, Empty } from "../components/UI";

export default function Dashboard() {
  const { outlets }         = useApp();
  const [alerts, setAlerts] = useState([]);
  const [log, setLog]       = useState([]);
  const [inv, setInv]       = useState([]);

  useEffect(() => {
    api.getAlerts().then(d => Array.isArray(d) && setAlerts(d));
    api.getLog().then(d => Array.isArray(d) && setLog(d));
    api.getInventory().then(d => Array.isArray(d) && setInv(d));
  }, []);

  const totalStock = inv.reduce((s, i) => s + i.quantity, 0);
  const today      = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Overview</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>{outlets.length} outlets · {today}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="OUTLETS"            value={outlets.length} color={C.accent}  icon="🏪" />
        <StatCard label="TRACKED PRODUCTS"   value={inv.length}     color={C.purple}  icon="📦" />
        <StatCard label="TOTAL UNITS"        value={totalStock}     color={C.green}   icon="📊" />
        <StatCard label="LOW STOCK ALERTS"   value={alerts.length}  color={alerts.length > 0 ? C.red : C.muted} icon="⚠️" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Low stock */}
        <div style={card()}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.red }}>⚠</span> Low Stock
          </div>
          {alerts.length === 0
            ? <Empty icon="✅" message="All stock levels OK" />
            : alerts.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ color: C.text }}>{a.product_name}</span>
                  <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{a.outlet_name}</span>
                </div>
                <span style={{ color: C.red, fontWeight: 600 }}>{a.quantity} left</span>
              </div>
            ))
          }
        </div>

        {/* Recent activity */}
        <div style={card()}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 16 }}>Recent Activity</div>
          {log.length === 0
            ? <Empty icon="📋" message="No recent changes" />
            : log.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ color: r.qty_added >= 0 ? C.green : C.red, fontWeight: 600 }}>
                    {r.qty_added >= 0 ? "+" : ""}{r.qty_added}
                  </span>
                  <span style={{ color: C.muted, marginLeft: 8 }}>{r.product}</span>
                </div>
                <span style={{ color: C.muted, fontSize: 11 }}>{r.outlet} · {r.by_user}</span>
              </div>
            ))
          }
        </div>

        {/* Per-outlet summary */}
        <div style={{ ...card(), gridColumn: "1/-1" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 16 }}>Outlet Summary</div>
          {outlets.length === 0
            ? <Empty icon="🏪" message="No outlets yet — add one in Outlets" />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
                {outlets.map(o => {
                  const items = inv.filter(i => i.outlet_id === o.id);
                  const units = items.reduce((s, i) => s + i.quantity, 0);
                  const low   = items.filter(i => i.low_stock).length;
                  return (
                    <div key={o.id} style={{ background: C.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{o.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{items.length} products · {units} units</div>
                      {low > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {low} low stock</div>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
