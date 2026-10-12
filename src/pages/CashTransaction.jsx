import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"

const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 500]

const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

const monthStart = () => `${today().slice(0, 7)}-01`

const emptyForm = () => ({ date: today(), details: "", cashin: "", cashout: "", remarks: "" })

// Avoid floating-point drift (e.g. 0.1 + 0.2) now that amounts have centavos.
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const money = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function CashTransaction() {
  const [transactions, setTransactions] = useState([])
  const [fromDate, setFromDate] = useState(monthStart)
  const [toDate, setToDate] = useState(today)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const tableScrollRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  // ─── TOAST ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── FETCH ───────────────────────────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      // Load the whole ledger so running balances stay correct across date ranges.
      // Supabase returns at most 1000 rows per request, so fetch in batches.
      const BATCH = 1000
      let rows = []
      for (let from = 0; ; from += BATCH) {
        const { data, error } = await supabase
          .from("cash_transaction")
          .select("id, date, details, cashin, cashout, cashremaining, remarks, created_at")
          .order("date", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + BATCH - 1)

        if (error) throw error
        rows = rows.concat(data || [])
        if (!data || data.length < BATCH) break
      }

      let balance = 0
      const ledger = rows.map((item) => {
        const cashin = round2(item.cashin || 0)
        const cashout = round2(item.cashout || 0)
        balance = round2(balance + cashin - cashout)
        return { ...item, cashin, cashout, cashremaining: balance }
      })
      setTransactions(ledger)
    } catch (err) {
      showToast(err.message || "Unable to load transactions.", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  // Newest entries are at the end of the ledger, so jump to the last page
  // when filters / page size change or rows are added or removed.
  useEffect(() => {
    setPage(Number.MAX_SAFE_INTEGER)
  }, [search, fromDate, toDate, pageSize, transactions.length])

  // ─── ESC KEY ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return }
      if (showModal) { setShowModal(false); return }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showDeleteConfirm, showModal])

  // ─── FILTER + PAGINATE ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return transactions
      .filter((item) => {
        const inRange =
          (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate)
        const matches =
          !s ||
          (item.details || "").toLowerCase().includes(s) ||
          (item.remarks || "").toLowerCase().includes(s)
        return inRange && matches
      })
  }, [transactions, fromDate, toDate, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Keep the table scrolled to the bottom (latest rows) after load / page change.
  useEffect(() => {
    if (loading) return
    const el = tableScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [loading, currentPage, pageSize, paginated.length])

  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, item) => ({ cashin: round2(sum.cashin + item.cashin), cashout: round2(sum.cashout + item.cashout) }),
        { cashin: 0, cashout: 0 }
      ),
    [filtered]
  )
  const net = round2(totals.cashin - totals.cashout)

  const getPageNumbers = () => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1)
    const pages = []
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
    }
    return pages
  }

  // ─── DATE RANGE ──────────────────────────────────────────────────────────
  const applyRange = (range) => {
    const now = today()
    const date = new Date(`${now}T12:00:00`)
    const ymd = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    if (range === "today") { setFromDate(now); setToDate(now) }
    else if (range === "week") {
      const day = date.getDay()
      date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
      setFromDate(ymd(date)); setToDate(now)
    }
    else if (range === "month") { setFromDate(`${now.slice(0, 7)}-01`); setToDate(now) }
    else if (range === "year") { setFromDate(`${now.slice(0, 4)}-01-01`); setToDate(now) }
    else if (range === "all") { setFromDate(""); setToDate("") }
  }

  const resetFilters = () => {
    setFromDate(monthStart())
    setToDate(today())
    setSearch("")
  }

  // ─── MODAL HANDLERS ──────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm())
    setEditId(null)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (item) => {
    setForm({
      date: item.date,
      details: item.details || "",
      cashin: item.cashin ? String(item.cashin) : "",
      cashout: item.cashout ? String(item.cashout) : "",
      remarks: item.remarks || "",
    })
    setEditId(item.id)
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const e = {}
    const cashin = Number(form.cashin || 0)
    const cashout = Number(form.cashout || 0)
    if (!form.date) e.date = "Date is required"
    if (!form.details.trim()) e.details = "Description is required"
    if (!Number.isFinite(cashin) || !Number.isFinite(cashout) || cashin < 0 || cashout < 0) {
      e.amount = "Amounts must be valid, non-negative numbers"
    } else if (cashin > 0 && cashout > 0) {
      e.amount = "Enter either Cash In or Cash Out, not both"
    } else if (cashin === 0 && cashout === 0) {
      e.amount = "Enter an amount for Cash In or Cash Out"
    }
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)

    try {
      const payload = {
        date: form.date,
        details: form.details.trim(),
        cashin: round2(form.cashin || 0),
        cashout: round2(form.cashout || 0),
        remarks: form.remarks.trim() || null,
      }

      const result = editId
        ? await supabase.from("cash_transaction").update(payload).eq("id", editId)
        : await supabase.from("cash_transaction").insert(payload)

      if (result.error) throw result.error

      showToast(editId ? "Transaction updated." : "Transaction added.")
      setShowModal(false)
      setEditId(null)
      await loadTransactions()
    } catch (err) {
      showToast("Error: " + (err.message || "Unable to save transaction."), "error")
    }
    setSaving(false)
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  const confirmDelete = (item) => { setDeleteTarget(item); setShowDeleteConfirm(true) }

  const handleDelete = async () => {
    const { error } = await supabase.from("cash_transaction").delete().eq("id", deleteTarget.id)
    if (error) showToast("Failed to delete: " + error.message, "error")
    else { showToast("Transaction deleted."); loadTransactions() }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // ─── EXPORT ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ["Date", "Cash Transaction", "Cash In", "Cash Out", "Cash in Total", "Remarks"],
      ...filtered.map((item) => [
        item.date,
        item.details || "",
        item.cashin,
        item.cashout,
        item.cashremaining,
        item.remarks || "",
      ]),
    ]
    const csv = rows
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n")

    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `cash-transactions-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <style>{`
        .q-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .q-header h2{margin:0;font-size:22px;color:#111827}
        .q-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .q-search{padding:9px 14px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;width:220px;background:white;font-family:Segoe UI}
        .q-search:focus,.q-filter:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15)}
        .q-filter{padding:9px 12px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;background:white;cursor:pointer;font-family:Segoe UI}
        .q-date-group{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;font-weight:600}
        .btn-add{padding:9px 16px;background:#b30000;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-add:hover{background:#e00000}
        .btn-light{padding:9px 14px;background:white;color:#374151;border:1px solid #ddd;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-light:hover{background:#f9fafb}
        .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .stat-card{background:white;border-radius:10px;padding:12px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:12px}
        .stat-num{font-size:22px;font-weight:700}
        .stat-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase}
        .table-wrap{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
        .table-scroll{min-height:600px;max-height:600px;overflow:auto}
        .table-scroll::-webkit-scrollbar{width:6px;height:6px}
        .table-scroll::-webkit-scrollbar-track{background:#f9fafb}
        .table-scroll::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
        .table-scroll::-webkit-scrollbar-thumb:hover{background:#d1d5db}
        table{width:100%;border-collapse:collapse}
        thead{background:#111827;position:sticky;top:0;z-index:10}
        th{padding:12px 15px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap}
        td{padding:12px 15px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6}
        tr:last-child td{border-bottom:none}
        tbody tr:hover{background:#fafafa}
        .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
        .in{color:#15803d;font-weight:600}
        .out{color:#b91c1c;font-weight:600}
        .zero{color:#d1d5db}
        .bal{font-weight:700}
        .action-btns{display:flex;gap:6px}
        .btn-edit-sm{padding:5px 10px;background:#dbeafe;border:none;border-radius:6px;font-size:12px;cursor:pointer;color:#1d4ed8}
        .btn-edit-sm:hover{background:#bfdbfe}
        .btn-del-sm{padding:5px 10px;background:#fee2e2;border:none;border-radius:6px;font-size:12px;cursor:pointer;color:#b91c1c}
        .btn-del-sm:hover{background:#fecaca}
        .empty-row td{text-align:center;color:#9ca3af;padding:40px}
        .skeleton-row td{padding:13px 15px;border-bottom:1px solid #f3f4f6}
        .skeleton{height:14px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;border-radius:6px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pagination-bar{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:13px;color:#6b7280;flex-wrap:wrap;gap:8px}
        .pagination-info{font-size:12px;color:#9ca3af}
        .pagination-btns{display:flex;gap:5px;align-items:center}
        .pg-btn{padding:5px 11px;border:1px solid #e5e7eb;border-radius:7px;background:white;cursor:pointer;color:#374151;font-size:13px;font-weight:500;transition:all 0.15s;min-width:34px;text-align:center}
        .pg-btn:hover:not(:disabled){background:#f9fafb;border-color:#d1d5db}
        .pg-btn:disabled{opacity:0.4;cursor:not-allowed;background:#f9fafb}
        .pg-btn.active{background:#b30000;color:white;border-color:#b30000;font-weight:700}
        .pg-ellipsis{padding:5px 4px;color:#9ca3af;font-size:13px;user-select:none}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;justify-content:center;align-items:center;z-index:1000;padding:20px}
        .modal{background:white;border-radius:16px;padding:30px;width:560px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;animation:popIn 0.2s ease}
        @keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal h3{margin:0 0 4px;font-size:18px;color:#111827}
        .modal-sub{font-size:12px;color:#9ca3af;margin-bottom:20px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:5px}
        .form-group label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px}
        .form-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;color:#111827;width:100%;box-sizing:border-box}
        textarea.form-input{resize:vertical;min-height:56px}
        .form-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15);background:white}
        .form-input:disabled{background:#f1f5f9;color:#9ca3af;cursor:not-allowed}
        .form-input.err{border-color:#ef4444}
        .error-msg{font-size:11px;color:#ef4444}
        .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;align-items:center}
        .esc-hint{font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:5px;margin-right:auto}
        .esc-key{display:inline-block;padding:2px 7px;border:1px solid #d1d5db;border-radius:4px;font-size:10px;font-family:monospace;background:#f9fafb;color:#6b7280;box-shadow:0 1px 0 #d1d5db;line-height:1.6}
        .btn-cancel{padding:9px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-cancel:hover{background:#e5e7eb}
        .btn-save{padding:9px 24px;background:#b30000;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .btn-save:not(:disabled):hover{background:#e00000}
        .confirm-modal{background:white;border-radius:14px;padding:30px;width:360px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);text-align:center;animation:popIn 0.2s ease}
        .btn-confirm-del{padding:9px 20px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-confirm-del:hover{background:#dc2626}
        .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;color:white;z-index:9999;animation:slideUp 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
        .toast-success{background:#16a34a}
        .toast-error{background:#dc2626}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @media(max-width:700px){.form-grid{grid-template-columns:1fr}.q-search{width:100%}}
      `}</style>

      {/* HEADER */}
      <div className="q-header">
        <h2>💵 Cash Transactions</h2>
        <div className="q-controls">
          <input
            className="q-search"
            placeholder="🔍 Search transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="q-date-group">
            From
            <input
              type="date"
              className="q-filter"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
            To
            <input
              type="date"
              className="q-filter"
              value={toDate}
              min={fromDate || undefined}
              max={today()}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <select
            className="q-filter"
            value=""
            onChange={(e) => e.target.value && applyRange(e.target.value)}
          >
            <option value="">Date range...</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Dates</option>
          </select>
          <button className="btn-light" onClick={resetFilters}>↺ Reset</button>
          <button className="btn-light" onClick={loadTransactions}>⟳ Refresh</button>
          <button className="btn-light" onClick={exportCSV}>⬇ Export CSV</button>
          <button className="btn-add" onClick={openAdd}>+ Add Transaction</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        {[
          { icon: "📥", label: "Total Cash In", value: `₱${money(totals.cashin)}`, color: "#15803d" },
          { icon: "📤", label: "Total Cash Out", value: `₱${money(totals.cashout)}`, color: "#b91c1c" },
          { icon: "💰", label: "Net Movement", value: `₱${money(net)}`, color: net >= 0 ? "#15803d" : "#b91c1c" },
          { icon: "🧾", label: "Transactions", value: filtered.length, color: "#111827" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <div className="table-scroll" ref={tableScrollRef}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Cash Transaction</th>
                <th className="num">Cash In</th>
                <th className="num">Cash Out</th>
                <th className="num">Cash in Total</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr className="skeleton-row" key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ width: j === 0 ? 20 : "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>No transactions found for the selected dates.</td></tr>
              ) : (
                paginated.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: "#000000" }}>{(currentPage - 1) * pageSize + i + 1}</td>
                    <td style={{ color: "#070707", whiteSpace: "nowrap" }}>{item.date}</td>
                    <td style={{ maxWidth: 380, overflowWrap: "anywhere" }}>
                      <strong>{item.details || "—"}</strong>
                    </td>
                    <td className={`num ${item.cashin ? "in" : "zero"}`}>{item.cashin ? money(item.cashin) : "—"}</td>
                    <td className={`num ${item.cashout ? "out" : "zero"}`}>{item.cashout ? money(item.cashout) : "—"}</td>
                    <td className="num bal">{money(item.cashremaining)}</td>
                    <td style={{ maxWidth: 260, overflowWrap: "anywhere", color: "#6b7280" }}>
                      {item.remarks || "—"}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit-sm" onClick={() => openEdit(item)} title="Edit">✏️</button>
                        <button className="btn-del-sm" onClick={() => confirmDelete(item)} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </span>
          <label className="pagination-info" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Rows per page
            <select
              className="q-filter"
              style={{ padding: "5px 8px" }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {totalPages > 1 && (
            <div className="pagination-btns">
              <button className="pg-btn" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>← Prev</button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
                ) : (
                  <button key={p} className={`pg-btn${currentPage === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                )
              )}
              <button className="pg-btn" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="overlay">
          <div className="modal">
            <h3>{editId ? "✏️ Edit Transaction" : "➕ New Transaction"}</h3>
            <div className="modal-sub">Record a cash-in or cash-out entry</div>

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Date *</label>
                <input
                  type="date"
                  className={`form-input${errors.date ? " err" : ""}`}
                  value={form.date}
                  max={today()}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
                {errors.date && <div className="error-msg">{errors.date}</div>}
              </div>

              <div className="form-group form-full">
                <label>Cash Transaction *</label>
                <input
                  type="text"
                  className={`form-input${errors.details ? " err" : ""}`}
                  maxLength={500}
                  placeholder="Enter transaction details"
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                />
                {errors.details && <div className="error-msg">{errors.details}</div>}
              </div>

              <div className="form-group">
                <label>Cash In (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`form-input${errors.amount ? " err" : ""}`}
                  placeholder="0.00"
                  value={form.cashin}
                  disabled={Number(form.cashout) > 0}
                  onChange={(e) => setForm((f) => ({ ...f, cashin: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Cash Out (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`form-input${errors.amount ? " err" : ""}`}
                  placeholder="0.00"
                  value={form.cashout}
                  disabled={Number(form.cashin) > 0}
                  onChange={(e) => setForm((f) => ({ ...f, cashout: e.target.value }))}
                />
              </div>

              <div className="form-group form-full">
                <label>Remarks</label>
                <textarea
                  className="form-input"
                  rows={2}
                  maxLength={500}
                  placeholder="Optional notes"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                />
              </div>

              {errors.amount && <div className="error-msg form-full">{errors.amount}</div>}
            </div>

            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && deleteTarget && (
        <div className="overlay">
          <div className="confirm-modal">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>Delete Transaction?</h3>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 22px" }}>
              Deletes <strong>{deleteTarget.details}</strong> dated <strong>{deleteTarget.date}</strong>. Cannot be undone.
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn-confirm-del" onClick={handleDelete}>Yes, Delete</button>
              </div>
              <span className="esc-hint" style={{ marginRight: 0 }}><span className="esc-key">Esc</span> to cancel</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </DashboardLayout>
  )
}