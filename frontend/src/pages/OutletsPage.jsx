// src/pages/OutletsPage.jsx
import { useState } from "react";
import { api } from "../api";
import { C, btn, input, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { PageHeader, Empty, Alert } from "../components/UI";

export default function OutletsPage() {
  const { outlets, refreshOutlets } = useApp();
  const [name, setName]       = useState("");
  const [address, setAddress] = useState("");
  const [error, setError]     = useState("");
  const [adding, setAdding]   = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true); setError("");
    const r = await api.addOutlet({ name: name.trim(), address: address.trim() });
    setAdding(false);
    if (r.error) { setError(r.error); return; }
    setName(""); setAddress("");
    refreshOutlets();
  };

  const del = async (id, n) => {
    if (!confirm(`Delete outlet "${n}"? This will also remove all its products and inventory.`)) return;
    await api.deleteOutlet(id);
    refreshOutlets();
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 680 }}>
      <PageHeader title="Outlets" subtitle="Manage your store locations" />

      {/* Add form */}
      <div style={{ ...card(), marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
          Add New Outlet
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...input(), maxWidth: 200 }} placeholder="Outlet name *"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <input style={{ ...input(), maxWidth: 280 }} placeholder="Address (optional)"
            value={address} onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <button style={btn("primary")} onClick={add} disabled={adding || !name.trim()}>
            {adding ? "Adding…" : "Add Outlet"}
          </button>
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {/* List */}
      {outlets.length === 0
        ? <Empty icon="🏪" message="No outlets yet. Add your first store location above." />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {outlets.map(o => (
              <div key={o.id} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{o.name}</div>
                  {o.address && <div style={{ color: C.muted, fontSize: 12 }}>{o.address}</div>}
                </div>
                <button style={btn("danger")} onClick={() => del(o.id, o.name)}>Delete</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
