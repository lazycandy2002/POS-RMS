import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../Layout/DashboardLayout"
import { supabase } from "../supabaseClient"
import { QuotationPrintTemplate } from "./QoutationPrintTemplate"
import { ProductRecordTemplate } from "./ProductRecordTemplate"

const STATUSES = ["Pending", "Approved", "Rejected", "Delivered", "Cancelled"]
const STATUS_ORDER = { Pending: 0, Approved: 1, Delivered: 2, Rejected: 3, Cancelled: 4 }
const PAGE_SIZE = 30

const emptyForm = {
  client_id: "", agent_id: "", remarks: "", status: "Pending",
  downpayment_amount: "", downpayment_date: "",
  downpayment_2_amount: "", downpayment_2_date: "",
  downpayment_3_amount: "", downpayment_3_date: "",
  labor_charge: "", discount: "", electrical_materials: ""
}

const emptyLine = { item_id: "", quantity: 1, price: "", serial_number: "", warranty: "" }

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
export default function Quotations() {
  const [quotations, setQuotations] = useState([])
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])

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
  const [installerMode, setInstallerMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nextDR, setNextDR] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedLines, setSelectedLines] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [dpCount, setDpCount] = useState(1)

  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchAll()
  }, [])

  // Reset page when search or filter changes
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
  const isGovClient = (clientId) => {
    const client = clients.find(c => String(c.id) === String(clientId))
    return client?.category?.toLowerCase().includes("gov") ?? false
  }

  const isInstallerClient = (clientId) => {
    const client = clients.find(c => String(c.id) === String(clientId))
    return client?.category?.toLowerCase().includes("installer") ?? false
  }

  const getProductPrice = (product, clientId, installerOverride = installerMode) => {
    if (!product) return ""
    if (installerOverride) {
      return product.price_installer ?? product.price_retail ?? product.price_gov ?? ""
    }
    const gov = isGovClient(clientId)
    return gov
      ? (product.price_gov ?? product.price_retail ?? "")
      : (product.price_retail ?? product.price_gov ?? "")
  }

  // ─── FETCH ───────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    const [qRes, cRes, eRes, pRes] = await Promise.all([
      supabase.from("quotations").select(`*, clients(id,full_name,category), employees(id,full_name)`).order("dr", { ascending: false }),
      supabase.from("clients").select("id,full_name,category").order("full_name"),
      supabase.from("employees").select("id,full_name").order("full_name"),
      supabase.from("products").select("*").order("name"),
    ])
    if (!qRes.error) setQuotations(qRes.data ?? [])
    if (!cRes.error) setClients(cRes.data ?? [])
    if (!eRes.error) setEmployees(eRes.data ?? [])
    if (!pRes.error) setProducts(pRes.data ?? [])
    setLoading(false)
  }

  const fetchQuotationItems = async (quotationId) => {
    const { data, error } = await supabase
      .from("quotation_items")
      .select("*, products(*)")
      .eq("quotation_id", quotationId)
      .order("id", { ascending: true }) 
    console.log("quotation_items:", data, "error:", error)
    return data ?? []
  }

  // ─── AUTO DR ─────────────────────────────────────────────────────────────
  const computeNextDR = async () => {
    const { data } = await supabase
      .from("quotations").select("dr").order("dr", { ascending: false }).limit(1)
    const last = data?.[0]?.dr ?? 0
    const next = Number(last) + 1
    setNextDR(next)
    return next
  }

  const printProductRecord = async (q, items) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100")
    const ReactDOMServer = await import("react-dom/server")
    const html = ReactDOMServer.renderToStaticMarkup(
      <ProductRecordTemplate quotation={q} lines={items} />
    )
    printWindow.document.write(`
    <!DOCTYPE html><html><head>
      <title>Product Record DR#${q.dr}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    </head><body style="margin:0;padding:0;">${html}</body></html>
  `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  // ─── PRINT ───────────────────────────────────────────────────────────────
  const printQuotation = async (q, items) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100")
    const ReactDOMServer = await import("react-dom/server")
    const html = ReactDOMServer.renderToStaticMarkup(
      <QuotationPrintTemplate quotation={q} lines={items} />
    )
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Quotation DR#${q.dr}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      </head><body style="margin:0;padding:0;">${html}</body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  // ─── SAVE AS IMAGE ────────────────────────────────────────────────────────
  const saveAsImage = async (q, items) => {
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
      <QuotationPrintTemplate quotation={q} lines={items} logoSrc={logoBase64} />
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

    const page = iframe.contentDocument.querySelector(".rms-page")
    if (!page) { document.body.removeChild(iframe); return }

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 900,
      windowHeight: page.scrollHeight,
    })

    document.body.removeChild(iframe)

    const link = document.createElement("a")
    link.download = `Quotation-DR${q.dr ?? "unknown"}.png`
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
    const autoPrice = getProductPrice(product, form.client_id)
    setLines(prev => prev.map((l, i) =>
      i === idx ? { ...l, item_id: productId, price: autoPrice, warranty: product?.warranty ?? "" } : l
    ))
  }

  const handleClientChange = (clientId) => {
    setForm(f => ({ ...f, client_id: clientId }))
    setLines(prev => prev.map(l => {
      if (!l.item_id) return l
      const product = products.find(p => String(p.id) === String(l.item_id))
      const newPrice = getProductPrice(product, clientId)
      return { ...l, price: newPrice !== "" ? newPrice : l.price }
    }))
  }

  const toggleInstallerMode = () => {
    setInstallerMode(prev => {
      const next = !prev
      setLines(prevLines => prevLines.map(l => {
        if (!l.item_id) return l
        const product = products.find(p => String(p.id) === String(l.item_id))
        const newPrice = getProductPrice(product, form.client_id, next)
        return { ...l, price: newPrice !== "" ? newPrice : l.price }
      }))
      return next
    })
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
    if (!form.client_id) e.client_id = "Client is required"
    if (!form.agent_id) e.agent_id = "Agent is required"
    const missingWarranty = lines.filter(l => l.item_id && !l.warranty)
    if (missingWarranty.length > 0) {
      e.warranty = `${missingWarranty.length} product(s) are missing warranty info. Update the product record first.`
    }
    return e
  }

  // ─── OPEN ADD ────────────────────────────────────────────────────────────
  const openAdd = async () => {
    setForm(emptyForm)
    setLines([{ ...emptyLine }])
    setInstallerMode(false)
    setEditId(null)
    setErrors({})
    setDpCount(1)
    await computeNextDR()
    setShowModal(true)
  }

  // ─── OPEN EDIT ───────────────────────────────────────────────────────────
  const openEdit = async (q) => {
    setForm({
      client_id: q.client_id ?? "",
      agent_id: q.agent_id ?? "",
      remarks: q.remarks ?? "",
      status: q.status ?? "Pending",
      downpayment_amount: q.downpayment_amount ?? "",
      downpayment_date: q.downpayment_date ? q.downpayment_date.split("T")[0] : "",
      downpayment_2_amount: q.downpayment_2_amount ?? "",
      downpayment_2_date: q.downpayment_2_date ? q.downpayment_2_date.split("T")[0] : "",
      downpayment_3_amount: q.downpayment_3_amount ?? "",
      downpayment_3_date: q.downpayment_3_date ? q.downpayment_3_date.split("T")[0] : "",
      electrical_materials: q.electrical_materials ?? "",
      labor_charge: q.labor_charge ?? "",
      discount: q.discount ?? "",
    })
    setNextDR(q.dr)
    setEditId(q.id)
    setErrors({})
    setInstallerMode(isInstallerClient(q.client_id))
    const hasDp3 = q.downpayment_3_amount != null && q.downpayment_3_amount !== ""
    const hasDp2 = q.downpayment_2_amount != null && q.downpayment_2_amount !== ""
    setDpCount(hasDp3 ? 3 : hasDp2 ? 2 : 1)
    const items = await fetchQuotationItems(q.id)
    setLines(items.length > 0
      ? items.map(it => ({
        item_id: it.item_id ?? "",
        quantity: it.quantity ?? 1,
        price: it.price ?? "",
        serial_number: it.serial_number ?? "",
        warranty: it.products?.warranty ?? "",
      }))
      : [{ ...emptyLine }]
    )
    setShowModal(true)
    setShowDetail(false)
  }

  // ─── OPEN DETAIL ─────────────────────────────────────────────────────────
  const openDetail = async (q) => {
    setSelected(q)
    const items = await fetchQuotationItems(q.id)
    setSelectedLines(items)
    setShowDetail(true)
  }

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)

    try {
      let quotationId = editId

      const quotationPayload = {
        client_id: Number(form.client_id),
        agent_id: Number(form.agent_id),
        remarks: form.remarks || null,
        status: form.status,
        downpayment_amount: form.downpayment_amount !== "" ? Number(form.downpayment_amount) : null,
        downpayment_date: form.downpayment_date || null,
        downpayment_2_amount: form.downpayment_2_amount !== "" ? Number(form.downpayment_2_amount) : null,
        downpayment_2_date: form.downpayment_2_date || null,
        downpayment_3_amount: form.downpayment_3_amount !== "" ? Number(form.downpayment_3_amount) : null,
        downpayment_3_date: form.downpayment_3_date || null,
        electrical_materials: form.electrical_materials !== "" ? Number(form.electrical_materials) : null,
        labor_charge: form.labor_charge !== "" ? Number(form.labor_charge) : null,
        discount: form.discount !== "" ? Number(form.discount) : null,
      }

      if (editId) {
        const { error } = await supabase.from("quotations").update(quotationPayload).eq("id", editId)
        if (error) throw new Error("Update quotation failed: " + error.message)
        const { error: delErr } = await supabase.from("quotation_items").delete().eq("quotation_id", editId)
        if (delErr) throw new Error("Delete old items failed: " + delErr.message)
      } else {
        const dr = await computeNextDR()
        const { data, error } = await supabase.from("quotations").insert([{ ...quotationPayload, dr }]).select().single()
        if (error) throw new Error("Insert quotation failed: " + error.message)
        quotationId = data.id
      }

      const validLines = lines.filter(l => l.item_id && l.quantity && l.price !== "")
      if (validLines.length > 0) {
        const itemsPayload = validLines.map(l => ({
          quotation_id: quotationId,
          item_id: Number(l.item_id),
          quantity: Number(l.quantity),
          price: Number(l.price),
          serial_number: l.serial_number || null,
        }))
        const { error: itemsError } = await supabase.from("quotation_items").insert(itemsPayload).select()
        if (itemsError) throw new Error("Insert items failed: " + itemsError.message)
      }

      showToast(editId ? "Quotation updated." : `Quotation DR#${nextDR} created.`)
      setShowModal(false)
      fetchAll()
    } catch (err) {
      console.error("handleSave error:", err.message)
      showToast("Error: " + err.message, "error")
    }
    setSaving(false)
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  const confirmDelete = (q) => { setDeleteTarget(q); setShowDeleteConfirm(true); setShowDetail(false) }
  const handleDelete = async () => {
    await supabase.from("quotation_items").delete().eq("quotation_id", deleteTarget.id)
    const { error } = await supabase.from("quotations").delete().eq("id", deleteTarget.id)
    if (error) showToast("Failed to delete: " + error.message, "error")
    else { showToast("Quotation deleted."); fetchAll() }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // ─── STATUS STYLE ─────────────────────────────────────────────────────────
  const statusStyle = (s) => ({
    Pending: { bg: "#fef9c3", color: "#854d0e" },
    Approved: { bg: "#dcfce7", color: "#15803d" },
    Rejected: { bg: "#fee2e2", color: "#b91c1c" },
    Delivered: { bg: "#dbeafe", color: "#1d4ed8" },
    Cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  }[s] || { bg: "#f3f4f6", color: "#374151" })

  // ─── OPTIONS ─────────────────────────────────────────────────────────────
  const clientOptions = clients.map(c => ({
    value: c.id, label: c.full_name,
    sub: c.category
      ? (c.category.toLowerCase().includes("gov")
        ? "🏛 Government"
        : c.category.toLowerCase().includes("installer")
          ? "🔧 Installer"
          : "🏢 Private")
      : ""
  }))
  const agentOptions = employees.map(e => ({ value: e.id, label: e.full_name }))
  const productOptions = products.map(p => {
    const activePrice = getProductPrice(p, form.client_id)
    return {
      value: p.id, label: p.name,
      sub: activePrice !== "" && activePrice != null ? `₱${Number(activePrice).toLocaleString()}` : "",
      warranty: p.warranty ?? null,
    }
  })

  // ─── FILTERED + PAGINATED ────────────────────────────────────────────────
  const filtered = quotations
    .filter(q => {
      const s = search.toLowerCase()
      const match = !s || [q.clients?.full_name, q.employees?.full_name, String(q.dr ?? "")]
        .some(f => f?.toLowerCase().includes(s))
      const matchStatus = filterStatus === "all" || q.status === filterStatus
      return match && matchStatus
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summaryStats = {
    total: quotations.length,
    pending: quotations.filter(q => q.status === "Pending").length,
    approved: quotations.filter(q => q.status === "Approved").length,
    delivered: quotations.filter(q => q.status === "Delivered").length,
  }

  // ─── COMPUTED TOTALS (modal) ──────────────────────────────────────────────
  const activeClientIsGov = isGovClient(form.client_id)
  const activePriceLabel = installerMode
    ? "🔧 Installer Price"
    : (form.client_id ? (activeClientIsGov ? "🏛 Government Price" : "🏢 Retail Price") : null)
  const currentGrandTotal = grandTotal(lines)
  const electricalAmt = Number(form.electrical_materials) || 0
  const laborAmt = Number(form.labor_charge) || 0
  const discountAmt = Number(form.discount) || 0
  const totalWithLabor = currentGrandTotal + electricalAmt + laborAmt
  const totalAfterDiscount = totalWithLabor - discountAmt
  const dp1Amt = Number(form.downpayment_amount) || 0
  const dp2Amt = Number(form.downpayment_2_amount) || 0
  const dp3Amt = Number(form.downpayment_3_amount) || 0
  const downpaymentAmt = dp1Amt + dp2Amt + dp3Amt
  const balance = totalAfterDiscount - downpaymentAmt
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
        .table-scroll::-webkit-scrollbar-thumb:hover{background:#d1d5db}
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
        .pg-btn.active:hover{background:#b30000}
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
        .price-mode-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700}
        .price-mode-gov{background:#dbeafe;color:#1d4ed8}
        .price-mode-retail{background:#fef3c7;color:#92400e}
        .price-mode-installer{background:#ede9fe;color:#6d28d9}
        .installer-toggle-btn{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:20px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;text-transform:none;letter-spacing:normal}
        .installer-toggle-btn:hover{background:#f3f4f6}
        .installer-toggle-btn.on{background:#ede9fe;border-color:#c4b5fd;color:#6d28d9}
        .installer-toggle-track{width:30px;height:16px;border-radius:20px;background:#d1d5db;position:relative;transition:background 0.15s;flex-shrink:0}
        .installer-toggle-btn.on .installer-toggle-track{background:#7c3aed}
        .installer-toggle-thumb{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:white;transition:transform 0.15s}
        .installer-toggle-btn.on .installer-toggle-thumb{transform:translateX(14px)}
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
        .lines-table th{background:#f9fafb;padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid #e5e7eb;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lines-table td{padding:6px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle;overflow:hidden}
        .lines-table tr:last-child td{border-bottom:none}
        .line-input{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none;font-family:Segoe UI;background:#f9fafb;box-sizing:border-box}
        .line-input:focus{border-color:#b30000;box-shadow:0 0 0 2px rgba(179,0,0,0.12);background:white}
        .line-total{font-size:13px;font-weight:700;color:#15803d;text-align:right;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .btn-remove-line{padding:5px 8px;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;color:#b91c1c;font-size:14px;line-height:1}
        .btn-remove-line:hover{background:#fecaca}
        .btn-remove-line:disabled{opacity:0.3;cursor:not-allowed}
        .btn-add-line{padding:7px 14px;background:#f0fdf4;border:1px dashed #86efac;border-radius:8px;color:#15803d;font-size:13px;font-weight:600;cursor:pointer;width:100%;margin-top:4px}
        .btn-add-line:hover{background:#dcfce7}
        .warranty-ok{display:inline-block;max-width:100%;font-size:11px;background:#f0fdf4;color:#15803d;padding:3px 8px;border-radius:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;box-sizing:border-box}
        .warranty-missing{display:inline-block;max-width:100%;font-size:11px;background:#fef2f2;color:#b91c1c;padding:3px 8px;border-radius:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;box-sizing:border-box}
        .warranty-empty{font-size:12px;color:#d1d5db}
        .warranty-error-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:#b91c1c;font-weight:600}
        .dp-section{background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-top:14px}
        .dp-section-title{font-size:11px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
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
        .summary-row.total{background:#f9fafb;font-weight:600;color:#374151}
        .summary-row.dp{background:#fefce8;color:#854d0e;font-weight:600}
        .summary-row.balance{background:#f0fdf4;color:#15803d;font-weight:700;font-size:14px}
        .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;align-items:center}
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
        .detail-total-row.dp{background:#fefce8;color:#854d0e;font-weight:600}
        .detail-total-row.balance{background:#f0fdf4;color:#15803d;font-weight:700;font-size:14px}
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
        <h2>🧾 Quotations</h2>
        <div className="q-controls">
          <input className="q-search" placeholder="🔍 Search client, agent, DR#..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="q-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-add" onClick={openAdd}>+ Add Quotation</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        {[
          { icon: "🧾", label: "Total", value: summaryStats.total, color: "#111827" },
          { icon: "⏳", label: "Pending", value: summaryStats.pending, color: "#854d0e" },
          { icon: "✅", label: "Approved", value: summaryStats.approved, color: "#15803d" },
          { icon: "🚚", label: "Delivered", value: summaryStats.delivered, color: "#1d4ed8" },
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
                <th>#</th><th>DR #</th><th>Client</th><th>Agent</th><th>Status</th><th>Date</th><th>Actions</th>
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
                <tr className="empty-row"><td colSpan={7}>No quotations found.</td></tr>
              ) : paginated.map((q, i) => {
                const ss = statusStyle(q.status)
                return (
                  <tr key={q.id} onClick={() => openDetail(q)}>
                    <td style={{ color: "#9ca3af" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className="dr-chip">{q.dr ?? "—"}</span></td>
                    <td>
                      <strong>{q.clients?.full_name || "—"}</strong>
                      {q.clients?.category && (
                        <span style={{
                          marginLeft: 6, fontSize: 10, fontWeight: 600,
                          color: q.clients.category.toLowerCase().includes("gov")
                            ? "#1d4ed8"
                            : q.clients.category.toLowerCase().includes("installer")
                              ? "#6d28d9"
                              : "#92400e",
                          background: q.clients.category.toLowerCase().includes("gov")
                            ? "#dbeafe"
                            : q.clients.category.toLowerCase().includes("installer")
                              ? "#ede9fe"
                              : "#fef3c7",
                          padding: "1px 6px", borderRadius: 10
                        }}>
                          {q.clients.category.toLowerCase().includes("gov")
                            ? "GOV"
                            : q.clients.category.toLowerCase().includes("installer")
                              ? "INSTALLER"
                              : "PRIVATE"}
                        </span>
                      )}
                      {q.remarks && (
                        <div style={{
                          marginTop: 3, fontSize: 11, color: "#9ca3af", fontWeight: 400,
                          maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                        }} title={q.remarks}>
                          ✓ {q.remarks}
                        </div>
                      )}
                    </td>
                    <td>{q.employees?.full_name || "—"}</td>
                    <td><span className="badge" style={{ background: ss.bg, color: ss.color }}>{q.status}</span></td>
                    <td style={{ color: "#6b7280", fontSize: 12 }}>{new Date(q.created_at).toLocaleDateString("en-PH")}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn-view" onClick={() => openDetail(q)}>👁</button>
                        <button className="btn-edit-sm" onClick={() => openEdit(q)}>✏️</button>
                        <button className="btn-del-sm" onClick={() => confirmDelete(q)}>🗑</button>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} quotation{filtered.length !== 1 ? "s" : ""}
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

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="overlay">
          <div className="modal">
            <h3>{editId ? "✏️ Edit Quotation" : "➕ New Quotation"}</h3>
            <div className="modal-sub">Fill in the details below</div>

            {/* DR + PRICE MODE ROW */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {editId ? (
                <div className="dr-edit-label">
                  <span className="dr-preview-label">DR #</span>
                  <span className="dr-edit-num">{nextDR}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>(cannot be changed)</span>
                </div>
              ) : (
                <div className="dr-preview">
                  <span className="dr-preview-label">Auto DR #</span>
                  <span className="dr-preview-num">{nextDR ?? "..."}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>assigned on save</span>
                </div>
              )}
              {activePriceLabel && (
                <span className={`price-mode-badge ${installerMode ? "price-mode-installer" : activeClientIsGov ? "price-mode-gov" : "price-mode-retail"}`}>
                  {activePriceLabel}
                </span>
              )}
            </div>

            {/* HEADER FIELDS */}
            <div className="form-grid">
              <div className="form-group">
                <label>Client *</label>
                <SearchSelect options={clientOptions} value={form.client_id} onChange={handleClientChange}
                  placeholder="Search client..." error={errors.client_id} />
                {errors.client_id && <div className="error-msg">{errors.client_id}</div>}
              </div>
              <div className="form-group">
                <label>Prepared By *</label>
                <SearchSelect options={agentOptions} value={form.agent_id}
                  onChange={val => setForm(f => ({ ...f, agent_id: val }))}
                  placeholder="Search agent..." error={errors.agent_id} />
                {errors.agent_id && <div className="error-msg">{errors.agent_id}</div>}
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
            <div className="section-title">
              <span>
                📦 Line Items
                {activePriceLabel && (
                  <span style={{ marginLeft: 8, fontWeight: 500, color: installerMode ? "#6d28d9" : activeClientIsGov ? "#1d4ed8" : "#92400e", textTransform: "none", fontSize: 11 }}>
                    — using {activePriceLabel}
                  </span>
                )}
              </span>
              <button
                type="button"
                className={`installer-toggle-btn${installerMode ? " on" : ""}`}
                onClick={toggleInstallerMode}
              >
                <span className="installer-toggle-track"><span className="installer-toggle-thumb" /></span>
                🔧 Installer Price
              </button>
            </div>

            <table className="lines-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Product</th>
                  <th style={{ width: "15%" }}>Serial No.</th>
                  <th style={{ width: "8%" }}>Qty</th>
                  <th style={{ width: "14%" }}>Unit Price (₱)</th>
                  <th style={{ width: "15%" }}>Warranty *</th>
                  <th style={{ width: "13%" }}>Subtotal</th>
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
                      <input type="text" className="line-input" placeholder="S/N..."
                        value={line.serial_number}
                        onChange={e => updateLine(idx, "serial_number", e.target.value)} />
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
                      {line.item_id ? (
                        line.warranty
                          ? <span className="warranty-ok" title={line.warranty}>🛡 {line.warranty}</span>
                          : <span className="warranty-missing">⚠ No warranty</span>
                      ) : (
                        <span className="warranty-empty">—</span>
                      )}
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

            {errors.warranty && (
              <div className="warranty-error-box">⚠️ {errors.warranty}</div>
            )}

            <button className="btn-add-line" onClick={addLine}>+ Add Another Item</button>

            {/* ELECTRICAL MATERIALS */}
            <div className="labor-section" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
              <div className="labor-section-title" style={{ color: "#c2410c" }}>
                ⚡ Electrical Materials
                <span style={{ fontWeight: 400, color: "#fb923c", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional)</span>
              </div>
              <div className="form-group">
                <label>Amount (₱)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={form.electrical_materials}
                  onChange={e => setForm(f => ({ ...f, electrical_materials: e.target.value }))}
                  style={{ background: "white" }}
                />
              </div>
            </div>

            {/* LABOR CHARGE */}
            <div className="labor-section">
              <div className="labor-section-title">
                🛠 Labor Charge
                <span style={{ fontWeight: 400, color: "#a78bfa", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional)</span>
              </div>
              <div className="form-group">
                <label>Amount (₱)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={form.labor_charge}
                  onChange={e => setForm(f => ({ ...f, labor_charge: e.target.value }))}
                  style={{ background: "white" }}
                />
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
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                  style={{ background: "white" }}
                />
              </div>
            </div>

            {/* DOWNPAYMENT (up to 3) */}
            <div className="dp-section">
              <div className="dp-section-title">
                💳 Downpayment
                <span style={{ fontWeight: 400, color: "#a16207", textTransform: "none", fontSize: 10, marginLeft: 6 }}>(optional, up to 3)</span>
              </div>

              {[1, 2, 3].slice(0, dpCount).map(n => {
                const amtKey = n === 1 ? "downpayment_amount" : `downpayment_${n}_amount`
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

            {/* SUMMARY */}
            {(currentGrandTotal > 0 || electricalAmt > 0 || laborAmt > 0) && (
              <div className="summary-box">
                {currentGrandTotal > 0 && (
                  <div className="summary-row subtotal">
                    <span>📦 Materials ({lines.filter(l => l.item_id).length} item{lines.filter(l => l.item_id).length !== 1 ? "s" : ""})</span>
                    <span>{fmt(currentGrandTotal)}</span>
                  </div>
                )}
                {electricalAmt > 0 && (
                  <div className="summary-row labor" style={{ background: "#fff7ed", color: "#c2410c" }}>
                    <span>⚡ Electrical Materials</span>
                    <span>+ {fmt(electricalAmt)}</span>
                  </div>
                )}
                {laborAmt > 0 && (
                  <div className="summary-row labor">
                    <span>🛠 Labor Charge</span>
                    <span>+ {fmt(laborAmt)}</span>
                  </div>
                )}
                {discountAmt > 0 && (
                  <div className="summary-row discount">
                    <span>🏷 Discount</span>
                    <span>− {fmt(discountAmt)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>💰 Grand Total</span>
                  <span>{fmt(totalAfterDiscount)}</span>
                </div>
                {dpEntries.map(d => (
                  <div className="summary-row dp" key={d.n}>
                    <span>
                      💳 Downpayment{dpEntries.length > 1 ? ` #${d.n}` : ""}
                      {d.date && (
                        <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11 }}>
                          — {new Date(d.date + "T00:00:00").toLocaleDateString("en-PH")}
                        </span>
                      )}
                    </span>
                    <span>− {fmt(d.amt)}</span>
                  </div>
                ))}
                {downpaymentAmt > 0 && (
                  <div className="summary-row balance">
                    <span>🏦 Balance Due</span>
                    <span>{fmt(balance)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : `Create DR #${nextDR ?? "..."}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────────── */}
      {showDetail && selected && (() => {
        const detailGT = selectedLines.reduce((sum, it) => sum + (it.price * it.quantity || 0), 0)
        const detailElectrical = Number(selected.electrical_materials) || 0
        const detailLabor = Number(selected.labor_charge) || 0
        const detailDiscount = Number(selected.discount) || 0
        const detailGrandTotal = detailGT + detailElectrical + detailLabor - detailDiscount
        const detailDp1 = Number(selected.downpayment_amount) || 0
        const detailDp2 = Number(selected.downpayment_2_amount) || 0
        const detailDp3 = Number(selected.downpayment_3_amount) || 0
        const detailDP = detailDp1 + detailDp2 + detailDp3
        const detailBalance = detailGrandTotal - detailDP
        const detailDpEntries = [
          { n: 1, amt: detailDp1, date: selected.downpayment_date },
          { n: 2, amt: detailDp2, date: selected.downpayment_2_date },
          { n: 3, amt: detailDp3, date: selected.downpayment_3_date },
        ].filter(d => d.amt > 0)
        return (
          <div className="overlay">
            <div className="modal">
              <h3>🧾 Quotation Details</h3>

              <div className="detail-section-title">Parties</div>
              <div className="detail-row">
                <span className="detail-label">Client</span>
                <span className="detail-val">
                  {selected.clients?.full_name || "—"}
                  {selected.clients?.category && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 600,
                      color: selected.clients.category.toLowerCase().includes("gov")
                        ? "#1d4ed8"
                        : selected.clients.category.toLowerCase().includes("installer")
                          ? "#6d28d9"
                          : "#92400e",
                      background: selected.clients.category.toLowerCase().includes("gov")
                        ? "#dbeafe"
                        : selected.clients.category.toLowerCase().includes("installer")
                          ? "#ede9fe"
                          : "#fef3c7",
                      padding: "1px 6px", borderRadius: 10
                    }}>
                      {selected.clients.category.toLowerCase().includes("gov")
                        ? "GOV"
                        : selected.clients.category.toLowerCase().includes("installer")
                          ? "INSTALLER"
                          : "PRIVATE"}
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-row"><span className="detail-label">Agent</span><span className="detail-val">{selected.employees?.full_name || "—"}</span></div>

              <div className="detail-section-title">Info</div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-val">{(() => { const ss = statusStyle(selected.status); return <span className="badge" style={{ background: ss.bg, color: ss.color }}>{selected.status}</span> })()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DR #</span>
                <span className="detail-val"><span className="dr-chip">{selected.dr ?? "—"}</span></span>
              </div>
              <div className="detail-row"><span className="detail-label">Remarks</span><span className="detail-val">{selected.remarks || "—"}</span></div>
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-val">{new Date(selected.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>

              <div className="detail-section-title">📦 Items</div>
              {selectedLines.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: "10px 0" }}>No items recorded.</div>
              ) : (
                <>
                  <table className="items-detail-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Serial No.</th>
                        <th>Warranty</th>
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
                          <td style={{ color: "#6b7280", fontSize: 12 }}>{item.serial_number || "—"}</td>
                          <td>
                            {item.products?.warranty
                              ? <span className="warranty-ok" title={item.products.warranty}>🛡 {item.products.warranty}</span>
                              : <span className="warranty-missing">⚠ None</span>
                            }
                          </td>
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
                    {detailGT > 0 && (
                      <div className="detail-total-row">
                        <span>📦 Materials</span>
                        <span>{fmt(detailGT)}</span>
                      </div>
                    )}
                    {detailElectrical > 0 && (
                      <div className="detail-total-row" style={{ background: "#fff7ed", color: "#c2410c", fontWeight: 600 }}>
                        <span>⚡ Electrical Materials</span>
                        <span>+ {fmt(detailElectrical)}</span>
                      </div>
                    )}
                    {detailLabor > 0 && (
                      <div className="detail-total-row labor">
                        <span>🛠 Labor Charge</span>
                        <span>+ {fmt(detailLabor)}</span>
                      </div>
                    )}
                    {detailDiscount > 0 && (
                      <div className="detail-total-row discount">
                        <span>🏷 Discount</span>
                        <span>− {fmt(detailDiscount)}</span>
                      </div>
                    )}
                    <div className="detail-total-row grand">
                      <span>💰 Grand Total</span>
                      <span>{fmt(detailGrandTotal)}</span>
                    </div>
                    {detailDpEntries.map(d => (
                      <div className="detail-total-row dp" key={d.n}>
                        <span>
                          💳 Downpayment{detailDpEntries.length > 1 ? ` #${d.n}` : ""}
                          {d.date && (
                            <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11 }}>
                              — {new Date(d.date).toLocaleDateString("en-PH")}
                            </span>
                          )}
                        </span>
                        <span>− {fmt(d.amt)}</span>
                      </div>
                    ))}
                    {detailDP > 0 && (
                      <div className="detail-total-row balance">
                        <span>🏦 Balance Due</span>
                        <span>{fmt(detailBalance)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="modal-footer">
                <span className="esc-hint"><span className="esc-key">Esc</span> to close</span>
                <button className="btn-cancel" onClick={() => setShowDetail(false)}>Close</button>
                <button className="btn-print" onClick={() => printQuotation(selected, selectedLines)}>🖨️ Quotation</button>
                <button
                  className="btn-print"
                  style={{ background: "#047857" }}
                  onClick={() => saveAsImage(selected, selectedLines)}
                >
                  Save as PNG
                </button>
                <button className="btn-print" style={{ background: "#1d4ed8" }} onClick={() => printProductRecord(selected, selectedLines)}>📋 Product Record</button>
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
            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>Delete Quotation?</h3>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 22px" }}>
              Deletes DR <strong>#{deleteTarget.dr}</strong> for <strong>{deleteTarget.clients?.full_name}</strong> and all its line items. Cannot be undone.
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