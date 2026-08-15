import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"

const CLIENT_CATEGORIES = ["Government", "Private"]

const emptyForm = { full_name: "", email: "", phone: "", address: "", category: "", status: true }

const PAGE_SIZE = 30

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")

  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchClients()
  }, [])

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // ─── ESC KEY: close whichever modal is topmost ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return
      if (deleteId) { setDeleteId(null); return }
      if (showModal) { setShowModal(false); return }
      if (showDetail) { setShowDetail(false); return }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [deleteId, showModal, showDetail])

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      showToast("Failed to load clients: " + error.message, "error")
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = clients.filter(c => {
    const matchSearch =
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toString().includes(search) ||
      c.category?.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && c.status) ||
      (filterStatus === "inactive" && !c.status)
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…")
      acc.push(n)
      return acc
    }, [])

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = "Name is required"
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format"
    if (!form.phone.toString().trim()) e.phone = "Phone is required"
    if (!form.address.trim()) e.address = "Address is required"
    return e
  }

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (client) => {
    setForm({
      full_name: client.full_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      category: client.category ?? "",
      status: client.status ?? true,
    })
    setEditId(client.id)
    setErrors({})
    setShowModal(true)
    setShowDetail(false)
  }

  const openDetail = (client) => {
    setSelectedClient(client)
    setShowDetail(true)
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    const payload = {
      full_name: form.full_name,
      email: form.email || null,
      phone: Number(form.phone),
      address: form.address,
      category: form.category || null,
      status: form.status,
    }
    if (editId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editId)
      if (error) showToast("Failed to update: " + error.message, "error")
      else { showToast("Client updated successfully."); setShowModal(false); fetchClients() }
    } else {
      const { error } = await supabase.from("clients").insert([payload])
      if (error) showToast("Failed to add: " + error.message, "error")
      else { showToast("Client added successfully."); setShowModal(false); fetchClients() }
    }
    setSaving(false)
  }

  const confirmDelete = (id) => { setDeleteId(id); setShowDetail(false) }
  const handleDelete = async () => {
    const { error } = await supabase.from("clients").delete().eq("id", deleteId)
    if (error) showToast("Failed to delete: " + error.message, "error")
    else { showToast("Client deleted."); setClients(prev => prev.filter(c => c.id !== deleteId)) }
    setDeleteId(null)
  }

  const catColor = (cat) => {
    const map = {
      Government: { bg: "#eff6ff", color: "#1d4ed8" },
      Private: { bg: "#fdf4ff", color: "#7e22ce" },
      NGO: { bg: "#f0fdf4", color: "#15803d" },
      Individual: { bg: "#fff7ed", color: "#c2410c" },
      Others: { bg: "#f9fafb", color: "#374151" },
    }
    return map[cat] || { bg: "#f3f4f6", color: "#6b7280" }
  }

  return (
    <DashboardLayout>
      <style>{`
        .clients-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .clients-header h2 { margin:0; font-size:22px; color:#111827; }
        .header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .search-input {
          padding:9px 14px; border:1px solid #ddd; border-radius:8px;
          outline:none; font-size:13px; width:220px; background:white; font-family:Segoe UI;
        }
        .search-input:focus { border-color:#b30000; box-shadow:0 0 0 2px rgba(179,0,0,0.15); }
        .filter-select {
          padding:9px 12px; border:1px solid #ddd; border-radius:8px;
          outline:none; font-size:13px; background:white; cursor:pointer; font-family:Segoe UI;
        }
        .filter-select:focus { border-color:#b30000; }
        .btn-add {
          padding:9px 16px; background:#b30000; color:white; border:none;
          border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
        }
        .btn-add:hover { background:#e00000; }
        .stats-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
        .stat-card {
          background:white; border-radius:10px; padding:12px 20px;
          box-shadow:0 1px 4px rgba(0,0,0,0.06); display:flex; align-items:center; gap:12px;
        }
        .stat-num { font-size:22px; font-weight:700; color:#111827; }
        .stat-label { font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase; }

        .table-wrap { background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.05); }
        .table-scroll { height:600px; overflow-y:auto; }
        .table-scroll table { width:100%; border-collapse:collapse; }
        .table-scroll thead { background:#111827; position:sticky; top:0; z-index:1; }
        .table-scroll th { padding:12px 15px; text-align:left; font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; }
        .table-scroll td { padding:13px 15px; font-size:13px; color:#111827; border-bottom:1px solid #f3f4f6; }
        .table-scroll tr:last-child td { border-bottom:none; }
        .table-scroll tbody tr:hover { background:#fafafa; cursor:pointer; }

        .pagination { display:flex; align-items:center; justify-content:flex-end; gap:6px; padding:12px 16px; background:white; border-top:1px solid #f3f4f6; }
        .page-info { font-size:12px; color:#6b7280; margin-right:6px; }
        .page-btn { padding:5px 11px; border:1px solid #e5e7eb; border-radius:6px; background:white; cursor:pointer; font-size:13px; color:#374151; font-weight:500; line-height:1.4; }
        .page-btn:hover:not(:disabled) { background:#f3f4f6; }
        .page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .page-btn.active { background:#b30000; color:white; border-color:#b30000; }
        .page-ellipsis { font-size:13px; color:#9ca3af; padding:0 2px; }

        .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
        .badge-active { background:#dcfce7; color:#16a34a; }
        .badge-inactive { background:#fee2e2; color:#dc2626; }
        .action-btns { display:flex; gap:6px; }
        .btn-view { padding:5px 10px; background:#f3f4f6; border:none; border-radius:6px; font-size:12px; cursor:pointer; color:#374151; }
        .btn-view:hover { background:#e5e7eb; }
        .btn-edit { padding:5px 10px; background:#dbeafe; border:none; border-radius:6px; font-size:12px; cursor:pointer; color:#1d4ed8; }
        .btn-edit:hover { background:#bfdbfe; }
        .btn-delete { padding:5px 10px; background:#fee2e2; border:none; border-radius:6px; font-size:12px; cursor:pointer; color:#b91c1c; }
        .btn-delete:hover { background:#fecaca; }
        .empty-row td { text-align:center; color:#9ca3af; padding:40px; font-size:14px; }
        .skeleton-row td { padding:13px 15px; border-bottom:1px solid #f3f4f6; }
        .skeleton { height:14px; background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:6px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.45);
          display:flex; justify-content:center; align-items:center;
          z-index:1000; padding:20px;
        }
        .modal {
          background:white; border-radius:16px; padding:30px; width:480px;
          max-width:95vw; box-shadow:0 20px 50px rgba(0,0,0,0.2);
          max-height:90vh; overflow-y:auto; animation:popIn 0.2s ease;
        }
        @keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .modal h3 { margin:0 0 20px; font-size:18px; color:#111827; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { margin-bottom:14px; }
        .form-group label { display:block; font-size:11px; font-weight:700; color:#6b7280; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.4px; }
        .form-group input, .form-group select {
          width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;
          font-size:13px; outline:none; box-sizing:border-box; background:#f9fafb; font-family:Segoe UI;
        }
        .form-group input:focus, .form-group select:focus { border-color:#b30000; box-shadow:0 0 0 2px rgba(179,0,0,0.15); background:white; }
        .input-error { border-color:#ef4444 !important; }
        .error-msg { font-size:11px; color:#ef4444; margin-top:4px; }
        .modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
        .esc-hint { font-size:11px; color:#9ca3af; display:flex; align-items:center; gap:5px; margin-right:auto; }
        .esc-key {
          display:inline-block; padding:2px 7px; border:1px solid #d1d5db;
          border-radius:4px; font-size:10px; font-family:monospace; background:#f9fafb;
          color:#6b7280; box-shadow:0 1px 0 #d1d5db; line-height:1.6;
        }
        .btn-cancel { padding:9px 18px; background:#f3f4f6; color:#374151; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
        .btn-cancel:hover { background:#e5e7eb; }
        .btn-save { padding:9px 20px; background:#b30000; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
        .btn-save:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-save:not(:disabled):hover { background:#e00000; }

        .detail-header { display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #f3f4f6; }
        .detail-avatar { width:52px; height:52px; border-radius:50%; background:#b30000; color:white; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; flex-shrink:0; }
        .detail-name { font-size:18px; font-weight:700; color:#111827; }
        .detail-sub { font-size:12px; color:#6b7280; margin-top:2px; }
        .detail-section-title { font-size:10px; font-weight:800; color:#b30000; text-transform:uppercase; letter-spacing:1px; margin:16px 0 8px; }
        .detail-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f9fafb; font-size:13px; }
        .detail-row:last-child { border-bottom:none; }
        .detail-label { color:#6b7280; font-weight:600; }
        .detail-val { color:#111827; font-weight:500; text-align:right; }

        .confirm-modal { background:white; border-radius:14px; padding:30px; width:360px; max-width:95vw; box-shadow:0 20px 50px rgba(0,0,0,0.2); text-align:center; animation:popIn 0.2s ease; }
        .confirm-modal .icon { font-size:40px; margin-bottom:12px; }
        .confirm-modal h3 { margin:0 0 8px; color:#111827; font-size:18px; }
        .confirm-modal p { color:#6b7280; font-size:13px; margin:0 0 22px; }
        .btn-confirm-delete { padding:9px 20px; background:#ef4444; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
        .btn-confirm-delete:hover { background:#dc2626; }

        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:10px; font-size:14px; font-weight:500; color:white; z-index:9999; animation:slideUp 0.3s ease; box-shadow:0 4px 20px rgba(0,0,0,0.15); }
        .toast-success { background:#16a34a; }
        .toast-error { background:#dc2626; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* HEADER */}
      <div className="clients-header">
        <h2>👥 Clients</h2>
        <div className="header-right">
          <input className="search-input" type="text" placeholder="🔍 Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn-add" onClick={openAdd}>+ Add Client</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <span style={{ fontSize: 24 }}>👥</span>
          <div><div className="stat-num">{clients.length}</div><div className="stat-label">Total Clients</div></div>
        </div>
        <div className="stat-card">
          <span style={{ fontSize: 24 }}>✅</span>
          <div><div className="stat-num" style={{ color: "#16a34a" }}>{clients.filter(c => c.status).length}</div><div className="stat-label">Active</div></div>
        </div>
        <div className="stat-card">
          <span style={{ fontSize: 24 }}>⛔</span>
          <div><div className="stat-num" style={{ color: "#dc2626" }}>{clients.filter(c => !c.status).length}</div><div className="stat-label">Inactive</div></div>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr className="skeleton-row" key={i}>
                    {[...Array(8)].map((_, j) => <td key={j}><div className="skeleton" style={{ width: j === 0 ? 20 : "80%" }} /></td>)}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>No clients found.</td></tr>
              ) : paginated.map((c, i) => {
                const cc = catColor(c.category)
                return (
                  <tr key={c.id} onClick={() => openDetail(c)}>
                    <td style={{ color: "#9ca3af" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><strong>{c.full_name}</strong></td>
                    <td>
                      {c.category
                        ? <span className="badge" style={{ background: cc.bg, color: cc.color }}>{c.category}</span>
                        : <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td>{c.email || <span style={{ color: "#d1d5db" }}>—</span>}</td>
                    <td>{c.phone}</td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</td>
                    <td><span className={`badge ${c.status ? "badge-active" : "badge-inactive"}`}>{c.status ? "Active" : "Inactive"}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn-view" onClick={() => openDetail(c)}>👁 View</button>
                        <button className="btn-edit" onClick={() => openEdit(c)}>✏️ Edit</button>
                        <button className="btn-delete" onClick={() => confirmDelete(c.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editId ? "✏️ Edit Client" : "➕ Add Client"}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" placeholder="Juan dela Cruz" value={form.full_name}
                  className={errors.full_name ? "input-error" : ""}
                  onChange={e => setForm({ ...form, full_name: e.target.value })} />
                {errors.full_name && <div className="error-msg">{errors.full_name}</div>}
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">— Select —</option>
                  {CLIENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="juan@email.com" value={form.email}
                  className={errors.email ? "input-error" : ""}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
                {errors.email && <div className="error-msg">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input type="text" placeholder="09171234567" value={form.phone}
                  className={errors.phone ? "input-error" : ""}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <div className="error-msg">{errors.phone}</div>}
              </div>
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input type="text" placeholder="Manila, Philippines" value={form.address}
                className={errors.address ? "input-error" : ""}
                onChange={e => setForm({ ...form, address: e.target.value })} />
              {errors.address && <div className="error-msg">{errors.address}</div>}
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status ? "true" : "false"} onChange={e => setForm({ ...form, status: e.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────────── */}
      {showDetail && selectedClient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="detail-header">
              <div className="detail-avatar">{selectedClient.full_name?.[0]?.toUpperCase() || "?"}</div>
              <div>
                <div className="detail-name">{selectedClient.full_name}</div>
                <div className="detail-sub">{selectedClient.email || "No email provided"}</div>
              </div>
              <span className={`badge ${selectedClient.status ? "badge-active" : "badge-inactive"}`} style={{ marginLeft: "auto" }}>
                {selectedClient.status ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="detail-section-title">Contact Info</div>
            <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-val">{selectedClient.phone || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Email</span><span className="detail-val">{selectedClient.email || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Address</span><span className="detail-val">{selectedClient.address || "—"}</span></div>
            <div className="detail-section-title">Classification</div>
            <div className="detail-row"><span className="detail-label">Category</span>
              <span className="detail-val">
                {selectedClient.category
                  ? (() => { const cc = catColor(selectedClient.category); return <span className="badge" style={{ background: cc.bg, color: cc.color }}>{selectedClient.category}</span> })()
                  : "—"}
              </span>
            </div>
            <div className="detail-row"><span className="detail-label">Date Added</span>
              <span className="detail-val">{new Date(selectedClient.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowDetail(false)}>Close</button>
              <button className="btn-edit" style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => openEdit(selectedClient)}>✏️ Edit</button>
              <button className="btn-confirm-delete" onClick={() => confirmDelete(selectedClient.id)}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ────────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="icon">🗑️</div>
            <h3>Delete Client?</h3>
            <p>This action cannot be undone. Are you sure?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-confirm-delete" onClick={handleDelete}>Yes, Delete</button>
              </div>
              <span className="esc-hint" style={{ marginTop: 4 }}><span className="esc-key">Esc</span> to cancel</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </DashboardLayout>
  )
}