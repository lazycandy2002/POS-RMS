// ─── PRODUCT RECORD PRINT TEMPLATE ────────────────────────────────────────────
// A4 format: 210mm × 297mm — Serial Number / Warranty Record

export function ProductRecordTemplate({ quotation, lines }) {
  const dateFormatted = quotation?.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-PH", {
      year: "numeric", month: "long", day: "numeric"
    })
    : "\u2014"

  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
      year: "numeric", month: "long", day: "numeric"
    }) : "\u2014"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

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
          padding: 12mm 15mm 12mm 15mm;
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
          .rms-print-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: unset;
          }
          .rms-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .rms-no-print { display: none !important; }
        }

        /* ── LETTERHEAD ── */
        .q-letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8pt;
          border-bottom: 2px solid #000000;
          margin-bottom: 5pt;
        }
        .q-logo-area { display: flex; align-items: center; gap: 10pt; }
        .q-logo-img { width: 44pt; height: 44pt; object-fit: contain; }
        .q-company-name {
          font-size: 10pt; font-weight: 800; color: #000000;
          letter-spacing: 0.5pt; line-height: 1.1;
        }
        .q-company-address { font-size: 7pt; color: #333333; margin-top: 2pt; line-height: 1.6; }
        .q-company-contact { text-align: right; font-size: 7pt; color: #333333; line-height: 1.7; }

        /* ── TITLE ── */
        .q-title-row { text-align: center; margin: 12pt 0 3pt; }
        .q-title {
          font-size: 17pt; font-weight: 900; color: #000000;
          text-decoration: underline; text-transform: uppercase; letter-spacing: 4pt;
        }
        .q-subtitle {
          text-align: center;
          font-size: 7pt;
          color: #555555;
          letter-spacing: 2pt;
          text-transform: uppercase;
          margin-bottom: 10pt;
        }

        /* ── META ROW ── */
        .rms-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 12pt;
          margin-bottom: 12pt;
        }
        .rms-left-box-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6pt;
          justify-content: center;
        }
        .left-field-label {
          font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5pt; color: #555555; margin-bottom: 1pt;
        }
        .left-field-value {
          font-size: 9pt; font-weight: 600; color: #000000; line-height: 1.4;
        }
        .left-field-value.customer-val { font-weight: 800; font-size: 10pt; }

        .rms-meta-box-wrap { width: 185pt; flex-shrink: 0; }
        .rms-meta-table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
        .rms-meta-table td { padding: 4pt 8pt; border-bottom: 1px solid #e0e0e0; color: #000000; }
        .rms-meta-table tr:last-child td { border-bottom: none; }
        .meta-key {
          font-weight: 700; text-transform: uppercase; font-size: 7pt; color: #000000;
          background-color: #f8f8f8 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          white-space: nowrap; width: 60pt;
        }
        .meta-val { color: #000000; font-weight: 600; }

        /* ── PRODUCT TABLE ── */
        .q-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .q-table thead tr {
          border-top: 1.5px solid #000000;
          border-bottom: 1.5px solid #000000;
        }
        .q-table thead th {
          padding: 5pt 6pt; text-align: left; font-weight: 700;
          font-size: 7.5pt; color: #000000; text-decoration: underline;
          border-right: 1px solid #cccccc;
        }
        .q-table thead th:last-child { border-right: none; }
        .q-table thead th.center { text-align: center; }

        .q-table tbody tr { border-bottom: 1px solid #e0e0e0; }
        .q-table tbody tr:last-child { border-bottom: 1.5px solid #000000; }
        .q-table tbody td {
          padding: 4.5pt 6pt; color: #000000; vertical-align: middle;
          border-right: 1px solid #eeeeee;
        }
        .q-table tbody td:last-child { border-right: none; }
        .q-table tbody td.center { text-align: center; }
        .q-table tbody tr.filler td {
          height: 20pt; color: transparent; border-bottom: 1px solid #eeeeee;
        }

        .item-num { color: #999999; font-size: 7.5pt; text-align: center; }
        .item-name { font-weight: 600; color: #000000; font-size: 8.5pt; line-height: 1.3; }
        .item-desc { font-size: 7pt; font-weight: 400; color: #555555; margin-top: 1.5pt; line-height: 1.4; }
        .item-serial {
          font-family: monospace; font-size: 8pt; font-weight: 700;
          color: #000000; letter-spacing: 0.5pt;
        }
        .warranty-cell {
          font-size: 7.5pt; color: #000000; line-height: 1.5;
        }

        /* ── REMARKS ── */
.q-remarks-box {
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
  white-space: pre-line;
}

/* ── PURPOSE ── */
.q-validity-section { font-size: 8.5pt; line-height: 1.8; color: #000000; margin-bottom: 1pt; }
.q-notes-section { margin-bottom: 8pt; font-size: 8.5pt; }
.q-section-label { font-weight: 700; font-size: 8.5pt; color: #000000; margin-bottom: 2pt; }

        /* ── SIGNATORY ── */
        .q-sig-line { width: 160pt; border-bottom: 1px solid #000000; height: 24pt; margin-top: 10pt; }
        .q-sig-sub { font-size: 7.5pt; color: #333333; }
      `}</style>

      <div className="rms-print-wrapper">
        <div className="rms-page">

          {/* ── LETTERHEAD ── */}
          <div className="q-letterhead">
            <div className="q-logo-area">
              <img
                src="/Logo2.png"
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
            <span className="q-title">Product Record</span>
          </div>
          <div className="q-subtitle">
            Product Registration &amp; Serial Number Record
          </div>

          {/* ── META ROW ── */}
          <div className="rms-meta-row">
            <div className="rms-left-box-wrap">
              <div>
                <div className="left-field-label">Customer</div>
                <div className="left-field-value customer-val">
                  {quotation?.clients?.full_name ?? "[Customer Name]"}
                </div>
              </div>
              <div>
                <div className="left-field-label">Issued By</div>
                <div className="left-field-value">
                  {quotation?.employees?.full_name ?? "\u2014"}
                </div>
              </div>
              <div>
                <div className="left-field-label">Assigned Technician</div>
                <div className="left-field-value">
                  {quotation?.technician?.full_name ?? "\u2014"}
                </div>
              </div>
            </div>

            <div className="rms-meta-box-wrap">
              <table className="rms-meta-table">
                <tbody>
                  <tr>
                    <td className="meta-key">Date</td>
                    <td className="meta-val">{dateFormatted}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">DR No.</td>
                    <td className="meta-val" style={{ fontFamily: "monospace", fontSize: "9pt", fontWeight: "800" }}>
                      {quotation?.dr ? `DR-${String(quotation.dr).padStart(6, "0")}` : "\u2014"}
                    </td>
                  </tr>
                  <tr>
                    <td className="meta-key">Start Date</td>
                    <td className="meta-val">{fmtDate(quotation?.start_date)}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">End Date</td>
                    <td className="meta-val">{fmtDate(quotation?.end_date)}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">Customer ID</td>
                    <td className="meta-val">{quotation?.client_id ?? "\u2014"}</td>
                  </tr>
                  <tr>
                    <td className="meta-key">Status</td>
                    <td className="meta-val">{quotation?.status ?? "\u2014"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── PRODUCT TABLE ── */}
          <table className="q-table">
            <thead>
              <tr>
                <th style={{ width: "22pt", textAlign: "center" }}>No.</th>
                <th style={{ width: "22pt", textAlign: "center" }}>Qty</th>
                <th style={{ width: "160pt" }}>Item Name</th>
                <th style={{ width: "100pt" }}>Serial Number</th>
                <th style={{ width: "90pt" }}>Warranty</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <tr className="filler" key={`f-${i}`}>
                    <td> </td><td> </td><td> </td><td> </td><td> </td><td> </td>
                  </tr>
                ))
              ) : (
                <>
                  {lines.map((item, i) => {
                    const warranty = item.products?.warranty

                    return (
                      <tr key={item.id ?? i}>
                        <td className="item-num">{String(i + 1).padStart(2, "0")}</td>
                        <td className="center" style={{ fontWeight: "600" }}>
                          {item.quantity || "\u2014"}
                        </td>
                        <td className="item-name" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                          {item.products?.name || "\u2014"}
                        </td>
                        <td className="item-serial" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                          {item.serial_number || "\u2014"}
                        </td>
                        <td className="warranty-cell">
                          {warranty
                            ? <span style={{ fontWeight: 700 }}>{warranty}</span>
                            : <span style={{ color: "#000000ff", fontSize: "7pt" }}>—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                  {[...Array(Math.max(0, 3 - lines.length))].map((_, i) => (
                    <tr className="filler" key={`ef-${i}`}>
                      <td> </td><td> </td><td> </td><td> </td><td> </td><td> </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          {/* ── REMARKS ── */}
          {quotation?.remarks && (
            <div className="q-notes-section" style={{ marginTop: "6pt" }}>
              <div className="q-section-label">Remarks:</div>
              <div className="q-remarks-box">{quotation.remarks}</div>
            </div>
          )}

          {/* ── PURPOSE ── */}
          <div className="q-notes-section" style={{ marginTop: "6pt" }}>
            <div className="q-section-label">Purpose:</div>
            <div style={{ fontSize: "8.5pt", color: "#000000ff", lineHeight: 1.7 }}>
              This document serves as an official record of the products supplied by <strong>RMS Information Technology Solutions</strong> and
              their corresponding serial numbers for <strong>warranty</strong>, <strong>maintenance</strong>, and <strong>technical support</strong> purposes.
              Please keep this document for future reference.
            </div>
          </div>

          {/* ── WARRANTY NOTE ── */}
          <div style={{ marginTop: "6pt", fontSize: "8pt", color: "#000000ff", lineHeight: 1.7 }}>
            <strong>Note:</strong> Warranty period shall commence on the date this document is signed and dated below by the customer.
          </div>

          {/* ── SUPPORT LINE ── */}
          <div className="q-validity-section" style={{ marginTop: "6pt" }}>
            <strong>Support:</strong> For technical assistance, contact RMS Information Technology Solutions at 0950 274 2565 or rmsitsolutions08@gmail.com.
          </div>
          <div>
            <div style={{ fontSize: "8.5pt", marginTop: "3pt", marginBottom: "2pt" }}>Very Truly Yours,</div>
            <div style={{ fontWeight: "800", fontSize: "8.5pt", marginTop: "3pt", marginBottom: "2pt" }}>RMS Information Technology Solutions</div>
          </div>

          {/* ── SIGNATORY ── */}
          <div style={{ marginTop: "18pt", fontSize: "8.5pt" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "5pt"
            }}>

              {/* LEFT COLUMN — Prepared by + Approved by */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5pt", flex: 1 }}>
                <div>
                  <div style={{ fontSize: "8.5pt", marginBottom: "1pt" }}>Prepared by:</div>
                  <div className="q-sig-line"></div>
                </div>
                <div>
                  <div style={{ fontSize: "8.5pt", marginBottom: "1pt", marginBottom: "2pt" }}>Approved by:</div>
                  <div className="q-sig-line"></div>
                </div>
              </div>

              {/* RIGHT COLUMN — Received by */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "8.5pt", marginBottom: "1pt" }}>Received by:</div>
                <div className="q-sig-line"></div>
                <div className="q-sig-sub">Printed Name &amp; Signature</div>
                <div className="q-sig-sub" style={{ marginTop: "4pt" }}>Date Received:</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  )
}