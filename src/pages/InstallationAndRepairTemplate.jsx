// ─── INSTALLATION & REPAIR PRINT TEMPLATE ─────────────────────────────────────
// A4 format: 210mm × 297mm — Service Work Order / Field Ticket

export function InstallationAndRepairTemplate({ record, lines }) {
  const dateFormatted = record?.created_at
    ? new Date(record.created_at).toLocaleDateString("en-PH", {
      year: "numeric", month: "long", day: "numeric"
    })
    : "\u2014"

  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
      year: "numeric", month: "long", day: "numeric"
    }) : "\u2014"

  const fmt = (n) =>
    n != null && n !== ""
      ? `\u20B1${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "\u2014"

  const matTotal = (lines ?? []).reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0)
  const laborCharge = Number(record?.labor_charge) || 0
  const discount = Number(record?.discount) || 0
  const dp1 = Number(record?.downpayment) || 0
  const dp2 = Number(record?.downpayment_2) || 0
  const dp3 = Number(record?.downpayment_3) || 0
  const downpayment = dp1 + dp2 + dp3
  const grandTotal = matTotal + laborCharge - discount - downpayment
  const dpEntries = [
    { n: 1, amt: dp1, date: record?.downpayment_date },
    { n: 2, amt: dp2, date: record?.downpayment_2_date },
    { n: 3, amt: dp3, date: record?.downpayment_3_date },
  ].filter(d => d.amt > 0)

  const typeBadge = {
    "Installation": { bg: "#111827", color: "#ffffff" },
    "Repair": { bg: "#fef2f2", color: "#b91c1c" },
    "Maintenance": { bg: "#f0fdf4", color: "#15803d" },
    "Inspection": { bg: "#f5f3ff", color: "#6d28d9" },
  }[record?.type] ?? { bg: "#f3f4f6", color: "#374151" }

  const statusBadge = {
    "Open": { bg: "#dbeafe", color: "#1d4ed8" },
    "In Progress": { bg: "#fef9c3", color: "#854d0e" },
    "Completed": { bg: "#dcfce7", color: "#15803d" },
    "Cancelled": { bg: "#f3f4f6", color: "#6b7280" },
    "On Hold": { bg: "#fce7f3", color: "#9d174d" },
  }[record?.status] ?? { bg: "#f3f4f6", color: "#374151" }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .ir-print-wrapper {
          background: #d1d5db;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 32px 16px 8px 16px;
        }

        .ir-page {
          font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
          background: #ffffff;
          color: #000000;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 15mm 4mm 15mm;
          margin: 0 auto;
          font-size: 10pt;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 40px rgba(0, 0, 0, 0.22);
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
          .ir-print-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: unset;
          }
          .ir-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 15mm 4mm 15mm !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .ir-no-print { display: none !important; }
        }

        /* ── LETTERHEAD ── */
        .ir-letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8pt;
          border-bottom: 2px solid #000000;
          margin-bottom: 5pt;
        }
        .ir-logo-area { display: flex; align-items: center; gap: 10pt; }
        .ir-logo-img { width: 44pt; height: 44pt; object-fit: contain; }
        .ir-company-name {
          font-size: 10pt; font-weight: 800; color: #000000;
          letter-spacing: 0.5pt; line-height: 1.1;
        }
        .ir-company-address { font-size: 7pt; color: #333333; margin-top: 2pt; line-height: 1.6; }
        .ir-company-contact { text-align: right; font-size: 7pt; color: #333333; line-height: 1.7; }

        /* ── TITLE ── */
        .ir-title-row { text-align: center; margin: 12pt 0 3pt; }
        .ir-title {
          font-size: 17pt; font-weight: 900; color: #000000;
          text-decoration: underline; text-transform: uppercase; letter-spacing: 4pt;
        }
        .ir-subtitle {
          text-align: center;
          font-size: 7pt;
          color: #555555;
          letter-spacing: 2pt;
          text-transform: uppercase;
          margin-bottom: 8pt;
        }

        /* ── TYPE BADGE ROW (ticket# removed, only type badge remains) ── */
        .ir-ticket-row {
          display: flex;
          align-items: center;
          gap: 8pt;
          margin-bottom: 10pt;
        }
        .ir-type-badge {
          display: inline-block; padding: 2.5pt 9pt; border-radius: 4pt;
          font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5pt;
          -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
        }
        .ir-status-badge {
          display: inline-block; padding: 2.5pt 9pt; border-radius: 20pt;
          font-size: 7.5pt; font-weight: 700;
          -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
        }

        /* ── META ROW ── */
        .ir-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 12pt;
          margin-bottom: 10pt;
        }
        .ir-left-box-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5pt;
          justify-content: center;
        }
        .ir-field-label {
          font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5pt; color: #555555; margin-bottom: 1pt;
        }
        .ir-field-value {
          font-size: 9pt; font-weight: 600; color: #000000; line-height: 1.4;
        }
        .ir-field-value.client-val { font-weight: 800; font-size: 10pt; }

        .ir-meta-box-wrap { width: 185pt; flex-shrink: 0; }
        .ir-meta-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
        .ir-meta-table td { padding: 4pt 8pt; border-bottom: 1px solid #e0e0e0; color: #000000; }
        .ir-meta-table tr:last-child td { border-bottom: none; }
        .ir-meta-key {
          font-weight: 700; text-transform: uppercase; font-size: 7pt; color: #000000;
          background-color: #f8f8f8 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          white-space: nowrap; width: 65pt;
        }
        .ir-meta-val { color: #000000; font-weight: 600; }
        .ir-ticket-val {
          font-family: monospace; font-size: 11pt; font-weight: 900;
          color: #000000; letter-spacing: 1pt;
        }

        /* ── MATERIALS TABLE ── */
        .ir-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .ir-table thead tr {
          border-top: 1.5px solid #000000;
          border-bottom: 1.5px solid #000000;
        }
        .ir-table thead th {
          padding: 5pt 6pt; text-align: left; font-weight: 700;
          font-size: 7.5pt; color: #000000; text-decoration: underline;
          border-right: 1px solid #cccccc;
        }
        .ir-table thead th:last-child { border-right: none; }
        .ir-table thead th.right { text-align: right; }
        .ir-table thead th.center { text-align: center; }

        .ir-table tbody tr { border-bottom: 1px solid #e0e0e0; }
        .ir-table tbody tr:last-child { border-bottom: 1.5px solid #000000; }
        .ir-table tbody td {
          padding: 4.5pt 6pt; color: #000000; vertical-align: middle;
          border-right: 1px solid #eeeeee;
        }
        .ir-table tbody td:last-child { border-right: none; }
        .ir-table tbody td.center { text-align: center; }
        .ir-table tbody td.right { text-align: right; }
        .ir-table tbody tr.filler td {
          height: 18pt; color: transparent; border-bottom: 1px solid #eeeeee;
        }

        .item-num { color: #999999; font-size: 7.5pt; text-align: center; }
        .item-name { font-weight: 400; color: #000000; font-size: 8pt; line-height: 1.3; }
        .item-serial {
          font-family: monospace; font-size: 8pt; font-weight: 400;
          color: #000000; letter-spacing: 0.5pt;
          word-break: break-word; white-space: normal;
        }

        /* ── TOTALS ── */
        .ir-totals-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 5pt;
          margin-bottom: 8pt;
        }
        .ir-totals-table { border-collapse: collapse; width: 210pt; font-size: 8.5pt; }
        .ir-totals-table td { padding: 4pt 8pt; border-bottom: 1px solid #e0e0e0; }
        .ir-totals-table tr:last-child td { border-bottom: none; }
        .ir-total-key {
          font-weight: 700; text-transform: uppercase; font-size: 7pt;
          color: #555555; white-space: nowrap;
        }
        .ir-total-val { text-align: right; font-weight: 700; color: #000000; font-family: monospace; }
        .ir-grand-row td {
          background-color: #111827 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #ffffff !important;
          font-size: 9.5pt !important;
          font-weight: 800 !important;
          padding: 5pt 8pt !important;
          border-bottom: none !important;
        }

        /* ── REMARKS ── */
.ir-remarks-box {
  background-color: #f8f8f8 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  border: 1px solid #e0e0e0;
  border-radius: 4pt;
  padding: 6pt 10pt;
  font-size: 8pt;
  color: #333333;
  line-height: 1.6;
  margin-top: 3pt;
  margin-bottom: 8pt;
  white-space: pre-line;
}
        .ir-section-label { font-weight: 700; font-size: 8.5pt; color: #000000; margin-bottom: 2pt; }
        .ir-notes-section { margin-bottom: 6pt; font-size: 8.5pt; }
        .ir-validity-section { font-size: 8.5pt; line-height: 1.8; color: #000000; margin-bottom: 1pt; }

        /* ── SIGNATORY ── */
        .ir-sig-line { width: 160pt; border-bottom: 1px solid #000000; height: 24pt; margin-top: 10pt; }
        .ir-sig-sub { font-size: 7.5pt; color: #333333; }
      `}</style>

      <div className="ir-print-wrapper">
        <div className="ir-page">

          {/* ── LETTERHEAD ── */}
          <div className="ir-letterhead">
            <div className="ir-logo-area">
              <img
                src="/Logo2.png"
                alt="RMS Logo"
                className="ir-logo-img"
                onError={e => { e.target.style.display = "none" }}
              />
              <div>
                <div className="q-company-name">RMS Information Technology Solutions</div>
                <div className="ir-company-address">
                  Aurora Bataan Highway, Digos City, Davao del Sur, Philippines 8002
                </div>
              </div>
            </div>
            <div className="ir-company-contact">
              Telephone No. 0950 274 2565<br />
              rmsitsolutions08@gmail.com
            </div>
          </div>

          {/* ── TITLE ── */}
          <div className="ir-title-row">
            <span className="ir-title">Service Work Order</span>
          </div>
          <div className="ir-subtitle">
            Installation &amp; Repair — Field Service Ticket
          </div>

          {/* ── TYPE BADGE ROW (ticket# moved to right table) ── */}
          <div className="ir-ticket-row">
            <span
              className="ir-type-badge"
              style={{ background: typeBadge.bg, color: typeBadge.color }}
            >
              {record?.type || "\u2014"}
            </span>
          </div>

          {/* ── META ROW ── */}
          <div className="ir-meta-row">
            <div className="ir-left-box-wrap">
              <div>
                <div className="ir-field-label">Client</div>
                <div className="ir-field-value client-val">
                  {record?.client?.full_name ?? record?.client_name ?? "[Client Name]"}
                </div>
              </div>
              <div>
                <div className="ir-field-label">Address / Location</div>
                <div className="ir-field-value">
                  {record?.address || "\u2014"}
                </div>
              </div>
              <div>
                <div className="ir-field-label">Prepared By</div>
                <div className="ir-field-value">
                  {record?.preparer?.full_name || "\u2014"}
                </div>
              </div>
              <div>
                <div className="ir-field-label">Assigned Technician</div>
                <div className="ir-field-value">
                  {record?.technician?.full_name || "\u2014"}
                </div>
              </div>
            </div>

            <div className="ir-meta-box-wrap">
              <table className="ir-meta-table">
                <tbody>
                  <tr>
                    <td className="ir-meta-key">Date Issued</td>
                    <td className="ir-meta-val">{dateFormatted}</td>
                  </tr>
                  <tr>
                    <td className="ir-meta-key">Ticket #</td>
                    <td className="ir-meta-val ir-ticket-val">
                      {record?.ticket_number ? String(record.ticket_number).padStart(6, "0") : "\u2014"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ir-meta-key">Start Date</td>
                    <td className="ir-meta-val">{fmtDate(record?.start_date)}</td>
                  </tr>
                  <tr>
                    <td className="ir-meta-key">End Date</td>
                    <td className="ir-meta-val">{fmtDate(record?.end_date)}</td>
                  </tr>
                  {record?.quotations && (
                    <tr>
                      <td className="ir-meta-key">Quotation DR#</td>
                      <td className="ir-meta-val" style={{ fontFamily: "monospace", fontSize: "9pt", fontWeight: "800" }}>
                        {`DR-${String(record.quotations.dr).padStart(6, "0")}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MATERIALS TABLE ── */}
          <table className="ir-table">
            <thead>
              <tr>
                <th style={{ width: "22pt", textAlign: "center" }}>No.</th>
                <th style={{ width: "22pt", textAlign: "center" }}>Qty</th>
                <th style={{ width: "170pt" }}>Item / Product Name</th>
                <th style={{ width: "100pt" }}>Serial Number</th>
                <th style={{ width: "50pt" }}>Warranty</th>
                <th className="right" style={{ width: "65pt" }}>Unit Price</th>
                <th className="right" style={{ width: "65pt" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {!lines || lines.length === 0 ? (
                [...Array(6)].map((_, i) => (
                  <tr className="filler" key={`f-${i}`}>
                    <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                  </tr>
                ))
              ) : (
                <>
                  {lines.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <td className="item-num">{String(i + 1).padStart(2, "0")}</td>
                      <td className="center" >
                        {item.quantity || "\u2014"}
                      </td>
                      <td className="item-name" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                        {item.products?.name || item.description || "\u2014"}
                      </td>
                      <td className="item-serial">
                        {item.serial_number || "\u2014"}
                      </td>
                      <td className="warranty-cell">
                        {item.products?.warranty
                          ? <span style={{ fontFamily: "monospace", fontSize: "6pt" }}>{item.products.warranty}</span>
                          : <span style={{ color: "#000000ff", fontSize: "4pt" }}>—</span>
                        }
                      </td>
                      <td className="right" style={{ fontFamily: "monospace", fontSize: "8pt" }}>
                        {item.price != null && item.price !== "" ? fmt(item.price) : "\u2014"}
                      </td>
                      <td className="right" style={{ fontFamily: "monospace", fontSize: "8pt" }}>
                        {item.price && item.quantity ? fmt(item.price * item.quantity) : "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 3 - lines.length))].map((_, i) => (
                    <tr className="filler" key={`ef-${i}`}>
                      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          {/* ── TOTALS ── */}
          <div className="ir-totals-wrap">
            <table className="ir-totals-table">
              <tbody>
                {matTotal > 0 && (
                  <tr>
                    <td className="ir-total-key">Materials Subtotal</td>
                    <td className="ir-total-val">{fmt(matTotal)}</td>
                  </tr>
                )}
                {laborCharge > 0 && (
                  <tr>
                    <td className="ir-total-key">Labor Charge</td>
                    <td className="ir-total-val">+ {fmt(laborCharge)}</td>
                  </tr>
                )}
                {discount > 0 && (
                  <tr>
                    <td className="ir-total-key">Discount</td>
                    <td className="ir-total-val">&minus; {fmt(discount)}</td>
                  </tr>
                )}
                {dpEntries.map(d => (
                  <tr key={d.n}>
                    <td className="ir-total-key">
                      Downpayment{dpEntries.length > 1 ? ` #${d.n}` : ""}
                      {d.date && (
                        <div style={{ fontWeight: 400, fontSize: "6.5pt", color: "#777777", textTransform: "none" }}>
                          {fmtDate(d.date)}
                        </div>
                      )}
                    </td>
                    <td className="ir-total-val">&minus; {fmt(d.amt)}</td>
                  </tr>
                ))}
                <tr className="ir-grand-row">
                  <td>BALANCE DUE</td>
                  <td style={{ textAlign: "right" }}>{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── REMARKS ── */}
          {record?.remarks && (
            <div className="ir-notes-section">
              <div className="ir-section-label">Remarks:</div>
              <div className="ir-remarks-box">{record.remarks}</div>
            </div>
          )}

          {/* ── PURPOSE ── */}
          <div className="ir-notes-section">
            <div className="ir-section-label">Purpose:</div>
            <div style={{ fontSize: "8.5pt", color: "#000000", lineHeight: 1.7 }}>
              This document serves as an official work order issued by <strong>RMS Information Technology Solutions</strong> for the{" "}
              {record?.type?.toLowerCase() || "service"} job performed for the above-named client. All listed
              materials, serial numbers, and labor charges are provided for <strong>service documentation</strong>,{" "}
              <strong>warranty tracking</strong>, and <strong>technical support</strong> purposes. Please keep this
              document for future reference.
            </div>
          </div>

          {/* ── NOTE ── */}
          <div style={{ marginTop: "4pt", fontSize: "8pt", color: "#000000", lineHeight: 1.7 }}>
            <strong>Note:</strong> Warranty on labor and parts shall commence on the date this document is received
            and signed by the client.
          </div>

          {/* ── SUPPORT ── */}
          <div className="ir-validity-section" style={{ marginTop: "6pt" }}>
            <strong>Support:</strong> For follow-up or technical assistance, contact RMS Information Technology Solutions at
            0950 274 2565 or rmsitsolutions08@gmail.com.
          </div>

          <div>
            <div style={{ fontSize: "8.5pt", marginTop: "6pt", marginBottom: "2pt" }}>Very Truly Yours,</div>
            <div style={{ fontWeight: "800", fontSize: "8.5pt", marginTop: "3pt", marginBottom: "2pt" }}>
              RMS Information Technology Solutions
            </div>
          </div>

          {/* ── SIGNATORY ── */}
          <div style={{ marginTop: "18pt", fontSize: "8.5pt" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "5pt" }}>

              {/* LEFT — Prepared by + Technician */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5pt", flex: 1 }}>
                <div>
                  <div style={{ fontSize: "8.5pt", marginBottom: "1pt" }}>Prepared by:</div>
                  <div className="ir-sig-line"></div>
                  <div className="ir-sig-sub"></div>
                </div>
                <div>
                  <div style={{ fontSize: "8.5pt", marginBottom: "1pt" }}>Technician:</div>
                  <div className="ir-sig-line"></div>
                  <div className="ir-sig-sub"></div>
                </div>
              </div>

              {/* RIGHT — Received by */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "8.5pt", marginBottom: "1pt" }}>Received by:</div>
                <div className="ir-sig-line"></div>
                <div className="ir-sig-sub">Printed Name &amp; Signature</div>
                <div className="ir-sig-sub" style={{ marginTop: "4pt" }}>Date Received:</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  )
}