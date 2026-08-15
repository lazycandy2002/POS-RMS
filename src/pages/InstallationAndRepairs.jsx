import { useState, useEffect, useRef } from "react"
import React from "react"
import { createRoot } from "react-dom/client"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"
import { InstallationAndRepairTemplate } from "../pages/InstallationAndRepairTemplate"
import { ProductRecordTemplate } from "../pages/ProductRecordTemplate"

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

const STATUSES = ["Open", "In Progress", "Completed", "Cancelled", "On Hold"]
const TYPES = ["Installation", "Repair", "Maintenance", "Inspection"]
const PAGE_SIZE = 10

const emptyForm = {
  type: "Installation",
  prepared_by: "",
  technician_id: "",
  quotation_id: "",
  client_id: "",
  address: "",
  remarks: "",
  status: "Open",
  start_date: "",
  end_date: "",
  labor_charge: "",
  discount: "",
  downpayment: "",
  downpayment_date: "",
  downpayment_2: "",
  downpayment_2_date: "",
  downpayment_3: "",
  downpayment_3_date: "",
}

const emptyLine = { item_id: "", quantity: 1, price: "", serial_number: "", description: "" }

export default function InstallationAndRepairs() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [quotations, setQuotations] = useState([])
  const [clients, setClients] = useState([])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [lines, setLines] = useState([{ ...emptyLine }])
  const [installerMode, setInstallerMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nextTicket, setNextTicket] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedLines, setSelectedLines] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [quotationSource, setQuotationSource] = useState("")
  const [dpCount, setDpCount] = useState(1)

  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchAll()
  }, [])

  // Reset page on filter/search change
  useEffect(() => { setPage(1) }, [search, filterStatus, filterType])

  // ─── ESC TO CLOSE MODALS ──────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== "Escape") return
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false)
        setDeleteTarget(null)
      } else if (showDetail) {
        setShowDetail(false)
      } else if (showModal) {
        setShowModal(false)
      }
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [showModal, showDetail, showDeleteConfirm])

  const fetchAll = async () => {
    setLoading(true)
    const [irRes, eRes, pRes, qRes, cRes] = await Promise.all([
      supabase
        .from("installation_repairs")
        .select(`
          *,
          client:clients(id, full_name, address, phone, email),
          preparer:employees!installation_repairs_prepared_by_fkey(id,full_name),
          technician:employees!installation_repairs_technician_id_fkey(id,full_name),
          quotations(id,dr,clients(full_name))
        `)
        .order("ticket_number", { ascending: false }),
      supabase.from("employees").select("id,full_name").order("full_name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("quotations")
        .select("id,dr,clients(full_name),quotation_items(id,item_id,quantity,price,serial_number,products(id,name,price_retail,price_gov,warranty))")
        .order("dr", { ascending: false }),
      supabase.from("clients").select("id,full_name,address,phone,email,category").order("full_name"),
    ])
    if (!irRes.error) setRecords(irRes.data ?? [])
    if (!eRes.error) setEmployees(eRes.data ?? [])
    if (!pRes.error) setProducts(pRes.data ?? [])
    if (!qRes.error) setQuotations(qRes.data ?? [])
    if (!cRes.error) setClients(cRes.data ?? [])
    setLoading(false)
  }

  const fetchIRItems = async (irId) => {
    const { data } = await supabase.from("ir_items").select("*, products(*)").eq("ir_id", irId)
    return data ?? []
  }

  const computeNextTicket = async () => {
    const { data } = await supabase.from("installation_repairs").select("ticket_number").order("ticket_number", { ascending: false }).limit(1)
    const last = data?.[0]?.ticket_number ?? 0
    const next = Number(last) + 1
    setNextTicket(next)
    return next
  }

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fmt = (n) => n != null && n !== "" ? `₱${Number(n).toLocaleString()}` : "—"
  const lineTotal = (line) => line.price !== "" && line.quantity ? Number(line.price) * Number(line.quantity) : 0
  const itemsTotal = (lineArr) => lineArr.reduce((sum, l) => sum + lineTotal(l), 0)
  const grandTotal = (lineArr, labor, discount, dp1, dp2, dp3) =>
    itemsTotal(lineArr) + (Number(labor) || 0) - (Number(discount) || 0) -
    ((Number(dp1) || 0) + (Number(dp2) || 0) + (Number(dp3) || 0))

  const getClientName = (r) => r.client?.full_name ?? r.client_name ?? "—"
  const getClientAddress = (r) => r.client?.address ?? r.address ?? "—"

  const isInstallerClient = (clientId) => {
    const client = clients.find(c => String(c.id) === String(clientId))
    return client?.category?.toLowerCase().includes("installer") ?? false
  }

  const getProductPrice = (product, installerOverride = installerMode) => {
    if (!product) return ""
    if (installerOverride) {
      return product.price_installer ?? product.price_retail ?? product.price_gov ?? ""
    }
    return product.price_retail ?? product.price_gov ?? ""
  }

  // ─── WORK ORDER PRINT ─────────────────────────────────────────────────────
  const handlePrint = (record, lines) => {
    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (!printWindow) { showToast("Pop-up blocked. Please allow pop-ups for this site.", "error"); return }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Work Order #${String(record.ticket_number ?? "").padStart(6, "0")}</title></head><body style="margin:0;padding:0;"><div id="print-root"></div></body></html>`)
    printWindow.document.close()
    setTimeout(() => {
      try {
        const container = printWindow.document.getElementById("print-root")
        const root = createRoot(container)
        root.render(React.createElement(InstallationAndRepairTemplate, { record, lines }))
        setTimeout(() => { printWindow.focus(); printWindow.addEventListener("afterprint", () => printWindow.close()); printWindow.print() }, 900)
      } catch (err) { console.error("Print render error:", err); showToast("Print failed: " + err.message, "error") }
    }, 100)
  }

  // ─── PRODUCT RECORD PRINT ─────────────────────────────────────────────────
  const handlePrintProductRecord = (record, lines) => {
    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (!printWindow) { showToast("Pop-up blocked. Please allow pop-ups for this site.", "error"); return }

    const quotationLike = {
      dr: record.ticket_number,
      created_at: record.created_at,
      status: record.status,
      remarks: record.remarks,
      client_id: record.client_id,
      clients: record.client
        ? { full_name: record.client.full_name }
        : { full_name: record.client_name ?? "—" },
      employees: record.preparer
        ? { full_name: record.preparer.full_name }
        : null,
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Product Record — Ticket #${String(record.ticket_number ?? "").padStart(6, "0")}</title></head><body style="margin:0;padding:0;"><div id="print-root"></div></body></html>`)
    printWindow.document.close()
    setTimeout(() => {
      try {
        const container = printWindow.document.getElementById("print-root")
        const root = createRoot(container)
        root.render(React.createElement(ProductRecordTemplate, { quotation: quotationLike, lines }))
        setTimeout(() => { printWindow.focus(); printWindow.addEventListener("afterprint", () => printWindow.close()); printWindow.print() }, 900)
      } catch (err) { console.error("Product record print error:", err); showToast("Print failed: " + err.message, "error") }
    }, 100)
  }

  // ─── QUOTATION CHANGE ─────────────────────────────────────────────────────
  const handleQuotationChange = (qId) => {
    setForm(f => ({ ...f, quotation_id: qId }))
    if (!qId) { setLines([{ ...emptyLine }]); return }
    const q = quotations.find(q => String(q.id) === String(qId))
    if (q?.quotation_items?.length > 0) {
      setLines(q.quotation_items.map(it => ({
        item_id: String(it.item_id ?? ""),
        quantity: it.quantity ?? 1,
        price: it.price ?? "",
        serial_number: it.serial_number ?? "",
        description: it.products?.name ?? "",
      })))
    } else {
      setLines([{ ...emptyLine }])
    }
    if (q?.clients?.full_name) {
      const matchedClient = clients.find(c => c.full_name === q.clients.full_name)
      if (matchedClient) {
        setForm(f => ({ ...f, quotation_id: qId, client_id: String(matchedClient.id) }))
      } else {
        setForm(f => ({ ...f, quotation_id: qId }))
      }
    }
  }

  const handleLineProductChange = (idx, productId) => {
    const product = products.find(p => String(p.id) === String(productId))
    const autoPrice = getProductPrice(product)
    setLines(prev => prev.map((l, i) =>
      i === idx ? { ...l, item_id: productId, price: autoPrice, description: product?.name ?? "" } : l
    ))
  }

  const toggleInstallerMode = () => {
    setInstallerMode(prev => {
      const next = !prev
      setLines(prevLines => prevLines.map(l => {
        if (!l.item_id) return l
        const product = products.find(p => String(p.id) === String(l.item_id))
        const newPrice = getProductPrice(product, next)
        return { ...l, price: newPrice !== "" ? newPrice : l.price }
      }))
      return next
    })
  }

  const addLine = () => setLines(prev => [...prev, { ...emptyLine }])
  const removeLine = (idx) => { if (lines.length === 1) return; setLines(prev => prev.filter((_, i) => i !== idx)) }
  const updateLine = (idx, field, val) => { setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l)) }

  const validate = () => {
    const e = {}
    if (!form.prepared_by) e.prepared_by = "Required"
    if (!form.technician_id) e.technician_id = "Required"
    if (!form.client_id) e.client_id = "Required"
    if (form.start_date && form.end_date && form.end_date < form.start_date) e.end_date = "End date must be after start date"
    return e
  }

  const openAdd = async () => {
    setForm(emptyForm)
    setLines([{ ...emptyLine }])
    setInstallerMode(false)
    setEditId(null)
    setErrors({})
    setQuotationSource("")
    setDpCount(1)
    await computeNextTicket()
    setShowModal(true)
  }

  const openEdit = async (r) => {
    setForm({
      type: r.type ?? "Installation",
      prepared_by: r.prepared_by ?? "",
      technician_id: r.technician_id ?? "",
      quotation_id: r.quotation_id ?? "",
      client_id: r.client_id ? String(r.client_id) : "",
      address: r.address ?? "",
      remarks: r.remarks ?? "",
      status: r.status ?? "Open",
      start_date: r.start_date ? r.start_date.split("T")[0] : "",
      end_date: r.end_date ? r.end_date.split("T")[0] : "",
      labor_charge: r.labor_charge ?? "",
      discount: r.discount ?? "",
      downpayment: r.downpayment ?? "",
      downpayment_date: r.downpayment_date ? r.downpayment_date.split("T")[0] : "",
      downpayment_2: r.downpayment_2 ?? "",
      downpayment_2_date: r.downpayment_2_date ? r.downpayment_2_date.split("T")[0] : "",
      downpayment_3: r.downpayment_3 ?? "",
      downpayment_3_date: r.downpayment_3_date ? r.downpayment_3_date.split("T")[0] : "",
    })
    setNextTicket(r.ticket_number)
    setEditId(r.id)
    setErrors({})
    setInstallerMode(isInstallerClient(r.client_id))
    setQuotationSource(r.quotation_id ? "quotation" : "manual")
    const hasDp3 = r.downpayment_3 != null && r.downpayment_3 !== ""
    const hasDp2 = r.downpayment_2 != null && r.downpayment_2 !== ""
    setDpCount(hasDp3 ? 3 : hasDp2 ? 2 : 1)
    const items = await fetchIRItems(r.id)
    setLines(items.length > 0
      ? items.map(it => ({
        item_id: it.item_id ?? "",
        quantity: it.quantity ?? 1,
        price: it.price ?? "",
        serial_number: it.serial_number ?? "",
        description: it.description ?? it.products?.name ?? "",
      }))
      : [{ ...emptyLine }]
    )
    setShowModal(true)
    setShowDetail(false)
  }

  const openDetail = async (r) => {
    setSelected(r)
    const items = await fetchIRItems(r.id)
    setSelectedLines(items)
    setShowDetail(true)
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    try {
      let irId = editId
      const payload = {
        type: form.type,
        prepared_by: form.prepared_by ? Number(form.prepared_by) : null,
        technician_id: form.technician_id ? Number(form.technician_id) : null,
        quotation_id: form.quotation_id ? Number(form.quotation_id) : null,
        client_id: form.client_id ? Number(form.client_id) : null,
        address: form.address || null,
        remarks: form.remarks || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        labor_charge: form.labor_charge !== "" ? Number(form.labor_charge) : null,
        discount: form.discount !== "" ? Number(form.discount) : null,
        downpayment: form.downpayment !== "" ? Number(form.downpayment) : null,
        downpayment_date: form.downpayment_date || null,
        downpayment_2: form.downpayment_2 !== "" ? Number(form.downpayment_2) : null,
        downpayment_2_date: form.downpayment_2_date || null,
        downpayment_3: form.downpayment_3 !== "" ? Number(form.downpayment_3) : null,
        downpayment_3_date: form.downpayment_3_date || null,
      }
      if (editId) {
        const { error } = await supabase.from("installation_repairs").update(payload).eq("id", editId)
        if (error) throw new Error("Update failed: " + error.message)
        await supabase.from("ir_items").delete().eq("ir_id", editId)
      } else {
        const ticket = await computeNextTicket()
        const { data, error } = await supabase.from("installation_repairs").insert([{ ...payload, ticket_number: ticket }]).select().single()
        if (error) throw new Error("Insert failed: " + error.message)
        irId = data.id
      }
      const validLines = lines.filter(l => l.quantity && (l.item_id || l.description))
      if (validLines.length > 0) {
        const itemsPayload = validLines.map(l => ({
          ir_id: irId,
          item_id: l.item_id ? Number(l.item_id) : null,
          quantity: Number(l.quantity),
          price: l.price !== "" ? Number(l.price) : null,
          serial_number: l.serial_number || null,
          description: l.description || null,
        }))
        const { error: itemsError } = await supabase.from("ir_items").insert(itemsPayload)
        if (itemsError) throw new Error("Insert items failed: " + itemsError.message)
      }
      showToast(editId ? "Record updated." : `Ticket #${nextTicket} created.`)
      setShowModal(false)
      fetchAll()
    } catch (err) {
      showToast("Error: " + err.message, "error")
    }
    setSaving(false)
  }

  const confirmDelete = (r) => { setDeleteTarget(r); setShowDeleteConfirm(true); setShowDetail(false) }
  const handleDelete = async () => {
    await supabase.from("ir_items").delete().eq("ir_id", deleteTarget.id)
    const { error } = await supabase.from("installation_repairs").delete().eq("id", deleteTarget.id)
    if (error) showToast("Failed to delete: " + error.message, "error")
    else { showToast("Record deleted."); fetchAll() }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  const statusStyle = (s) => ({
    "Open": { bg: "#dbeafe", color: "#1d4ed8" },
    "In Progress": { bg: "#fef9c3", color: "#854d0e" },
    "Completed": { bg: "#dcfce7", color: "#15803d" },
    "Cancelled": { bg: "#f3f4f6", color: "#6b7280" },
    "On Hold": { bg: "#fce7f3", color: "#9d174d" },
  }[s] || { bg: "#f3f4f6", color: "#374151" })

  const typeStyle = (t) => ({
    "Installation": { bg: "#111827", color: "white" },
    "Repair": { bg: "#fef2f2", color: "#b91c1c" },
    "Maintenance": { bg: "#f0fdf4", color: "#15803d" },
    "Inspection": { bg: "#f5f3ff", color: "#6d28d9" },
  }[t] || { bg: "#f3f4f6", color: "#374151" })

  const employeeOptions = employees.map(e => ({ value: e.id, label: e.full_name }))
  const productOptions = products.map(p => {
    const activePrice = getProductPrice(p)
    return {
      value: p.id, label: p.name,
      sub: activePrice !== "" && activePrice != null ? `₱${Number(activePrice).toLocaleString()}` : "",
    }
  })
  const quotationOptions = quotations.map(q => ({
    value: q.id,
    label: `DR# ${q.dr} — ${q.clients?.full_name || "Unknown Client"}`,
    sub: `${q.quotation_items?.length || 0} item(s)`,
  }))
  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.full_name,
    sub: c.category ?? "",
  }))

  // ─── FILTERED + PAGINATED ─────────────────────────────────────────────────
  const filtered = records.filter(r => {
    const s = search.toLowerCase()
    const clientName = getClientName(r)
    const match = !s || [clientName, r.preparer?.full_name, r.technician?.full_name, String(r.ticket_number ?? "")]
      .some(f => f?.toLowerCase().includes(s))
    const matchStatus = filterStatus === "all" || r.status === filterStatus
    const matchType = filterType === "all" || r.type === filterType
    return match && matchStatus && matchType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summaryStats = {
    total: records.length,
    open: records.filter(r => r.status === "Open").length,
    inProgress: records.filter(r => r.status === "In Progress").length,
    completed: records.filter(r => r.status === "Completed").length,
  }

  // ─── DOWNPAYMENT HELPERS (modal) ──────────────────────────────────────────
  const dp1Amt = Number(form.downpayment) || 0
  const dp2Amt = Number(form.downpayment_2) || 0
  const dp3Amt = Number(form.downpayment_3) || 0
  const downpaymentTotal = dp1Amt + dp2Amt + dp3Amt
  const dpEntries = [
    { n: 1, amt: dp1Amt, date: form.downpayment_date },
    { n: 2, amt: dp2Amt, date: form.downpayment_2_date },
    { n: 3, amt: dp3Amt, date: form.downpayment_3_date },
  ].filter(d => d.amt > 0)

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
        .ir-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .ir-header h2{margin:0;font-size:22px;color:#111827}
        .ir-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .ir-search{padding:9px 14px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;width:220px;background:white;font-family:Segoe UI}
        .ir-search:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15)}
        .ir-filter{padding:9px 12px;border:1px solid #ddd;border-radius:8px;outline:none;font-size:13px;background:white;cursor:pointer;font-family:Segoe UI}
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
        .table-scroll::-webkit-scrollbar-thumb:hover{background:#d1d5db}
        table{width:100%;border-collapse:collapse}
        thead{background:#111827;position:sticky;top:0;z-index:10}
        th{padding:12px 15px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px}
        td{padding:12px 15px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6}
        tr:last-child td{border-bottom:none}
        tbody tr:hover{background:#fafafa;cursor:pointer}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .type-chip{display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700}
        .ticket-chip{display:inline-block;background:#111827;color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;font-family:monospace}
        .action-btns{display:flex;gap:6px}
        .btn-view{padding:5px 10px;background:#f3f4f6;border:none;border-radius:6px;font-size:12px;cursor:pointer}
        .btn-print{padding:5px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:12px;cursor:pointer;color:#15803d;font-weight:600}
        .btn-print:hover{background:#dcfce7}
        .btn-print-rec{padding:5px 10px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:6px;font-size:12px;cursor:pointer;color:#6d28d9;font-weight:600}
        .btn-print-rec:hover{background:#ede9fe}
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
        .pg-btn.active:hover{background:#b30000}
        .pg-ellipsis{padding:5px 4px;color:#9ca3af;font-size:13px;user-select:none}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;justify-content:center;align-items:center;z-index:1000;padding:20px}
        .modal{background:white;border-radius:16px;padding:30px;width:800px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;animation:popIn 0.2s ease}
        @keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal h3{margin:0 0 4px;font-size:18px;color:#111827}
        .modal-sub{font-size:12px;color:#9ca3af;margin-bottom:20px}
        .ticket-preview{display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;padding:8px 14px;border-radius:8px;margin-bottom:16px}
        .ticket-num{font-size:20px;font-weight:800;color:#15803d;font-family:monospace}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:5px}
        .form-group label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px}
        .form-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;color:#111827}
        .form-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.15);background:white}
        .form-input.err{border-color:#ef4444}
        textarea.form-input{resize:vertical;min-height:55px}
        .error-msg{font-size:11px;color:#ef4444}
        .section-title{font-size:11px;font-weight:800;color:#b30000;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #fef2f2;display:flex;align-items:center;justify-content:space-between}
        .source-toggle{display:flex;gap:8px;margin-bottom:12px}
        .source-btn{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;transition:all 0.15s}
        .source-btn.active{background:#111827;color:white;border-color:#111827}
        .installer-toggle-btn{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:20px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;text-transform:none;letter-spacing:normal}
        .installer-toggle-btn:hover{background:#f3f4f6}
        .installer-toggle-btn.on{background:#ede9fe;border-color:#c4b5fd;color:#6d28d9}
        .installer-toggle-track{width:28px;height:15px;border-radius:20px;background:#d1d5db;position:relative;transition:background 0.15s;flex-shrink:0}
        .installer-toggle-btn.on .installer-toggle-track{background:#7c3aed}
        .installer-toggle-thumb{position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:white;transition:transform 0.15s}
        .installer-toggle-btn.on .installer-toggle-thumb{transform:translateX(13px)}
        .lines-table{width:100%;border-collapse:collapse;margin-bottom:8px}
        .lines-table th{background:#f9fafb;padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid #e5e7eb;text-align:left}
        .lines-table td{padding:6px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
        .line-input{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;box-sizing:border-box}
        .line-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.12);background:white}
        .line-total{font-size:13px;font-weight:700;color:#15803d;text-align:right;padding:0 8px;white-space:nowrap}
        .btn-remove-line{padding:5px 8px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;color:#b91c1c;font-size:14px;line-height:1}
        .btn-remove-line:hover{background:#fecaca}
        .btn-remove-line:disabled{opacity:0.3;cursor:not-allowed}
        .btn-add-line{padding:7px 14px;background:#f0fdf4;border:1px dashed #86efac;border-radius:8px;color:#15803d;font-size:13px;font-weight:600;cursor:pointer;width:100%;margin-top:4px}
        .btn-add-line:hover{background:#dcfce7}
        .labor-section{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 16px;margin-top:14px}
        .labor-title{font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .discount-section{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-top:14px}
        .discount-title{font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .downpayment-section{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-top:14px}
        .downpayment-title{font-size:11px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .summary-box{border-radius:10px;overflow:hidden;margin-top:12px;border:1px solid #e5e7eb}
        .summary-row{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px}
        .summary-row:last-child{border-bottom:none}
        .summary-row.total{background:#111827;color:white;font-weight:700;font-size:14px}
        .summary-row.labor{background:#f5f3ff;color:#6d28d9;font-weight:600}
        .summary-row.discount{background:#f0fdf4;color:#15803d;font-weight:600}
        .summary-row.downpayment{background:#eff6ff;color:#1d4ed8;font-weight:600}
        .summary-row.subtotal{background:#f9fafb;color:#374151}
        .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
        .btn-cancel{padding:9px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-cancel:hover{background:#e5e7eb}
        .btn-save{padding:9px 24px;background:#b30000;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .btn-save:not(:disabled):hover{background:#e00000}
        .detail-section-title{font-size:10px;font-weight:800;color:#b30000;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px}
        .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f9fafb;font-size:13px}
        .detail-row:last-child{border-bottom:none}
        .detail-label{color:#6b7280;font-weight:600}
        .detail-val{color:#111827;font-weight:500;text-align:right}
        .items-detail-table{width:100%;border-collapse:collapse;margin-top:6px}
        .items-detail-table th{background:#f9fafb;padding:8px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;text-align:left}
        .items-detail-table td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#111827}
        .items-detail-table tr:last-child td{border-bottom:none}
        .detail-totals{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-top:12px}
        .detail-total-row{display:flex;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px}
        .detail-total-row:last-child{border-bottom:none}
        .detail-total-row.grand{background:#111827;color:white;font-weight:800;font-size:15px}
        .detail-total-row.labor{background:#f5f3ff;color:#6d28d9;font-weight:600}
        .detail-total-row.discount{background:#f0fdf4;color:#15803d;font-weight:600}
        .detail-total-row.downpayment{background:#eff6ff;color:#1d4ed8;font-weight:600}
        .confirm-modal{background:white;border-radius:14px;padding:30px;width:360px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);text-align:center;animation:popIn 0.2s ease}
        .btn-confirm-del{padding:9px 20px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-confirm-del:hover{background:#dc2626}
        .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;color:white;z-index:9999;animation:slideUp 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
        .toast-success{background:#16a34a}
        .toast-error{background:#dc2626}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .client-info-pill{display:inline-flex;align-items:center;gap:6px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:6px 12px;margin-top:6px;font-size:12px;color:#0369a1}
        .esc-hint{font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:4px}
        .esc-key{display:inline-block;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;color:#6b7280;font-family:monospace;box-shadow:0 1px 0 #9ca3af}
      `}</style>

      {/* HEADER */}
      <div className="ir-header">
        <h2>🔧 Installation & Repairs</h2>
        <div className="ir-controls">
          <input className="ir-search" placeholder="🔍 Search client, technician, ticket#..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="ir-filter" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="ir-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-add" onClick={openAdd}>+ New Ticket</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        {[
          { icon: "🔧", label: "Total", value: summaryStats.total, color: "#111827" },
          { icon: "📋", label: "Open", value: summaryStats.open, color: "#1d4ed8" },
          { icon: "⚙️", label: "In Progress", value: summaryStats.inProgress, color: "#854d0e" },
          { icon: "✅", label: "Completed", value: summaryStats.completed, color: "#15803d" },
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
                <th>#</th><th>Ticket</th><th>Type</th><th>Client</th><th>Technician</th><th>Status</th><th>Start</th><th>End</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr className="skeleton-row" key={i}>
                    {[...Array(9)].map((_, j) => <td key={j}><div className="skeleton" style={{ width: j === 0 ? 20 : "80%" }} /></td>)}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr className="empty-row"><td colSpan={9}>No records found.</td></tr>
              ) : paginated.map((r, i) => {
                const ss = statusStyle(r.status)
                const ts = typeStyle(r.type)
                return (
                  <tr key={r.id} onClick={() => openDetail(r)}>
                    <td style={{ color: "#9ca3af" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className="ticket-chip">{r.ticket_number ?? "—"}</span></td>
                    <td><span className="type-chip" style={{ background: ts.bg, color: ts.color }}>{r.type}</span></td>
                    <td>
                      <strong>{getClientName(r)}</strong>
                      {r.remarks && (
                        <div style={{
                          marginTop: 3, fontSize: 11, color: "#9ca3af", fontWeight: 400,
                          maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                        }} title={r.remarks}>
                          ✓ {r.remarks}
                        </div>
                      )}
                    </td>
                    <td>{r.technician?.full_name || "—"}</td>
                    <td><span className="badge" style={{ background: ss.bg, color: ss.color }}>{r.status}</span></td>
                    <td style={{ color: "#6b7280", fontSize: 12 }}>{r.start_date ? new Date(r.start_date + "T00:00:00").toLocaleDateString("en-PH") : "—"}</td>
                    <td style={{ color: "#6b7280", fontSize: 12 }}>{r.end_date ? new Date(r.end_date + "T00:00:00").toLocaleDateString("en-PH") : "—"}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn-view" title="View" onClick={() => openDetail(r)}>👁</button>
                        <button className="btn-print" title="Print Work Order" onClick={async () => {
                          const items = await fetchIRItems(r.id)
                          handlePrint(r, items)
                        }}>🖨️</button>
                        <button className="btn-print-rec" title="Print Product Record" onClick={async () => {
                          const items = await fetchIRItems(r.id)
                          handlePrintProductRecord(r, items)
                        }}>📋</button>
                        <button className="btn-edit-sm" onClick={() => openEdit(r)}>✏️</button>
                        <button className="btn-del-sm" onClick={() => confirmDelete(r)}>🗑</button>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
          {totalPages > 1 && (
            <div className="pagination-btns">
              <button
                className="pg-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >← Prev</button>

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`pg-btn${page === p ? " active" : ""}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                )
              )}

              <button
                className="pg-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
              <h3>{editId ? "✏️ Edit Ticket" : "➕ New Project Ticket"}</h3>
              <span className="esc-hint"><kbd className="esc-key">Esc</kbd> to close</span>
            </div>
            <div className="modal-sub">Fill in the project details below</div>

            <div className="ticket-preview">
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Ticket #</span>
              <span className="ticket-num">{nextTicket ?? "..."}</span>
              {editId && <span style={{ fontSize: 11, color: "#9ca3af" }}>(existing)</span>}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Prepared By *</label>
                <SearchSelect options={employeeOptions} value={form.prepared_by}
                  onChange={val => setForm(f => ({ ...f, prepared_by: val }))}
                  placeholder="Find employee..." error={errors.prepared_by} />
                {errors.prepared_by && <div className="error-msg">{errors.prepared_by}</div>}
              </div>
              <div className="form-group">
                <label>Assign Technician *</label>
                <SearchSelect options={employeeOptions} value={form.technician_id}
                  onChange={val => setForm(f => ({ ...f, technician_id: val }))}
                  placeholder="Find technician..." error={errors.technician_id} />
                {errors.technician_id && <div className="error-msg">{errors.technician_id}</div>}
              </div>

              <div className="form-group form-full">
                <label>Client *</label>
                <SearchSelect
                  options={clientOptions}
                  value={form.client_id}
                  onChange={val => {
                    const c = clients.find(c => String(c.id) === String(val))
                    setForm(f => ({
                      ...f,
                      client_id: val,
                      address: f.address || c?.address || "",
                    }))
                  }}
                  placeholder="Search client..."
                  error={errors.client_id}
                />
                {errors.client_id && <div className="error-msg">{errors.client_id}</div>}
                {form.client_id && (() => {
                  const c = clients.find(c => String(c.id) === String(form.client_id))
                  return c ? (
                    <div className="client-info-pill">
                      👤 {c.full_name}
                      {c.phone ? ` · 📞 ${c.phone}` : ""}
                      {c.category ? ` · ${c.category}` : ""}
                    </div>
                  ) : null
                })()}
              </div>

              <div className="form-group form-full">
                <label>Address / Location</label>
                <input className="form-input" placeholder="Installation site..."
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-input" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" className={`form-input${errors.end_date ? " err" : ""}`} value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                {errors.end_date && <div className="error-msg">{errors.end_date}</div>}
              </div>
              <div className="form-group form-full">
                <label>Remarks</label>
                <textarea className="form-input" placeholder="Additional notes..."
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>

            <div className="section-title">
              <span>📦 Products / Materials</span>
              <button
                type="button"
                className={`installer-toggle-btn${installerMode ? " on" : ""}`}
                onClick={toggleInstallerMode}
              >
                <span className="installer-toggle-track"><span className="installer-toggle-thumb" /></span>
                🔧 Installer Price
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>How would you like to add products?</div>
              <div className="source-toggle">
                <button className={`source-btn${quotationSource === "quotation" ? " active" : ""}`}
                  onClick={() => { setQuotationSource("quotation"); setLines([{ ...emptyLine }]) }}>
                  📋 From Quotation
                </button>
                <button className={`source-btn${quotationSource === "manual" ? " active" : ""}`}
                  onClick={() => { setQuotationSource("manual"); setForm(f => ({ ...f, quotation_id: "" })); setLines([{ ...emptyLine }]) }}>
                  ✏️ Manual Add
                </button>
              </div>
              {quotationSource === "quotation" && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Select Quotation</label>
                  <SearchSelect options={quotationOptions} value={form.quotation_id}
                    onChange={handleQuotationChange} placeholder="Search quotation DR#..." />
                  {form.quotation_id && (
                    <div style={{ fontSize: 11, color: "#15803d", marginTop: 4, fontWeight: 600 }}>✅ Products imported from quotation</div>
                  )}
                </div>
              )}
            </div>

            {(quotationSource === "manual" || (quotationSource === "quotation" && form.quotation_id)) && (
              <>
                <table className="lines-table">
                  <thead>
                    <tr>
                      <th style={{ width: "28%" }}>Product</th>
                      <th style={{ width: "18%" }}>Description</th>
                      <th style={{ width: "14%" }}>Serial No.</th>
                      <th style={{ width: "8%" }}>Qty</th>
                      <th style={{ width: "14%" }}>Unit Price (₱)</th>
                      <th style={{ width: "11%" }}>Subtotal</th>
                      <th style={{ width: "7%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          {quotationSource === "manual" ? (
                            <SearchSelect options={productOptions} value={line.item_id}
                              onChange={val => handleLineProductChange(idx, val)} placeholder="Search product..." />
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                              {products.find(p => String(p.id) === String(line.item_id))?.name || "—"}
                            </span>
                          )}
                        </td>
                        <td>
                          <input type="text" className="line-input" placeholder="Notes..."
                            value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} />
                        </td>
                        <td>
                          <input type="text" className="line-input" placeholder="S/N..."
                            value={line.serial_number} onChange={e => updateLine(idx, "serial_number", e.target.value)} />
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
                <button className="btn-add-line" onClick={addLine}>+ Add Another Item</button>
              </>
            )}

            <div className="labor-section">
              <div className="labor-title">🛠 Labor Charge</div>
              <div className="form-group">
                <label>Labor Charge (₱)</label>
                <input type="number" min="0" className="form-input" placeholder="0.00"
                  value={form.labor_charge}
                  onChange={e => setForm(f => ({ ...f, labor_charge: e.target.value }))}
                  style={{ background: "white" }} />
              </div>
            </div>

            <div className="discount-section">
              <div className="discount-title">
                🏷 Discount
                <span style={{ fontWeight: 400, color: "#6b7280", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional)</span>
              </div>
              <div className="form-group">
                <label>Discount (₱)</label>
                <input type="number" min="0" className="form-input" placeholder="0.00"
                  value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                  style={{ background: "white" }} />
              </div>
            </div>

            {/* DOWNPAYMENT (up to 3) */}
            <div className="downpayment-section">
              <div className="downpayment-title">
                💵 Downpayment
                <span style={{ fontWeight: 400, color: "#6b7280", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional, up to 3)</span>
              </div>

              {[1, 2, 3].slice(0, dpCount).map(n => {
                const amtKey = n === 1 ? "downpayment" : `downpayment_${n}`
                const dateKey = n === 1 ? "downpayment_date" : `downpayment_${n}_date`
                return (
                  <div key={n} className="dp-grid" style={{ marginBottom: n < dpCount ? 10 : 0 }}>
                    <div className="form-group">
                      <label>{dpCount > 1 ? `Downpayment #${n} ` : ""}Amount (₱)</label>
                      <input type="number" min="0" className="form-input" placeholder="0.00"
                        value={form[amtKey]}
                        onChange={e => setForm(f => ({ ...f, [amtKey]: e.target.value }))}
                        style={{ background: "white" }} />
                    </div>
                    <div className="form-group">
                      <label>Date Received</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" className="form-input"
                          value={form[dateKey]}
                          onChange={e => setForm(f => ({ ...f, [dateKey]: e.target.value }))}
                          style={{ background: "white", flex: 1 }} />
                        {n > 1 && (
                          <button type="button" className="btn-remove-line"
                            onClick={() => {
                              setForm(f => ({ ...f, [amtKey]: "", [dateKey]: "" }))
                              setDpCount(n - 1)
                            }}
                          >✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {dpCount < 3 && (
                <button type="button" className="btn-add-line" style={{ marginTop: 10 }}
                  onClick={() => setDpCount(c => Math.min(3, c + 1))}
                >+ Add Another Downpayment</button>
              )}
            </div>

            {(itemsTotal(lines) > 0 || Number(form.labor_charge) > 0) && (
              <div className="summary-box">
                {itemsTotal(lines) > 0 && (
                  <div className="summary-row subtotal">
                    <span>📦 Materials Subtotal</span>
                    <span>{fmt(itemsTotal(lines))}</span>
                  </div>
                )}
                {Number(form.labor_charge) > 0 && (
                  <div className="summary-row labor">
                    <span>🛠 Labor Charge</span>
                    <span>+ {fmt(form.labor_charge)}</span>
                  </div>
                )}
                {Number(form.discount) > 0 && (
                  <div className="summary-row discount">
                    <span>🏷 Discount</span>
                    <span>− {fmt(form.discount)}</span>
                  </div>
                )}
                {dpEntries.map(d => (
                  <div className="summary-row downpayment" key={d.n}>
                    <span>
                      💵 Downpayment{dpEntries.length > 1 ? ` #${d.n}` : ""}
                      {d.date && (
                        <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11 }}>
                          — {new Date(d.date + "T00:00:00").toLocaleDateString("en-PH")}
                        </span>
                      )}
                    </span>
                    <span>− {fmt(d.amt)}</span>
                  </div>
                ))}
                <div className="summary-row total">
                  <span>💰 Balance Due</span>
                  <span>{fmt(grandTotal(lines, form.labor_charge, form.discount, form.downpayment, form.downpayment_2, form.downpayment_3))}</span>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : `Create Ticket #${nextTicket ?? "..."}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetail && selected && (() => {
        const detailItemsTotal = selectedLines.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0)
        const detailLabor = Number(selected.labor_charge) || 0
        const detailDiscount = Number(selected.discount) || 0
        const detailDp1 = Number(selected.downpayment) || 0
        const detailDp2 = Number(selected.downpayment_2) || 0
        const detailDp3 = Number(selected.downpayment_3) || 0
        const detailDownpayment = detailDp1 + detailDp2 + detailDp3
        const detailTotal = detailItemsTotal + detailLabor - detailDiscount - detailDownpayment
        const detailDpEntries = [
          { n: 1, amt: detailDp1, date: selected.downpayment_date },
          { n: 2, amt: detailDp2, date: selected.downpayment_2_date },
          { n: 3, amt: detailDp3, date: selected.downpayment_3_date },
        ].filter(d => d.amt > 0)
        const ss = statusStyle(selected.status)
        const ts = typeStyle(selected.type)
        return (
          <div className="overlay">
            <div className="modal">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3>🔧 Ticket Details</h3>
                <span className="esc-hint"><kbd className="esc-key">Esc</kbd> to close</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <span className="ticket-chip">{selected.ticket_number}</span>
                <span className="type-chip" style={{ background: ts.bg, color: ts.color }}>{selected.type}</span>
                <span className="badge" style={{ background: ss.bg, color: ss.color }}>{selected.status}</span>
              </div>
              <div className="detail-section-title">Project Info</div>
              <div className="detail-row">
                <span className="detail-label">Client</span>
                <span className="detail-val">{getClientName(selected)}</span>
              </div>
              {selected.client?.phone && (
                <div className="detail-row">
                  <span className="detail-label">Client Phone</span>
                  <span className="detail-val">{selected.client.phone}</span>
                </div>
              )}
              {selected.client?.email && (
                <div className="detail-row">
                  <span className="detail-label">Client Email</span>
                  <span className="detail-val">{selected.client.email}</span>
                </div>
              )}
              <div className="detail-row"><span className="detail-label">Address</span><span className="detail-val">{selected.address || getClientAddress(selected)}</span></div>
              <div className="detail-row"><span className="detail-label">Prepared By</span><span className="detail-val">{selected.preparer?.full_name || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Technician</span><span className="detail-val">{selected.technician?.full_name || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">Start Date</span><span className="detail-val">{selected.start_date ? new Date(selected.start_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span></div>
              <div className="detail-row"><span className="detail-label">End Date</span><span className="detail-val">{selected.end_date ? new Date(selected.end_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span></div>
              {selected.quotations && (
                <div className="detail-row"><span className="detail-label">Quotation</span><span className="detail-val">DR# {selected.quotations.dr} — {selected.quotations.clients?.full_name}</span></div>
              )}
              {selected.remarks && (
                <div className="detail-row"><span className="detail-label">Remarks</span><span className="detail-val" style={{ maxWidth: "60%", textAlign: "right" }}>{selected.remarks}</span></div>
              )}
              <div className="detail-section-title">📦 Products / Materials</div>
              {selectedLines.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: "10px 0" }}>No items recorded.</div>
              ) : (
                <table className="items-detail-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Product</th><th>Description</th><th>Serial No.</th>
                      <th style={{ textAlign: "center" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Unit Price</th>
                      <th style={{ textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLines.map((item, i) => (
                      <tr key={item.id}>
                        <td style={{ color: "#9ca3af" }}>{i + 1}</td>
                        <td><strong>{item.products?.name || "—"}</strong></td>
                        <td style={{ color: "#6b7280", fontSize: 12 }}>{item.description || "—"}</td>
                        <td style={{ color: "#6b7280", fontSize: 12 }}>{item.serial_number || "—"}</td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{fmt(item.price)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                          {item.price && item.quantity ? fmt(item.price * item.quantity) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="detail-totals">
                {detailItemsTotal > 0 && (
                  <div className="detail-total-row"><span>📦 Materials Subtotal</span><span>{fmt(detailItemsTotal)}</span></div>
                )}
                {detailLabor > 0 && (
                  <div className="detail-total-row labor"><span>🛠 Labor Charge</span><span>+ {fmt(detailLabor)}</span></div>
                )}
                {detailDiscount > 0 && (
                  <div className="detail-total-row discount"><span>🏷 Discount</span><span>− {fmt(detailDiscount)}</span></div>
                )}
                {detailDpEntries.map(d => (
                  <div className="detail-total-row downpayment" key={d.n}>
                    <span>
                      💵 Downpayment{detailDpEntries.length > 1 ? ` #${d.n}` : ""}
                      {d.date && (
                        <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11 }}>
                          — {new Date(d.date).toLocaleDateString("en-PH")}
                        </span>
                      )}
                    </span>
                    <span>− {fmt(d.amt)}</span>
                  </div>
                ))}
                <div className="detail-total-row grand"><span>💰 BALANCE DUE</span><span>{fmt(detailTotal)}</span></div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowDetail(false)}>Close</button>
                <button
                  className="btn-print"
                  style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                  onClick={() => handlePrint(selected, selectedLines)}
                >🖨️ Work Order</button>
                <button
                  className="btn-print-rec"
                  style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                  onClick={() => handlePrintProductRecord(selected, selectedLines)}
                >📋 Product Record</button>
                <button className="btn-edit-sm" style={{ padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }} onClick={() => openEdit(selected)}>✏️ Edit</button>
                <button className="btn-confirm-del" onClick={() => confirmDelete(selected)}>🗑 Delete</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && deleteTarget && (
        <div className="overlay">
          <div className="confirm-modal">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>Delete Ticket?</h3>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 8px" }}>
              Deletes Ticket <strong>#{deleteTarget.ticket_number}</strong> for <strong>{getClientName(deleteTarget)}</strong> and all its items. Cannot be undone.
            </p>
            <p style={{ margin: "0 0 22px" }}>
              <span className="esc-hint" style={{ justifyContent: "center" }}>Press <kbd className="esc-key">Esc</kbd> to cancel</span>
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-confirm-del" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </DashboardLayout>
  )
}