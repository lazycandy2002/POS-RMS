import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"

const EMPTY_FORM = {
  name: "", category: "", description: "", keywords: "",
  price_retail: "", price_gov: "", price_installer: "", price_um: "", remaining_bal: "", stockout: "", remarks: "",
  warranty: ""
}

const PAGE_SIZE = 50

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // ─── NAME TOOLTIP (follows cursor when a truncated name is hovered) ───────
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 })

  const handleNameMouseMove = (e, name) => {
    setTooltip({ show: true, text: name || "—", x: e.clientX, y: e.clientY })
  }
  const handleNameMouseLeave = () => {
    setTooltip(t => ({ ...t, show: false }))
  }

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => { setPage(1) }, [search])

  // ─── ESC KEY: close topmost modal first ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return }
      if (showForm) { setShowForm(false); return }
      if (showDetail) { setShowDetail(false); return }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showDeleteConfirm, showForm, showDetail])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError("")
    setShowForm(true)
  }

  const openEdit = (p) => {
    setForm({
      name: p.name || "", category: p.category || "",
      description: p.description || "", keywords: p.keywords || "",
      price_retail: p.price_retail ?? "", price_gov: p.price_gov ?? "",
      price_installer: p.price_installer ?? "",
      price_um: p.price_um || "",
      remaining_bal: p.remaining_bal ?? "", stockout: p.stockout ?? "",
      remarks: p.remarks || "",
      warranty: p.warranty || ""
    })
    setEditId(p.id)
    setError("")
    setShowForm(true)
    setShowDetail(false)
  }

  const openDetail = (p) => { setSelected(p); setShowDetail(true) }
  const confirmDelete = (p) => { setDeleteTarget(p); setShowDeleteConfirm(true); setShowDetail(false) }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return }
    if (!form.warranty.trim()) { setError("Warranty is required."); return }
    setSaving(true)
    const payload = {
      name: form.name, category: form.category, description: form.description,
      keywords: form.keywords,
      price_retail: form.price_retail === "" ? null : Number(form.price_retail),
      price_gov: form.price_gov === "" ? null : Number(form.price_gov),
      price_installer: form.price_installer === "" ? null : Number(form.price_installer),
      price_um: form.price_um || null,
      remaining_bal: form.remaining_bal === "" ? null : Number(form.remaining_bal),
      stockout: form.stockout === "" ? null : Number(form.stockout),
      remarks: form.remarks,
      warranty: form.warranty.trim()
    }
    if (editId) {
      await supabase.from("products").update(payload).eq("id", editId)
    } else {
      await supabase.from("products").insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    fetchProducts()
  }

  const handleDelete = async () => {
    await supabase.from("products").delete().eq("id", deleteTarget.id)
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
    fetchProducts()
  }

  const fmt = (n) => n != null ? `₱${Number(n).toLocaleString()}` : "—"

  const filtered = products.filter(p =>
    [p.name, p.category, p.keywords].some(f =>
      (f || "").toLowerCase().includes(search.toLowerCase())
    )
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…")
      acc.push(n)
      return acc
    }, [])

  return (
    <DashboardLayout>
      <style>{`
        .prod-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .prod-title { font-size:22px; font-weight:700; color:#111827; }
        .prod-actions { display:flex; gap:10px; align-items:center; }
        .search-input {
          padding:9px 14px; border:1px solid #ddd; border-radius:8px;
          font-size:13px; outline:none; width:220px; font-family:Segoe UI;
        }
        .search-input:focus { border-color:#b30000; box-shadow:0 0 0 2px rgba(179,0,0,0.15); }
        .btn-add {
          padding:9px 18px; background:#b30000; color:white; border:none;
          border-radius:8px; font-weight:600; cursor:pointer; font-size:13px;
          display:flex; align-items:center; gap:6px; transition:background 0.2s;
        }
        .btn-add:hover { background:#e00000; }

        .table-wrap { background:white; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.07); }
        .table-scroll { height:680px; overflow-y:auto; overflow-x:hidden; width:100%; }
        .table-scroll table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .table-scroll thead { background:#111827; color:white; position:sticky; top:0; z-index:1; }
        .table-scroll th { padding:13px 10px; text-align:left; font-size:11px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .table-scroll td { padding:13px 10px; font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6; overflow:hidden; }
        .table-scroll tr:last-child td { border-bottom:none; }
        .table-scroll tr:hover td { background:#fafafa; }

        /* Name column: single line, ellipsis when too long */
        .name-cell {
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          max-width:1px; /* forces the cell to respect table-layout:fixed sizing */
          cursor:default;
        }

        .cat-cell, .um-cell, .warranty-cell {
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        /* Cursor-following tooltip for truncated names */
        .name-tooltip {
          position:fixed; z-index:2000; pointer-events:none;
          background:#111827; color:white; font-size:12px; font-weight:500;
          padding:6px 10px; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.25);
          max-width:320px; white-space:normal; word-break:break-word;
        }

        .pagination { display:flex; align-items:center; justify-content:flex-end; gap:6px; padding:12px 16px; background:white; border-top:1px solid #f3f4f6; }
        .page-info { font-size:12px; color:#6b7280; margin-right:6px; }
        .page-btn { padding:5px 11px; border:1px solid #e5e7eb; border-radius:6px; background:white; cursor:pointer; font-size:13px; color:#374151; font-weight:500; line-height:1.4; }
        .page-btn:hover:not(:disabled) { background:#f3f4f6; }
        .page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .page-btn.active { background:#b30000; color:white; border-color:#b30000; }
        .page-ellipsis { font-size:13px; color:#9ca3af; padding:0 2px; }

        .badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:#f0fdf4; color:#16a34a; display:inline-block; }
        .badge.low { background:#fef2f2; color:#b91c1c; }
        .action-btns { display:flex; gap:4px; flex-wrap:nowrap; }
        .btn-view { padding:5px 8px; background:#f3f4f6; border:none; border-radius:6px; cursor:pointer; font-size:11px; color:#374151; white-space:nowrap; }
        .btn-view:hover { background:#e5e7eb; }
        .btn-edit { padding:5px 8px; background:#dbeafe; border:none; border-radius:6px; cursor:pointer; font-size:11px; color:#1d4ed8; white-space:nowrap; }
        .btn-edit:hover { background:#bfdbfe; }
        .btn-del { padding:5px 8px; background:#fee2e2; border:none; border-radius:6px; cursor:pointer; font-size:11px; color:#b91c1c; white-space:nowrap; }
        .btn-del:hover { background:#fecaca; }

        .overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.45);
          display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px;
        }
        .modal {
          background:white; border-radius:16px; padding:30px;
          width:100%; max-width:540px; max-height:90vh; overflow-y:auto;
          box-shadow:0 20px 60px rgba(0,0,0,0.25); animation: popIn 0.2s ease;
        }
        @keyframes popIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        .modal-title { font-size:18px; font-weight:700; color:#111827; margin-bottom:20px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-full { grid-column:1/-1; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        label { font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.4px; }
        .form-input {
          padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;
          font-size:13px; outline:none; font-family:Segoe UI; color:#111827;
        }
        .form-input:focus { border-color:#b30000; box-shadow:0 0 0 2px rgba(179,0,0,0.15); }
        .form-input.required-missing { border-color:#ef4444; background:#fef2f2; }
        textarea.form-input { resize:vertical; min-height:70px; }
        .modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; align-items:center; }
        .esc-hint { font-size:11px; color:#9ca3af; display:flex; align-items:center; gap:5px; margin-right:auto; }
        .esc-key {
          display:inline-block; padding:2px 7px; border:1px solid #d1d5db;
          border-radius:4px; font-size:10px; font-family:monospace; background:#f9fafb;
          color:#6b7280; box-shadow:0 1px 0 #d1d5db; line-height:1.6;
        }
        .btn-cancel { padding:10px 20px; background:#f3f4f6; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
        .btn-cancel:hover { background:#e5e7eb; }
        .btn-save { padding:10px 24px; background:#b30000; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
        .btn-save:hover:not(:disabled) { background:#e00000; }
        .btn-save:disabled { opacity:0.6; cursor:not-allowed; }
        .err-msg { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:8px 12px; border-radius:6px; font-size:12px; margin-bottom:10px; }

        .detail-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
        .detail-row:last-child { border-bottom:none; }
        .detail-label { color:#6b7280; font-weight:600; }
        .detail-val { color:#111827; font-weight:500; text-align:right; max-width:60%; }
        .detail-section { font-size:11px; font-weight:700; color:#b30000; text-transform:uppercase; letter-spacing:1px; margin:14px 0 6px; }

        .del-modal { max-width:380px; text-align:center; }
        .del-icon { font-size:48px; margin-bottom:10px; }
        .del-title { font-size:18px; font-weight:700; color:#111827; margin-bottom:8px; }
        .del-sub { font-size:13px; color:#6b7280; margin-bottom:20px; }
        .btn-del-confirm { padding:10px 24px; background:#b30000; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
        .btn-del-confirm:hover { background:#e00000; }

        .empty { text-align:center; padding:40px; color:#9ca3af; font-size:14px; }
        .count-badge { background:#f3f4f6; color:#374151; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; }
        .um-badge { background:#f5f3ff; color:#6d28d9; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
        .warranty-badge { background:#f0fdf4; color:#15803d; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
        .warranty-missing-badge { background:#fef2f2; color:#b91c1c; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
      `}</style>

      {/* HEADER */}
      <div className="prod-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="prod-title">📦 Products</span>
          <span className="count-badge">{filtered.length} items</span>
        </div>
        <div className="prod-actions">
          <input
            className="search-input"
            placeholder="🔍 Search name, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-add" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: "3%" }}>#</th>
                <th style={{ width: "40%" }}>Name</th>
                <th style={{ width: "10%" }}>Category</th>
                <th style={{ width: "8%" }}>U/M</th>
                <th style={{ width: "10%" }}>Retail Price</th>
                <th style={{ width: "10%" }}>Gov Price</th>
                <th style={{ width: "10%" }}>Installer Price</th>
                <th style={{ width: "10%" }}>Warranty</th>
                <th style={{ width: "8%" }}>Remaining</th>
                <th style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="empty">Loading products...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} className="empty">No products found.</td></tr>
              ) : paginated.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: "#9ca3af" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td
                    className="name-cell"
                    style={{ fontWeight: 600, color: "#111827" }}
                    onMouseMove={(e) => handleNameMouseMove(e, p.name)}
                    onMouseLeave={handleNameMouseLeave}
                  >
                    {p.name || "—"}
                  </td>
                  <td className="cat-cell">
                    {p.category
                      ? <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                      : "—"}
                  </td>
                  <td className="um-cell">
                    {p.price_um
                      ? <span className="um-badge">{p.price_um}</span>
                      : "—"}
                  </td>
                  <td style={{ fontWeight: 600 }}>{fmt(p.price_retail)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(p.price_gov)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(p.price_installer)}</td>
                  <td className="warranty-cell">
                    {p.warranty
                      ? <span className="warranty-badge">🛡 {p.warranty}</span>
                      : <span className="warranty-missing-badge">⚠ None</span>}
                  </td>
                  <td>
                    <span className={`badge ${(p.remaining_bal ?? 0) <= 5 ? "low" : ""}`}>
                      {p.remaining_bal ?? 0} units
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-view" onClick={() => openDetail(p)}>👁</button>
                      <button className="btn-edit" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn-del" onClick={() => confirmDelete(p)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="pagination">
            <span className="page-info">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {pageNumbers.map((n, idx) =>
              n === "…"
                ? <span key={`e${idx}`} className="page-ellipsis">…</span>
                : <button key={n} className={`page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
            )}
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>

      {/* CURSOR-FOLLOWING NAME TOOLTIP */}
      {tooltip.show && (
        <div
          className="name-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">{editId ? "✏️ Edit Product" : "➕ Add New Product"}</div>
            {error && <div className="err-msg">⚠️ {error}</div>}
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Product Name *</label>
                <input
                  className={`form-input${!form.name.trim() && error ? " required-missing" : ""}`}
                  placeholder="e.g. HP LaserJet Pro"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group form-full">
                <label>Warranty *</label>
                <input
                  className={`form-input${!form.warranty.trim() && error ? " required-missing" : ""}`}
                  placeholder="e.g. 1 Year, 6 Months, Lifetime"
                  value={form.warranty}
                  onChange={e => setForm({ ...form, warranty: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input className="form-input" placeholder="e.g. Printer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Keywords</label>
                <input className="form-input" placeholder="e.g. laser, printer, hp" value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit of Measurement (U/M)</label>
                <input className="form-input" placeholder="e.g. unit, box, pack, set" value={form.price_um} onChange={e => setForm({ ...form, price_um: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Retail Price (₱)</label>
                <input className="form-input" type="number" placeholder="0" value={form.price_retail} onChange={e => setForm({ ...form, price_retail: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gov Price (₱)</label>
                <input className="form-input" type="number" placeholder="0" value={form.price_gov} onChange={e => setForm({ ...form, price_gov: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Installer Price (₱)</label>
                <input className="form-input" type="number" placeholder="0" value={form.price_installer} onChange={e => setForm({ ...form, price_installer: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Remaining Balance</label>
                <input className="form-input" type="number" placeholder="0" value={form.remaining_bal} onChange={e => setForm({ ...form, remaining_bal: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Stock Out</label>
                <input className="form-input" type="number" placeholder="0" value={form.stockout} onChange={e => setForm({ ...form, stockout: e.target.value })} />
              </div>
              <div className="form-group form-full">
                <label>Description</label>
                <textarea className="form-input" placeholder="Product description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group form-full">
                <label>Remarks</label>
                <textarea className="form-input" placeholder="Additional remarks..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────────── */}
      {showDetail && selected && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">📦 {selected.name}</div>
            <div className="detail-section">Basic Info</div>
            <div className="detail-row"><span className="detail-label">Category</span><span className="detail-val">{selected.category || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Keywords</span><span className="detail-val">{selected.keywords || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Description</span><span className="detail-val">{selected.description || "—"}</span></div>
            <div className="detail-section">Pricing</div>
            <div className="detail-row"><span className="detail-label">Unit of Measurement</span><span className="detail-val">{selected.price_um || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Retail Price</span><span className="detail-val" style={{ color: "#16a34a", fontWeight: 700 }}>{fmt(selected.price_retail)}</span></div>
            <div className="detail-row"><span className="detail-label">Gov Price</span><span className="detail-val" style={{ color: "#1d4ed8", fontWeight: 700 }}>{fmt(selected.price_gov)}</span></div>
            <div className="detail-row"><span className="detail-label">Installer Price</span><span className="detail-val" style={{ color: "#b45309", fontWeight: 700 }}>{fmt(selected.price_installer)}</span></div>
            <div className="detail-section">Warranty & Inventory</div>
            <div className="detail-row">
              <span className="detail-label">Warranty</span>
              <span className="detail-val">
                {selected.warranty
                  ? <span className="warranty-badge">🛡 {selected.warranty}</span>
                  : <span className="warranty-missing-badge">⚠ Not set</span>}
              </span>
            </div>
            <div className="detail-row"><span className="detail-label">Remaining Balance</span><span className="detail-val">{selected.remaining_bal ?? "—"} units</span></div>
            <div className="detail-row"><span className="detail-label">Stock Out</span><span className="detail-val">{selected.stockout ?? "—"} units</span></div>
            <div className="detail-row"><span className="detail-label">Remarks</span><span className="detail-val">{selected.remarks || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Date Added</span><span className="detail-val">{new Date(selected.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowDetail(false)}>Close</button>
              <button className="btn-edit" style={{ padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => openEdit(selected)}>✏️ Edit</button>
              <button className="btn-del-confirm" onClick={() => confirmDelete(selected)}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────────────── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="overlay">
          <div className="modal del-modal">
            <div className="del-icon">⚠️</div>
            <div className="del-title">Delete Product?</div>
            <div className="del-sub">You are about to delete <strong>"{deleteTarget.name}"</strong>. This action cannot be undone.</div>
            <div className="modal-footer" style={{ justifyContent: "center", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn-del-confirm" onClick={handleDelete}>Yes, Delete</button>
              </div>
              <span className="esc-hint" style={{ marginRight: 0 }}><span className="esc-key">Esc</span> to cancel</span>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}