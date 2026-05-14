// src/pages/ImportPage.jsx
import React, { useState, useRef } from "react";
import { api } from "../api";
import { C, btn, card } from "../styles";
import { PageHeader, Alert } from "../components/UI";
import { Download, Upload, CheckCircle, AlertTriangle } from "../icons";

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

const Step = ({ num, title, children }) => (
  <div style={{ display: "flex", gap: 20 }}>
    {/* Connector column */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#3b82f6,#6366f1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#fff",
        boxShadow: "0 3px 10px rgba(59,130,246,.35)",
      }}>{num}</div>
      <div style={{ width: 1, flex: 1, background: `${C.border}`, marginTop: 6, marginBottom: 6, minHeight: 16 }} />
    </div>
    {/* Content */}
    <div style={{ flex: 1, paddingBottom: 24 }}>
      <div className="si-section-title" style={{ fontSize: 15, marginBottom: 12, marginTop: 6 }}>
        {title}
      </div>
      {children}
    </div>
  </div>
);

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
    <div className="si-page" style={{ padding: "32px 36px", maxWidth: 760 }}>
      <PageHeader title="Import Excel" subtitle="Bulk-import products and inventory from a spreadsheet" />

      <Step num="1" title="Download the template">
        <div className="si-import-dl-card" style={{
          ...card(), display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 20px",
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>inventory-template.xlsx</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Pre-filled example showing the expected column format</div>
          </div>
          <a href="/api/import/template" download
            className="si-btn-primary"
            style={{ ...btn("primary"), textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            <Download size={14} /> Download
          </a>
        </div>

        {/* Column reference */}
        <div style={{ ...card(), marginTop: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Column Reference
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,auto) 1fr", gap: "6px 20px", fontSize: 13 }}>
            {COLUMNS.map(([col, desc]) => (
              <React.Fragment key={col}>
                <div style={{ color: "#93c5fd", fontFamily: "monospace", fontSize: 12 }}>{col}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{desc}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </Step>

      <Step num="2" title="Upload your file">
        <div
          className="si-drop-zone"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.accent : C.border}`,
            borderRadius: 14, padding: "48px 32px", textAlign: "center",
            cursor: loading ? "default" : "pointer",
            background: dragging ? "rgba(59,130,246,.05)" : C.surface,
            transition: "all .2s",
            position: "relative", overflow: "hidden",
          }}>
          {dragging && (
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(circle at center,rgba(59,130,246,.08) 0%,transparent 70%)",
              pointerEvents: "none",
            }} />
          )}

          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px",
            background: loading ? C.border + "80" : `rgba(59,130,246,.12)`,
            border: `1px solid ${loading ? C.border : "rgba(59,130,246,.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
          }}>
            {loading
              ? <div style={{ width:20, height:20, border:"2px solid rgba(255,255,255,.15)", borderTopColor:C.accent, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
              : <Upload size={20} stroke={dragging ? C.accent : C.muted} />
            }
          </div>

          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: loading ? C.muted : C.text }}>
            {loading ? "Importing…" : dragging ? "Drop to upload" : "Drop your Excel file here"}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {loading ? "Processing rows…" : "or click to browse · .xlsx or .xls"}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {error && (
          <div style={{ marginTop: 12 }}>
            <Alert type="error" onClose={() => setError("")}>{error}</Alert>
          </div>
        )}
      </Step>

      <Step num="3" title="Review results">
        {!result
          ? (
            <div style={{
              ...card(), padding: "20px 22px",
              color: C.muted, fontSize: 13, textAlign: "center",
              borderStyle: "dashed",
            }}>
              Results will appear here after you upload a file
            </div>
          )
          : (
            <div className="si-slide" style={{
              ...card(),
              borderColor: result.errors?.length ? `${C.yellow}44` : `${C.green}44`,
              background: result.errors?.length ? `${C.yellow}08` : `${C.green}08`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                {result.errors?.length
                  ? <AlertTriangle size={16} stroke={C.yellow} />
                  : <CheckCircle size={16} stroke={C.green} />
                }
                <span style={{
                  fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14,
                  color: result.errors?.length ? C.yellow : C.green,
                }}>
                  Import {result.errors?.length ? "completed with warnings" : "successful"}
                </span>
              </div>

              <div className="si-import-stats" style={{ display: "flex", gap: 28, marginBottom: result.errors?.length ? 18 : 0 }}>
                {[
                  { label: "Imported", value: result.imported, color: C.green },
                  { label: "Skipped",  value: result.skipped,  color: C.yellow },
                  { label: "Errors",   value: result.errors?.length || 0, color: C.red },
                  { label: "Total",    value: result.total,    color: C.muted },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{
                      fontSize: 30, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif",
                      color, lineHeight: 1,
                    }}>{value}</div>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {result.errors?.length > 0 && (
                <div style={{ background: `${C.red}10`, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.red}22` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Row errors
                  </div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.red, marginBottom: 4, display: "flex", gap: 6 }}>
                      <span style={{ color: C.muted, flexShrink: 0 }}>·</span>{e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
      </Step>
    </div>
  );
}
