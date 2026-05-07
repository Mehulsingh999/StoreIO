// src/pages/ImportPage.jsx
import { useState, useRef } from "react";
import { api } from "../api";
import { C, btn, card } from "../styles";
import { PageHeader, Alert } from "../components/UI";

const COLUMNS = [
  ["outlet",          "Store name (e.g. Main Store)"],
  ["category",        "Top-level category (e.g. Beverages)"],
  ["subcategory",     "2nd level — optional"],
  ["sub_subcategory", "3rd level — optional"],
  ["product",         "Product name *required"],
  ["price",           "Price in dollars (e.g. 14.99)"],
  ["quantity",        "Stock count (e.g. 30)"],
  ["sku",             "SKU code — optional"],
];

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) { setError("Please upload an .xlsx or .xls file"); return; }
    setLoading(true); setError(""); setResult(null);
    const data = await api.importExcel(file);
    setLoading(false);
    if (data.error) setError(data.error);
    else setResult(data);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720 }}>
      <PageHeader title="Import Excel" subtitle="Bulk-import products and inventory from a spreadsheet" />

      {/* Template download */}
      <div style={{ ...card(), marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>📥 Download Template</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Pre-filled Excel showing the expected column format</div>
        </div>
        <a href="/api/import/template" download
          style={{ ...btn("primary"), textDecoration: "none", whiteSpace: "nowrap" }}>
          Download .xlsx
        </a>
      </div>

      {/* Column guide */}
      <div style={{ ...card(), marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
          Expected Columns
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(130px,auto) 1fr", gap: "6px 20px", fontSize: 13 }}>
          {COLUMNS.map(([col, desc]) => (
            <>
              <div key={col + "k"} style={{ color: "#93c5fd", fontFamily: "monospace" }}>{col}</div>
              <div key={col + "v"} style={{ color: C.muted }}>{desc}</div>
            </>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.accent : C.border}`,
          borderRadius: 16, padding: "52px 32px", textAlign: "center",
          cursor: loading ? "default" : "pointer",
          background: dragging ? C.accent + "11" : C.surface,
          transition: "all .2s", marginBottom: 20,
        }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{loading ? "⏳" : "📂"}</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          {loading ? "Importing…" : "Drop your Excel file here"}
        </div>
        <div style={{ color: C.muted, fontSize: 13 }}>or click to browse · .xlsx or .xls</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <Alert type="error" onClose={() => setError("")} style={{ marginBottom: 16 }}>
          {error}
        </Alert>
      )}

      {result && (
        <div style={{ ...card(), background: C.green + "11", borderColor: C.green + "44" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: C.green, marginBottom: 12 }}>
            ✓ Import Complete
          </div>
          <div style={{ display: "flex", gap: 32, fontSize: 14, marginBottom: result.errors?.length ? 16 : 0 }}>
            <div>
              <span style={{ color: C.green, fontWeight: 700, fontSize: 22 }}>{result.imported}</span>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>IMPORTED</div>
            </div>
            <div>
              <span style={{ color: C.yellow, fontWeight: 700, fontSize: 22 }}>{result.skipped}</span>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>SKIPPED</div>
            </div>
            <div>
              <span style={{ color: C.red, fontWeight: 700, fontSize: 22 }}>{result.errors?.length || 0}</span>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>ERRORS</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>ERRORS:</div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: C.red, marginBottom: 3 }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
