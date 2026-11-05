import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../layout/DashboardLayout.jsx"
import { supabase } from "../supabaseClient"
import { PurchaseOrderPrintTemplate } from "./PurchaseOrderTemplate"

const STATUSES = ["Draft", "Ordered", "Received", "Cancelled"]
const STATUS_ORDER = { Draft: 0, Ordered: 1, Received: 2, Cancelled: 3 }
const PAGE_SIZE = 30

const emptyForm = {
  supplier_id: "", supplier_name: "", supplier_address: "", supplier_contact: "",
  agent_id: "", status: "Draft",
  order_date: "", expected_date: "", payment_terms: "",
  remarks: "", shipping_fee: "", discount: ""
}

const emptyLine = { item_id: "", quantity: 1, price: "" }

// ─── SEARCHABLE DROPDOWN ──────────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder, error }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => String(o.value) === String(value))

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${error ? "#ef4444" : open ? "#b30000" : "#e5e7eb"}`,
        borderRadius: 8, background: open ? "white" : "#f9fafb",
        boxShadow: open ? "0 0 0 2px rgba(179,0,0,0.15)" : "none", overflow: "hidden"
      }}>
        <input
          type="text"
          placeholder={selected ? "" : placeholder}
          value={open ? query : (selected ? selected.label : query)}
          onFocus={() => { setOpen(true); setQuery("") }}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          style={{ flex: 1, padding: "9px 12px", border: "none", outline: "none", fontSize: 13, background: "transparent", fontFamily: "Segoe UI" }}
        />
        {selected && (
          <button onMouseDown={() => { onChange(""); setQuery("") }}
            style={{ padding: "0 8px", border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>×</button>
        )}
        <span style={{ padding: "0 10px", color: "#9ca3af", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white",
          border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 9999, maxHeight: 240, overflowY: "auto"
        }}>
          {filtered.length === 0
            ? <div style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No results</div>
            : filtered.map(opt => (
              <div key={opt.value} onMouseDown={() => { onChange(opt.value); setQuery(""); setOpen(false) }}
                style={{
                  padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f9fafb",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: String(opt.value) === String(value) ? "#fef2f2" : "white",
                  color: String(opt.value) === String(value) ? "#b30000" : "#111827"
                }}
                onMouseEnter={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = "#f9fafb" }}
                onMouseLeave={e => { if (String(opt.value) !== String(value)) e.currentTarget.style.background = "white" }}
              >
                <span>{opt.label}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{opt.sub || ""}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PurchaseOrder() {
  const [orders, setOrders] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [lines, setLines] = useState([{ ...emptyLine }])
  const [editId, setEditId] = useState(null)
  const [nextPO, setNextPO] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedLines, setSelectedLines] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchAll()
  }, [])

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // ─── ESC KEY ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return }
      if (showModal) { setShowModal(false); return }
      if (showDetail) { setShowDetail(false); return }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showDeleteConfirm, showModal, showDetail])

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  // Default unit cost: uses the product's cost column if you have one, otherwise leaves it blank.
  // Change "price_cost" to match your products table column name.
  const getProductCost = (product) => {
    if (!product) return ""
    return product.price_cost ?? product.cost ?? ""
  }

  const supplierOptions = suppliers
    .filter(s => s.status !== false)
    .map(s => ({ value: s.id, label: s.supplier_name, sub: s.category || "" }))

  // Picking a supplier fills in name, address, contact and payment terms
  const handleSupplierChange = (id) => {
    const sup = suppliers.find(s => String(s.id) === String(id))
    if (!sup) {
      setForm(f => ({ ...f, supplier_id: "", supplier_name: "", supplier_address: "", supplier_contact: "" }))
      return
    }
    const contact = [sup.contact_person, sup.phone, sup.email].filter(Boolean).join(" • ")
    setForm(f => ({
      ...f,
      supplier_id: sup.id,
      supplier_name: sup.supplier_name,
      supplier_address: sup.address ?? "",
      supplier_contact: contact,
      payment_terms: sup.payment_terms || f.payment_terms,
    }))
  }

  // ─── FETCH ───────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    const [oRes, eRes, pRes, sRes] = await Promise.all([
      supabase.from("purchase_orders").select(`*, employees(id,full_name)`).order("po_number", { ascending: false }),
      supabase.from("employees").select("id,full_name").order("full_name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("suppliers").select("*").order("supplier_name"),
    ])
    if (!oRes.error) setOrders(oRes.data ?? [])
    if (!eRes.error) setEmployees(eRes.data ?? [])
    if (!pRes.error) setProducts(pRes.data ?? [])
    if (!sRes.error) setSuppliers(sRes.data ?? [])
    setLoading(false)
  }

  const fetchOrderItems = async (orderId) => {
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select("*, products(*)")
      .eq("purchase_order_id", orderId)
      .order("id", { ascending: true })
    if (error) console.error("purchase_order_items:", error)
    return data ?? []
  }

  // ─── AUTO PO NUMBER ──────────────────────────────────────────────────────
  const computeNextPO = async () => {
    const { data } = await supabase
      .from("purchase_orders").select("po_number").order("po_number", { ascending: false }).limit(1)
    const last = data?.[0]?.po_number ?? 0
    const next = Number(last) + 1
    setNextPO(next)
    return next
  }

  // ─── PRINT ───────────────────────────────────────────────────────────────
  const printOrder = async (o, items) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100")
    const ReactDOMServer = await import("react-dom/server")
    const html = ReactDOMServer.renderToStaticMarkup(
      <PurchaseOrderPrintTemplate order={o} lines={items} />
    )
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Purchase Order PO#${o.po_number}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      </head><body style="margin:0;padding:0;">${html}</body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  // ─── SAVE AS IMAGE ────────────────────────────────────────────────────────
  const saveAsImage = async (o, items) => {
    const html2canvas = (await import("html2canvas")).default
    const ReactDOMServer = await import("react-dom/server")

    let logoBase64 = ""
    try {
      const res = await fetch("/Logo2.png")
      const blob = await res.blob()
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch (e) { }

    const html = ReactDOMServer.renderToStaticMarkup(
      <PurchaseOrderPrintTemplate order={o} lines={items} logoSrc={logoBase64} />
    )

    const iframe = document.createElement("iframe")
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:900px;height:1200px;border:none;visibility:hidden;"
    document.body.appendChild(iframe)

    iframe.contentDocument.open()
    iframe.contentDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>* { box-sizing: border-box; margin: 0; padding: 0; }</style>
        </head>
        <body style="background:#fff;">${html}</body>
      </html>
    `)
    iframe.contentDocument.close()

    await new Promise(r => setTimeout(r, 1200))

    const pageEl = iframe.contentDocument.querySelector(".rms-page")
    if (!pageEl) { document.body.removeChild(iframe); return }

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 900,
      windowHeight: pageEl.scrollHeight,
    })

    document.body.removeChild(iframe)

    const link = document.createElement("a")
    link.download = `PurchaseOrder-PO${o.po_number ?? "unknown"}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  // ─── TOAST ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fmt = (n) => n != null && n !== "" ? `₱${Number(n).toLocaleString()}` : "—"
  const lineTotal = (line) => line.price !== "" && line.quantity ? Number(line.price) * Number(line.quantity) : 0
  const grandTotal = (lineArr) => lineArr.reduce((sum, l) => sum + lineTotal(l), 0)

  // ─── LINE HANDLERS ───────────────────────────────────────────────────────
  const handleLineProductChange = (idx, productId) => {
    const product = products.find(p => String(p.id) === String(productId))
    const cost = getProductCost(product)
    setLines(prev => prev.map((l, i) =>
      i === idx ? { ...l, item_id: productId, price: cost !== "" ? cost : l.price } : l
    ))
  }

  const addLine = () => setLines(prev => [...prev, { ...emptyLine }])
  const removeLine = (idx) => {
    if (lines.length === 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }
  const updateLine = (idx, field, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l))
  }

  // ─── VALIDATE ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.supplier_name.trim()) e.supplier_name = "Supplier is required"
    if (!form.agent_id) e.agent_id = "Prepared by is required"
    const validLines = lines.filter(l => l.item_id && l.quantity && l.price !== "")
    if (validLines.length === 0) e.lines = "Add at least one item with quantity and unit cost."
    return e
  }

  // ─── OPEN ADD ────────────────────────────────────────────────────────────
  const openAdd = async () => {
    setForm({ ...emptyForm, order_date: new Date().toISOString().split("T")[0] })
    setLines([{ ...emptyLine }])
    setEditId(null)
    setErrors({})
    await computeNextPO()
    setShowModal(true)
  }

  // ─── OPEN EDIT ───────────────────────────────────────────────────────────
  const openEdit = async (o) => {
    setForm({
      supplier_id: o.supplier_id ?? "",
      supplier_name: o.supplier_name ?? "",
      supplier_address: o.supplier_address ?? "",
      supplier_contact: o.supplier_contact ?? "",
      agent_id: o.agent_id ?? "",
      status: o.status ?? "Draft",
      order_date: o.order_date ? o.order_date.split("T")[0] : "",
      expected_date: o.expected_date ? o.expected_date.split("T")[0] : "",
      payment_terms: o.payment_terms ?? "",
      remarks: o.remarks ?? "",
      shipping_fee: o.shipping_fee ?? "",
      discount: o.discount ?? "",
    })
    setNextPO(o.po_number)
    setEditId(o.id)
    setErrors({})
    const items = await fetchOrderItems(o.id)
    setLines(items.length > 0
      ? items.map(it => ({
        item_id: it.item_id ?? "",
        quantity: it.quantity ?? 1,
        price: it.price ?? "",
      }))
      : [{ ...emptyLine }]
    )
    setShowModal(true)
    setShowDetail(false)
  }

  // ─── OPEN DETAIL ─────────────────────────────────────────────────────────
  const openDetail = async (o) => {
    setSelected(o)
    const items = await fetchOrderItems(o.id)
    setSelectedLines(items)
    setShowDetail(true)
  }

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)

    try {
      let orderId = editId

      const payload = {
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        supplier_name: form.supplier_name.trim(),
        supplier_address: form.supplier_address || null,
        supplier_contact: form.supplier_contact || null,
        agent_id: Number(form.agent_id),
        status: form.status,
        order_date: form.order_date || null,
        expected_date: form.expected_date || null,
        payment_terms: form.payment_terms || null,
        remarks: form.remarks || null,
        shipping_fee: form.shipping_fee !== "" ? Number(form.shipping_fee) : null,
        discount: form.discount !== "" ? Number(form.discount) : null,
      }

      let savedNumber = nextPO
      if (editId) {
        const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editId)
        if (error) throw new Error("Update purchase order failed: " + error.message)
        const { error: delErr } = await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editId)
        if (delErr) throw new Error("Delete old items failed: " + delErr.message)
      } else {
        const po_number = await computeNextPO()
        savedNumber = po_number
        const { data, error } = await supabase.from("purchase_orders").insert([{ ...payload, po_number }]).select().single()
        if (error) throw new Error("Insert purchase order failed: " + error.message)
        orderId = data.id
      }

      const validLines = lines.filter(l => l.item_id && l.quantity && l.price !== "")
      if (validLines.length > 0) {
        const itemsPayload = validLines.map(l => ({
          purchase_order_id: orderId,
          item_id: Number(l.item_id),
          quantity: Number(l.quantity),
          price: Number(l.price),
        }))
        const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsPayload)
        if (itemsError) throw new Error("Insert items failed: " + itemsError.message)
      }

      showToast(editId ? "Purchase order updated." : `Purchase order PO#${savedNumber} created.`)
      setShowModal(false)
      fetchAll()
    } catch (err) {
      console.error("handleSave error:", err.message)
      showToast("Error: " + err.message, "error")
    }
    setSaving(false)
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  const confirmDelete = (o) => { setDeleteTarget(o); setShowDeleteConfirm(true); setShowDetail(false) }
  const handleDelete = async () => {
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", deleteTarget.id)
    const { error } = await supabase.from("purchase_orders").delete().eq("id", deleteTarget.id)
    if (error) showToast("Failed to delete: " + error.message, "error")
    else { showToast("Purchase order deleted."); fetchAll() }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // ─── STATUS STYLE ─────────────────────────────────────────────────────────
  const statusStyle = (s) => ({
    Draft: { bg: "#f3f4f6", color: "#374151" },
    Ordered: { bg: "#fef9c3", color: "#854d0e" },
    Received: { bg: "#dcfce7", color: "#15803d" },
    Cancelled: { bg: "#fee2e2", color: "#b91c1c" },
  }[s] || { bg: "#f3f4f6", color: "#374151" })

  // ─── OPTIONS ─────────────────────────────────────────────────────────────
  const agentOptions = employees.map(e => ({ value: e.id, label: e.full_name }))
  const productOptions = products.map(p => {
    const cost = getProductCost(p)
    return {
      value: p.id, label: p.name,
      sub: cost !== "" && cost != null ? `₱${Number(cost).toLocaleString()}` : "",
    }
  })

  // ─── FILTERED + PAGINATED ────────────────────────────────────────────────
  const filtered = orders
    .filter(o => {
      const s = search.toLowerCase()
      const match = !s || [o.supplier_name, o.employees?.full_name, String(o.po_number ?? "")]
        .some(f => f?.toLowerCase().includes(s))
      const matchStatus = filterStatus === "all" || o.status === filterStatus
      return match && matchStatus
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summaryStats = {
    total: orders.length,
    draft: orders.filter(o => o.status === "Draft").length,
    ordered: orders.filter(o => o.status === "Ordered").length,
    received: orders.filter(o => o.status === "Received").length,
  }

  // ─── COMPUTED TOTALS (modal) ──────────────────────────────────────────────
  const currentSubtotal = grandTotal(lines)
  const shippingAmt = Number(form.shipping_fee) || 0
  const discountAmt = Number(form.discount) || 0
  const totalAmount = currentSubtotal + shippingAmt - discountAmt

  // ─── PAGINATION HELPERS ───────────────────────────────────────────────────
  const getPageNumbers = () => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1)
    const pages = []
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages)
    } else if (page >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages)
    }
    return pages
  }

  return (
    <DashboardLayout>
      <style>{`
        .q-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .q-header h2{margin:0;font-size:22px;color:#111827}
        .q-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .q-search{padding:9px 14px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;width:220px;background:white;font-family:Segoe UI}
        .q-search:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15)}
        .q-filter{padding:9px 12px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;background:white;cursor:pointer;font-family:Segoe UI}
        .btn-add{padding:9px 16px;background:#b30000;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-add:hover{background:#e00000}
        .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .stat-card{background:white;border-radius:10px;padding:12px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:12px}
        .stat-num{font-size:22px;font-weight:700}
        .stat-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase}
        .table-wrap{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
        .table-scroll{min-height:600px;max-height:600px;overflow-y:auto}
        .table-scroll::-webkit-scrollbar{width:6px}
        .table-scroll::-webkit-scrollbar-track{background:#f9fafb}
        .table-scroll::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
        table{width:100%;border-collapse:collapse}
        thead{background:#111827;position:sticky;top:0;z-index:10}
        th{padding:12px 15px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px}
        td{padding:12px 15px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6}
        tr:last-child td{border-bottom:none}
        tbody tr:hover{background:#fafafa;cursor:pointer}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .dr-chip{display:inline-block;background:#111827;color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;font-family:monospace}
        .action-btns{display:flex;gap:6px}
        .btn-view{padding:5px 10px;background:#f3f4f6;border:none;border-radius:6px;font-size:12px;cursor:pointer}
        .btn-view:hover{background:#e5e7eb}
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
        .modal{background:white;border-radius:16px;padding:30px;width:760px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;animation:popIn 0.2s ease}
        @keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal h3{margin:0 0 4px;font-size:18px;color:#111827}
        .modal-sub{font-size:12px;color:#9ca3af;margin-bottom:20px}
        .dr-preview{display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;padding:8px 14px;border-radius:8px}
        .dr-preview-num{font-size:20px;font-weight:800;color:#15803d;font-family:monospace}
        .dr-preview-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase}
        .dr-edit-label{display:inline-flex;align-items:center;gap:8px;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 14px;border-radius:8px}
        .dr-edit-num{font-size:20px;font-weight:800;color:#6b7280;font-family:monospace}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:5px}
        .form-group label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px}
        .form-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;color:#111827}
        .form-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15);background:white}
        .form-input.err{border-color:#ef4444}
        textarea.form-input{resize:vertical;min-height:55px}
        .error-msg{font-size:11px;color:#ef4444}
        .section-title{font-size:11px;font-weight:800;color:#b30000;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #fef2f2;display:flex;justify-content:space-between;align-items:center;gap:10px}
        .lines-table{width:100%;border-collapse:collapse;margin-bottom:8px;table-layout:fixed}
        .lines-table th{background:#f9fafb;padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid #e5e7eb;text-align:left}
        .lines-table td{padding:6px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
        .lines-table tr:last-child td{border-bottom:none}
        .line-input{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;box-sizing:border-box}
        .line-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.12);background:white}
        .line-total{font-size:13px;font-weight:700;color:#15803d;text-align:right;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .btn-remove-line{padding:5px 8px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;color:#b91c1c;font-size:14px;line-height:1}
        .btn-remove-line:hover{background:#fecaca}
        .btn-remove-line:disabled{opacity:0.3;cursor:not-allowed}
        .btn-add-line{padding:7px 14px;background:#f0fdf4;border:1px dashed #86efac;border-radius:8px;color:#15803d;font-size:13px;font-weight:600;cursor:pointer;width:100%;margin-top:4px}
        .btn-add-line:hover{background:#dcfce7}
        .warranty-error-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:#b91c1c;font-weight:600}
        .labor-section{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 16px;margin-top:14px}
        .labor-section-title{font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .discount-section{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-top:14px}
        .discount-section-title{font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .summary-box{border-radius:10px;overflow:hidden;margin-top:12px;border:1px solid #e5e7eb}
        .summary-row{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px}
        .summary-row:last-child{border-bottom:none}
        .summary-row.subtotal{background:#f9fafb;color:#374151}
        .summary-row.labor{background:#f5f3ff;color:#6d28d9;font-weight:600}
        .summary-row.discount{background:#f0fdf4;color:#15803d;font-weight:600}
        .summary-row.total{background:#111827;color:white;font-weight:800;font-size:14px}
        .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;align-items:center;flex-wrap:wrap}
        .esc-hint{font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:5px;margin-right:auto}
        .esc-key{display:inline-block;padding:2px 7px;border:1px solid #d1d5db;border-radius:4px;font-size:10px;font-family:monospace;background:#f9fafb;color:#6b7280;box-shadow:0 1px 0 #d1d5db;line-height:1.6}
        .btn-cancel{padding:9px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-cancel:hover{background:#e5e7eb}
        .btn-save{padding:9px 24px;background:#b30000;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .btn-save:not(:disabled):hover{background:#e00000}
        .btn-print{padding:9px 18px;background:#111827;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-print:hover{background:#374151}
        .detail-section-title{font-size:10px;font-weight:800;color:#b30000;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px}
        .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f9fafb;font-size:13px}
        .detail-row:last-child{border-bottom:none}
        .detail-label{color:#6b7280;font-weight:600}
        .detail-val{color:#111827;font-weight:500;text-align:right}
        .items-detail-table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed}
        .items-detail-table th{background:#f9fafb;padding:8px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;text-align:left}
        .items-detail-table td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#111827;overflow:hidden}
        .items-detail-table tr:last-child td{border-bottom:none}
        .detail-totals{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-top:12px}
        .detail-total-row{display:flex;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px}
        .detail-total-row:last-child{border-bottom:none}
        .detail-total-row.grand{background:#111827;color:white;font-weight:800;font-size:15px}
        .detail-total-row.labor{background:#f5f3ff;color:#6d28d9;font-weight:600}
        .detail-total-row.discount{background:#f0fdf4;color:#15803d;font-weight:600}
        .confirm-modal{background:white;border-radius:14px;padding:30px;width:360px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);text-align:center;animation:popIn 0.2s ease}
        .btn-confirm-del{padding:9px 20px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-confirm-del:hover{background:#dc2626}
        .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;color:white;z-index:9999;animation:slideUp 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
        .toast-success{background:#16a34a}
        .toast-error{background:#dc2626}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* HEADER */}
      <div className="q-header">
        <h2>📝 Purchase Orders</h2>
        <div className="q-controls">
          <input className="q-search" placeholder="🔍 Search supplier, agent, PO#..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="q-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-add" onClick={openAdd}>+ Add Purchase Order</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        {[
          { icon: "📝", label: "Total", value: summaryStats.total, color: "#111827" },
          { icon: "✏️", label: "Draft", value: summaryStats.draft, color: "#374151" },
          { icon: "🚚", label: "Ordered", value: summaryStats.ordered, color: "#854d0e" },
          { icon: "✅", label: "Received", value: summaryStats.received, color: "#15803d" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div><div className="stat-num" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>PO #</th><th>Supplier</th><th>Prepared By</th><th>Status</th><th>Order Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr className="skeleton-row" key={i}>
                    {[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ width: j === 0 ? 20 : "80%" }} /></td>)}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr className="empty-row"><td colSpan={7}>No purchase orders found.</td></tr>
              ) : paginated.map((o, i) => {
                const ss = statusStyle(o.status)
                return (
                  <tr key={o.id} onClick={() => openDetail(o)}>
                    <td style={{ color: "#9ca3af" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className="dr-chip">{o.po_number ?? "—"}</span></td>
                    <td>
                      <strong>{o.supplier_name || "—"}</strong>
                      {o.remarks && (
                        <div style={{
                          marginTop: 3, fontSize: 11, color: "#9ca3af", fontWeight: 400,
                          maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                        }} title={o.remarks}>
                          ✓ {o.remarks}
                        </div>
                      )}
                    </td>
                    <td>{o.employees?.full_name || "—"}</td>
                    <td><span className="badge" style={{ background: ss.bg, color: ss.color }}>{o.status}</span></td>
                    <td style={{ color: "#6b7280", fontSize: 12 }}>
                      {new Date(o.order_date || o.created_at).toLocaleDateString("en-PH")}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn-view" onClick={() => openDetail(o)}>👁</button>
                        <button className="btn-edit-sm" onClick={() => openEdit(o)}>✏️</button>
                        <button className="btn-del-sm" onClick={() => confirmDelete(o)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {!loading && filtered.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} purchase order{filtered.length !== 1 ? "s" : ""}
          </span>
          {totalPages > 1 && (
            <div className="pagination-btns">
              <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
                ) : (
                  <button key={p} className={`pg-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                )
              )}
              <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="overlay">
          <div className="modal">
            <h3>{editId ? "✏️ Edit Purchase Order" : "➕ New Purchase Order"}</h3>
            <div className="modal-sub">Fill in the details below</div>

            {/* PO NUMBER */}
            <div style={{ marginBottom: 16 }}>
              {editId ? (
                <div className="dr-edit-label">
                  <span className="dr-preview-label">PO #</span>
                  <span className="dr-edit-num">{nextPO}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>(cannot be changed)</span>
                </div>
              ) : (
                <div className="dr-preview">
                  <span className="dr-preview-label">Auto PO #</span>
                  <span className="dr-preview-num">{nextPO ?? "..."}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>assigned on save</span>
                </div>
              )}
            </div>

            {/* HEADER FIELDS */}
            <div className="form-grid">
              <div className="form-group">
                <label>Supplier *</label>
                <SearchSelect options={supplierOptions} value={form.supplier_id}
                  onChange={handleSupplierChange}
                  placeholder="Search supplier..." error={errors.supplier_name} />
                {!form.supplier_id && form.supplier_name && (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    Current: {form.supplier_name} (not linked). Pick a supplier above to link it.
                  </div>
                )}
                {errors.supplier_name && <div className="error-msg">{errors.supplier_name}</div>}
              </div>
              <div className="form-group">
                <label>Prepared By *</label>
                <SearchSelect options={agentOptions} value={form.agent_id}
                  onChange={val => setForm(f => ({ ...f, agent_id: val }))}
                  placeholder="Search employee..." error={errors.agent_id} />
                {errors.agent_id && <div className="error-msg">{errors.agent_id}</div>}
              </div>
              <div className="form-group">
                <label>Supplier Address</label>
                <input className="form-input" placeholder="Address..."
                  value={form.supplier_address}
                  onChange={e => setForm(f => ({ ...f, supplier_address: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Supplier Contact</label>
                <input className="form-input" placeholder="Phone / email..."
                  value={form.supplier_contact}
                  onChange={e => setForm(f => ({ ...f, supplier_contact: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Order Date</label>
                <input type="date" className="form-input" value={form.order_date}
                  onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Expected Delivery</label>
                <input type="date" className="form-input" value={form.expected_date}
                  onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input className="form-input" placeholder="e.g. 30 days, COD..."
                  value={form.payment_terms}
                  onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group form-full">
                <label>Remarks</label>
                <textarea className="form-input" placeholder="Additional notes..."
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>

            {/* LINE ITEMS */}
            <div className="section-title"><span>📦 Line Items</span></div>

            <table className="lines-table">
              <thead>
                <tr>
                  <th style={{ width: "42%" }}>Product</th>
                  <th style={{ width: "12%" }}>Qty</th>
                  <th style={{ width: "20%" }}>Unit Cost (₱)</th>
                  <th style={{ width: "19%" }}>Subtotal</th>
                  <th style={{ width: "7%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <SearchSelect options={productOptions} value={line.item_id}
                        onChange={val => handleLineProductChange(idx, val)} placeholder="Search product..." />
                    </td>
                    <td>
                      <input type="number" min="1" className="line-input" placeholder="1"
                        value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" className="line-input" placeholder="0"
                        value={line.price} onChange={e => updateLine(idx, "price", e.target.value)} />
                    </td>
                    <td>
                      <div className="line-total">{lineTotal(line) > 0 ? fmt(lineTotal(line)) : "—"}</div>
                    </td>
                    <td>
                      <button className="btn-remove-line" disabled={lines.length === 1} onClick={() => removeLine(idx)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {errors.lines && <div className="warranty-error-box">⚠️ {errors.lines}</div>}

            <button className="btn-add-line" onClick={addLine}>+ Add Another Item</button>

            {/* SHIPPING */}
            <div className="labor-section">
              <div className="labor-section-title">
                🚚 Shipping / Freight
                <span style={{ fontWeight: 400, color: "#a78bfa", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional)</span>
              </div>
              <div className="form-group">
                <label>Amount (₱)</label>
                <input type="number" min="0" className="form-input" placeholder="0.00"
                  value={form.shipping_fee}
                  onChange={e => setForm(f => ({ ...f, shipping_fee: e.target.value }))}
                  style={{ background: "white" }} />
              </div>
            </div>

            {/* DISCOUNT */}
            <div className="discount-section">
              <div className="discount-section-title">
                🏷 Discount
                <span style={{ fontWeight: 400, color: "#6b7280", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional)</span>
              </div>
              <div className="form-group">
                <label>Amount (₱)</label>
                <input type="number" min="0" className="form-input" placeholder="0.00"
                  value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                  style={{ background: "white" }} />
              </div>
            </div>

            {/* SUMMARY */}
            {currentSubtotal > 0 && (
              <div className="summary-box">
                <div className="summary-row subtotal">
                  <span>📦 Subtotal ({lines.filter(l => l.item_id).length} item{lines.filter(l => l.item_id).length !== 1 ? "s" : ""})</span>
                  <span>{fmt(currentSubtotal)}</span>
                </div>
                {shippingAmt > 0 && (
                  <div className="summary-row labor">
                    <span>🚚 Shipping / Freight</span>
                    <span>+ {fmt(shippingAmt)}</span>
                  </div>
                )}
                {discountAmt > 0 && (
                  <div className="summary-row discount">
                    <span>🏷 Discount</span>
                    <span>− {fmt(discountAmt)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>💰 Total Amount</span>
                  <span>{fmt(totalAmount)}</span>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : `Create PO #${nextPO ?? "..."}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────────── */}
      {showDetail && selected && (() => {
        const detailSubtotal = selectedLines.reduce((sum, it) => sum + (it.price * it.quantity || 0), 0)
        const detailShipping = Number(selected.shipping_fee) || 0
        const detailDiscount = Number(selected.discount) || 0
        const detailTotal = detailSubtotal + detailShipping - detailDiscount
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"
        return (
          <div className="overlay">
            <div className="modal">
              <h3>📝 Purchase Order Details</h3>

              <div className="detail-section-title">Supplier</div>
              <div className="detail-row"><span className="detail-label">Name</span><span className="detail-val">{selected.supplier_name || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Address</span><span className="detail-val">{selected.supplier_address || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Contact</span><span className="detail-val">{selected.supplier_contact || "—"}</span></div>

              <div className="detail-section-title">Info</div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-val">{(() => { const ss = statusStyle(selected.status); return <span className="badge" style={{ background: ss.bg, color: ss.color }}>{selected.status}</span> })()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">PO #</span>
                <span className="detail-val"><span className="dr-chip">{selected.po_number ?? "—"}</span></span>
              </div>
              <div className="detail-row"><span className="detail-label">Prepared By</span><span className="detail-val">{selected.employees?.full_name || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Order Date</span><span className="detail-val">{fmtDate(selected.order_date || selected.created_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Expected Delivery</span><span className="detail-val">{fmtDate(selected.expected_date)}</span></div>
              <div className="detail-row"><span className="detail-label">Payment Terms</span><span className="detail-val">{selected.payment_terms || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Remarks</span><span className="detail-val">{selected.remarks || "—"}</span></div>

              <div className="detail-section-title">📦 Items</div>
              {selectedLines.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: "10px 0" }}>No items recorded.</div>
              ) : (
                <>
                  <table className="items-detail-table">
                    <thead>
                      <tr>
                        <th style={{ width: "7%" }}>#</th>
                        <th style={{ width: "43%" }}>Product</th>
                        <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                        <th style={{ width: "20%", textAlign: "right" }}>Unit Cost</th>
                        <th style={{ width: "20%", textAlign: "right" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLines.map((item, i) => (
                        <tr key={item.id}>
                          <td style={{ color: "#9ca3af" }}>{i + 1}</td>
                          <td><strong>{item.products?.name || "—"}</strong></td>
                          <td style={{ textAlign: "center" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right" }}>{fmt(item.price)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                            {item.price && item.quantity ? fmt(item.price * item.quantity) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="detail-totals">
                    <div className="detail-total-row">
                      <span>📦 Subtotal</span>
                      <span>{fmt(detailSubtotal)}</span>
                    </div>
                    {detailShipping > 0 && (
                      <div className="detail-total-row labor">
                        <span>🚚 Shipping / Freight</span>
                        <span>+ {fmt(detailShipping)}</span>
                      </div>
                    )}
                    {detailDiscount > 0 && (
                      <div className="detail-total-row discount">
                        <span>🏷 Discount</span>
                        <span>− {fmt(detailDiscount)}</span>
                      </div>
                    )}
                    <div className="detail-total-row grand">
                      <span>💰 Total Amount</span>
                      <span>{fmt(detailTotal)}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="modal-footer">
                <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
                <button className="btn-cancel" onClick={() => setShowDetail(false)}>Close</button>
                <button className="btn-print" onClick={() => printOrder(selected, selectedLines)}>🖨️ Print PO</button>
                <button className="btn-print" style={{ background: "#047857" }} onClick={() => saveAsImage(selected, selectedLines)}>
                  Save as PNG
                </button>
                <button className="btn-edit-sm" style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => openEdit(selected)}>✏️ Edit</button>
                <button className="btn-confirm-del" onClick={() => confirmDelete(selected)}>🗑 Delete</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── DELETE CONFIRM ───────────────────────────────────────────────────── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="overlay">
          <div className="confirm-modal">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>Delete Purchase Order?</h3>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 22px" }}>
              Deletes PO <strong>#{deleteTarget.po_number}</strong> for <strong>{deleteTarget.supplier_name}</strong> and all its line items. Cannot be undone.
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