import rmsSig from "../assets/images/rmssig.png"

// ─── PURCHASE ORDER PRINT TEMPLATE ────────────────────────────────────────────
// A4 format: 210mm × 297mm

export function PurchaseOrderPrintTemplate({ order, lines, logoSrc = "", sigSrc = "" }) {
  const fmt = (n) =>
    n != null
      ? `\u20b1${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "\u2014"

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
      : "\u2014"

  const subtotal = lines.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity) || 0), 0)
  const shipping = Number(order?.shipping_fee) || 0
  const discount = Number(order?.discount) || 0
  const grandTotal = subtotal + shipping - discount

  // One item per line: Attn / Contact No. / Email (also converts old "a • b • c" format)
  const formatContact = (raw) => {
    if (!raw) return ""
    return String(raw)
      .split(/\n|•/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        if (/^(attn|contact no\.?|email)\s*:/i.test(p)) return p
        if (p.includes("@")) return `Email: ${p}`
        if (/^[+\d][\d\s\-+()]{6,}$/.test(p)) return `Contact No.: ${p}`
        return `Attn: ${p}`
      })
      .join("\n")
  }

  // E-signature only prints once the PO is approved (Ordered, or later Received)
  const showSignature = ["Ordered", "Received"].includes(order?.status)

  const orderDate = fmtDate(order?.order_date || order?.created_at)
  const expectedDate = fmtDate(order?.expected_date)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rms-print-wrapper {
          background: #d1d5db;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 32px 16px;
        }

        .rms-page {
          font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
          background: #ffffff;
          color: #000000;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 15mm;
          margin: 0 auto;
          font-size: 10pt;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 40px rgba(0, 0, 0, 0.22);
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
          .rms-print-wrapper { background: #ffffff !important; padding: 0 !important; min-height: unset; }
          .rms-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }

        .q-letterhead {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 8pt; border-bottom: 2px solid #000000; margin-bottom: 5pt;
        }
        .q-logo-area { display: flex; align-items: center; gap: 10pt; }
        .q-logo-img { width: 64pt; height: 64pt; object-fit: contain; display: block; flex-shrink: 0; }
        .q-company-name { font-size: 10pt; font-weight: 800; letter-spacing: 0.5pt; line-height: 1.1; }
        .q-company-address { font-size: 7pt; color: #333333; margin-top: 2pt; line-height: 1.6; }
        .q-company-contact { text-align: right; font-size: 7pt; color: #333333; line-height: 1.7; }

        .q-title-row { text-align: center; margin: 12pt 0 10pt; }
        .q-title {
          font-size: 17pt; font-weight: 900; text-decoration: underline;
          text-transform: uppercase; letter-spacing: 4pt;
        }

        .rms-meta-row { display: flex; justify-content: space-between; align-items: stretch; gap: 12pt; margin-bottom: 12pt; }
        .rms-left-box-wrap { flex: 1; display: flex; flex-direction: column; gap: 6pt; justify-content: center; }
        .left-field-label {
          font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5pt; color: #555555; margin-bottom: 1pt;
        }
        .left-field-value { font-size: 9pt; font-weight: 600; line-height: 1.4; }
        .left-field-value.vendor-val { font-weight: 800; font-size: 10pt; }
        .left-field-value.small-val { font-weight: 400; font-size: 8pt; color: #333333; white-space: pre-line; }

        .rms-meta-box-wrap { width: 185pt; flex-shrink: 0; }
        .rms-meta-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
        .rms-meta-table td { padding: 4pt 8pt; border-bottom: 1px solid #e0e0e0; }
        .rms-meta-table tr:last-child td { border-bottom: none; }
        .meta-key {
          font-weight: 700; text-transform: uppercase; font-size: 7pt;
          background-color: #f8f8f8 !important;
          -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          white-space: nowrap; width: 60pt;
        }
        .meta-val { font-weight: 600; }

        .q-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .q-table thead tr { border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; }
        .q-table thead th {
          padding: 5pt 6pt; text-align: left; font-weight: 700; font-size: 7.5pt;
          text-decoration: underline; border-right: 1px solid #cccccc;
        }
        .q-table thead th:last-child { border-right: none; }
        .q-table thead th.center { text-align: center; }
        .q-table thead th.right { text-align: right; }
        .q-table tbody tr { border-bottom: 1px solid #e0e0e0; }
        .q-table tbody tr:last-child { border-bottom: 1.5px solid #000000; }
        .q-table tbody td { padding: 4.5pt 6pt; vertical-align: top; border-right: 1px solid #eeeeee; }
        .q-table tbody td:last-child { border-right: none; }
        .q-table tbody td.center { text-align: center; vertical-align: middle; }
        .q-table tbody td.right { text-align: right; vertical-align: middle; }
        .q-table tbody tr.filler td { height: 18pt; color: transparent; border-bottom: 1px solid #eeeeee; }

        .item-num { color: #999999; font-size: 7.5pt; text-align: center; vertical-align: middle !important; }
        .item-code { font-weight: 600; font-size: 7.5pt; vertical-align: middle !important; }
        .item-name { font-weight: 600; font-size: 8.5pt; line-height: 1.3; }
        .item-desc { font-size: 7pt; color: #555555; margin-top: 1.5pt; line-height: 1.4; white-space: pre-line; }

        .q-totals-wrap { display: flex; justify-content: flex-end; border-bottom: 1.5px solid #000000; margin-bottom: 12pt; }
        .q-totals-table { width: 185pt; border-collapse: collapse; font-size: 8.5pt; table-layout: fixed; }
        .q-totals-table td { padding: 4pt 6pt; border-top: 1px solid #e0e0e0; }
        .q-totals-table tr.grand td { font-weight: 800; font-size: 10pt; border-top: 1.5px solid #000000; }
        .q-totals-table td.right { text-align: right; width: 80pt; }
        .q-totals-table td.label { font-weight: 700; width: 105pt; }

        .q-validity-section { font-size: 8.5pt; line-height: 1.8; margin-bottom: 6pt; }

        .q-signatory { display: flex; justify-content: space-between; gap: 24pt; margin-top: auto; padding-top: 14pt; font-size: 8.5pt; }
        .q-sig-block { flex: 1; }
        .q-sig-line { border-bottom: 1px solid #000000; height: 40pt; margin-top: 6pt; position: relative; }
        .q-sig-sub { font-size: 7.5pt; color: #333333; margin-top: 2pt; }
      `}</style>

      <div className="rms-print-wrapper">
        <div className="rms-page" id="rms-po-print">

          {/* ── LETTERHEAD ── */}
          <div className="q-letterhead">
            <div className="q-logo-area">
              <img
                src={logoSrc || "/Logo2.png"}
                alt="RMS Logo"
                className="q-logo-img"
                onError={e => { e.target.style.display = "none" }}
              />
              <div>
                <div className="q-company-name">RMS Information Technology Solutions</div>
                <div className="q-company-address">
                  Aurora Bataan Highway, Digos City, Davao del Sur, Philippines 8002
                </div>
              </div>
            </div>
            <div className="q-company-contact">
              Telephone No. 0950 274 2565<br />
              rmsitsolutions08@gmail.com
            </div>
          </div>

          {/* ── TITLE ── */}
          <div className="q-title-row">
            <span className="q-title">Purchase Order</span>
          </div>

          {/* ── META ROW ── */}
          <div className="rms-meta-row">
            <div className="rms-left-box-wrap">
              <div>
                <div className="left-field-label">Vendor / Supplier</div>
                <div className="left-field-value vendor-val">
                  {order?.supplier_name || "[Supplier Name]"}
                </div>
                {order?.supplier_address && (
                  <div className="left-field-value small-val">{order.supplier_address}</div>
                )}
                {order?.supplier_contact && (
                  <div className="left-field-value small-val">{formatContact(order.supplier_contact)}</div>
                )}
              </div>
              <div>
                <div className="left-field-label">Ship To</div>
                <div className="left-field-value small-val">
                  RMS Information Technology Solutions{"\n"}
                  Aurora Bataan Highway, Digos City, Davao del Sur
                </div>
              </div>
              <div>
                <div className="left-field-label">Remarks</div>
                <div className="left-field-value small-val">{order?.remarks || "\u2014"}</div>
              </div>
            </div>

            <div className="rms-meta-box-wrap">
              <table className="rms-meta-table">
                <tbody>
                  <tr>
                    <td className="meta-key">PO No.</td>
                    <td className="meta-val" style={{ fontFamily: "monospace", fontSize: "9pt", fontWeight: 800 }}>
                      {order?.po_number ? `PO-${String(order.po_number).padStart(6, "0")}` : "\u2014"}
                    </td>
                  </tr>
                  <tr>
                    <td className="meta-key">Order Date</td>
                    <td className="meta-val">{orderDate}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">Deliver By</td>
                    <td className="meta-val">{expectedDate}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">Terms</td>
                    <td className="meta-val">{order?.payment_terms || "\u2014"}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">Prepared By</td>
                    <td className="meta-val">{order?.employees?.full_name || "\u2014"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── LINE ITEMS TABLE ── */}
          <table className="q-table">
            <thead>
              <tr>
                <th style={{ width: "36pt", textAlign: "center" }}>Item No.</th>
                <th style={{ width: "44pt" }}>Code</th>
                <th>Description</th>
                <th className="center" style={{ width: "26pt" }}>Qty</th>
                <th className="center" style={{ width: "30pt" }}>U/M</th>
                <th className="right" style={{ width: "64pt" }}>Unit Cost</th>
                <th className="right" style={{ width: "64pt" }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <tr className="filler" key={`f-${i}`}>
                    <td> </td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td>
                  </tr>
                ))
              ) : (
                <>
                  {lines.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <td className="item-num">{String(i + 1).padStart(2, "0")}</td>
                      <td className="item-code">
                        {item.products?.keywords || item.products?.category || "\u2014"}
                      </td>
                      <td>
                        <div className="item-name">{item.products?.name || "\u2014"}</div>
                        {item.products?.description && (
                          <div className="item-desc">{item.products.description}</div>
                        )}
                      </td>
                      <td className="center">{item.quantity || "\u2014"}</td>
                      <td className="center" style={{ fontSize: "7.5pt", color: "#333333", fontWeight: 600 }}>
                        {item.products?.price_um || "\u2014"}
                      </td>
                      <td className="right">{item.price ? fmt(item.price) : "\u2014"}</td>
                      <td className="right" style={{ fontWeight: 700 }}>
                        {item.price && item.quantity ? fmt(Number(item.price) * Number(item.quantity)) : "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 2 - lines.length))].map((_, i) => (
                    <tr className="filler" key={`ef-${i}`}>
                      <td> </td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          {/* ── TOTALS ── */}
          <div className="q-totals-wrap">
            <table className="q-totals-table">
              <tbody>
                <tr>
                  <td className="label">Subtotal</td>
                  <td className="right">{fmt(subtotal)}</td>
                </tr>
                {shipping > 0 && (
                  <tr>
                    <td className="label">Shipping / Freight</td>
                    <td className="right">+ {fmt(shipping)}</td>
                  </tr>
                )}
                {discount > 0 && (
                  <tr>
                    <td className="label">Discount</td>
                    <td className="right">&minus; {fmt(discount)}</td>
                  </tr>
                )}
                <tr className="grand">
                  <td className="label">Total Amount</td>
                  <td className="right">{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── TERMS ── */}
          <div className="q-validity-section">
            <strong>Notes:</strong> Please confirm receipt of this purchase order. Kindly include this PO number on
            all delivery receipts and invoices. Goods are subject to inspection and acceptance upon delivery.
          </div>

          {/* ── SIGNATORIES ── */}
          <div className="q-signatory">
            <div className="q-sig-block">
              <div>Prepared by:</div>
              <div className="q-sig-line"></div>
              <div className="q-sig-sub">{order?.employees?.full_name || "Authorized Signature"}</div>
            </div>
            <div className="q-sig-block">
              <div>Approved by:</div>
              <div className="q-sig-line" style={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {showSignature && (
                  <img
                    src={sigSrc || rmsSig}
                    alt=""
                    style={{
                      position: "absolute", left: "50%", bottom: "9pt",
                      transform: "translateX(-50%)", height: "34pt",
                      objectFit: "contain", pointerEvents: "none"
                    }}
                    onError={e => { e.target.style.display = "none" }}
                  />
                )}
                <span style={{ position: "relative", fontWeight: 800, fontSize: "8.5pt", paddingBottom: "2pt", letterSpacing: "0.3pt" }}>
                  ROSEMARIE M. SUIZO
                </span>
              </div>
              <div className="q-sig-sub" style={{ textAlign: "center" }}>Authorized Signature</div>
            </div>
            <div className="q-sig-block">
              <div>Supplier's Conforme:</div>
              <div className="q-sig-line"></div>
              <div className="q-sig-sub">Signature over Printed Name / Date</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}