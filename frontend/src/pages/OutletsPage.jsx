// src/pages/OutletsPage.jsx
import { useState, useEffect } from "react";
import { api } from "../api";
import { C, btn, input, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { PageHeader, Empty, Alert, Skeleton } from "../components/UI";
import { Store, Plus, Trash2 } from "../icons";

export default function OutletsPage() {
  const { outlets, refreshOutlets } = useApp();
  const [name, setName]         = useState("");
  const [address, setAddress]   = useState("");
  const [error, setError]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inv, setInv]           = useState([]);
  const [invLoading, setInvLoading] = useState(true);

  useEffect(() => {
    api.getInventory().then(d => {
      if (Array.isArray(d)) setInv(d);
    }).finally(() => setInvLoading(false));
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true); setError("");
    const r = await api.addOutlet({ name: name.trim(), address: address.trim() });
    setAdding(false);
    if (r.error) { setError(r.error); return; }
    setName(""); setAddress(""); setShowForm(false);
    refreshOutlets();
  };

  const del = async (id, n) => {
    if (!confirm(`Delete outlet "${n}"? This will also remove all its products and inventory.`)) return;
    await api.deleteOutlet(id);
    refreshOutlets();
  };

  return (
    <div className="si-page" style={{ padding: "32px 36px", maxWidth: 860 }}>
      <PageHeader
        title="Outlets"
        subtitle="Manage your store locations"
        actions={
          <button className="si-btn-primary" style={btn("primary")}
            onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> {showForm ? "Cancel" : "Add Outlet"}
          </button>
        }
      />

      {/* Add form */}
      {showForm && (
        <div className="si-slide" style={{ ...card(), marginBottom: 22, borderColor: `${C.accent}22` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
            New Outlet
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="si-input" style={{ ...input(), maxWidth: 200 }} placeholder="Outlet name *"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()} />
            <input className="si-input" style={{ ...input(), maxWidth: 300 }} placeholder="Address (optional)"
              value={address} onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()} />
            <button className="si-btn-primary" style={btn("primary")}
              onClick={add} disabled={adding || !name.trim()}>
              {adding
                ? <><div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> Adding…</>
                : <><Plus size={14} /> Add</>
              }
            </button>
          </div>
          {error && <div style={{ marginTop: 10 }}><Alert type="error" onClose={() => setError("")}>{error}</Alert></div>}
        </div>
      )}

      {/* Grid */}
      {outlets.length === 0
        ? (
          <div style={{ ...card(), textAlign: "center", padding: "52px 32px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: C.border + "80",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Store size={24} stroke={C.muted} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textSoft, marginBottom: 6 }}>No outlets yet</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Add your first store location to get started</div>
            <button className="si-btn-primary" style={{ ...btn("primary"), margin: "0 auto" }}
              onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add your first outlet
            </button>
          </div>
        )
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {outlets.map(o => (
              <div key={o.id} className="si-outlet-card" style={{
                ...card(), padding: "20px 22px", position: "relative",
              }}>
                {/* Delete btn — revealed on hover via CSS */}
                <button className="si-outlet-del si-btn-danger" style={{
                  ...btn("danger"), position: "absolute", top: 14, right: 14,
                  padding: "5px 8px", fontSize: 12, opacity: 0,
                }} onClick={() => del(o.id, o.name)}>
                  <Trash2 size={13} />
                </button>

                {/* Icon + name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(59,130,246,.15),rgba(99,102,241,.1))",
                    border: `1px solid rgba(59,130,246,.18)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Store size={18} stroke={C.accent} />
                  </div>
                  <div style={{ minWidth: 0, paddingRight: 36 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>{o.name}</div>
                    {o.address
                      ? <div style={{ color: C.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.address}</div>
                      : <div style={{ color: C.border, fontSize: 12, fontStyle: "italic" }}>No address</div>
                    }
                  </div>
                </div>

                <div style={{ height: 1, background: C.border, marginBottom: 12 }} />

                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>ID</div>
                    <div style={{ fontSize: 13, color: C.textSoft }}>#{o.id}</div>
                  </div>
                  {o.manager && (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Manager</div>
                      <div style={{ fontSize: 13, color: C.textSoft }}>{o.manager}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Outlet Health */}
      {outlets.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
            Outlet Health
          </div>

          {invLoading
            ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {[0,1,2].map(i => <div key={i} style={{ height: 96 }}><Skeleton height="100%" style={{ borderRadius: 10 }} /></div>)}
              </div>
            )
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {outlets.map(o => {
                  const items    = inv.filter(i => i.outlet_id === o.id);
                  const units    = items.reduce((s, i) => s + i.quantity, 0);
                  const low      = items.filter(i => i.low_stock || i.quantity <= (i.low_stock_threshold || 5)).length;
                  const health   = items.length ? Math.max(0, 100 - (low / items.length) * 100) : 100;
                  const barColor = health > 80 ? C.green : health > 50 ? C.yellow : C.red;

                  return (
                    <div key={o.id} style={{
                      background: C.surface, borderRadius: 12, padding: "14px 16px",
                      border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{o.name}</div>
                        {low > 0 && (
                          <span style={{ background: C.red + "20", color: C.red, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: `1px solid ${C.red}30` }}>
                            {low} low
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                        {items.length} product{items.length !== 1 ? "s" : ""} · {units} units
                      </div>
                      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${health}%`, background: barColor, borderRadius: 2, transition: "width .5s ease" }} />
                      </div>
                      <div style={{ marginTop: 5, fontSize: 11, color: C.muted }}>
                        <span style={{ color: barColor, fontWeight: 600 }}>{health.toFixed(0)}%</span> healthy
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
