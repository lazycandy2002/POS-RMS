// ─── QUOTATION PRINT TEMPLATE ─────────────────────────────────────────────────
// A4 format: 210mm × 297mm (794px × 1123px at 96dpi screen / true A4 on print)

export function QuotationPrintTemplate({ quotation, lines, logoSrc = "" }) {
  const fmt = (n) =>
    n != null
      ? `\u20b1${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "\u2014"

  const isBilling = quotation?.status === "Delivered" || quotation?.status === "Approved"

  const materialsTotal = lines.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity) || 0), 0)
  const electricalMaterials = Number(quotation?.electrical_materials) || 0
  const laborCharge = Number(quotation?.labor_charge) || 0
  const discount = Number(quotation?.discount) || 0
  const grandTotal = materialsTotal + electricalMaterials + laborCharge - discount
  const dp1 = Number(quotation?.downpayment_amount) || 0
  const dp2 = Number(quotation?.downpayment_2_amount) || 0
  const dp3 = Number(quotation?.downpayment_3_amount) || 0
  const downpayment = dp1 + dp2 + dp3
  const balance = grandTotal - downpayment
  const dpEntries = [
    { n: 1, amt: dp1, date: quotation?.downpayment_date },
    { n: 2, amt: dp2, date: quotation?.downpayment_2_date },
    { n: 3, amt: dp3, date: quotation?.downpayment_3_date },
  ].filter(d => d.amt > 0)

  const validUntil = quotation?.created_at
    ? (() => {
      const d = new Date(quotation.created_at)
      d.setDate(d.getDate() + 7)
      return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    })()
    : "\u2014"

  const dateFormatted = quotation?.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "\u2014"

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

        .q-letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8pt;
          border-bottom: 2px solid #000000;
          margin-bottom: 5pt;
        }
        .q-logo-area { display: flex; align-items: center; gap: 10pt; }
        .q-logo-img {
          width: 64pt;
          height: 64pt;
          object-fit: contain;
          display: block;
          flex-shrink: 0;
        }
        .q-company-name {
          font-size: 10pt; font-weight: 800; color: #000000;
          letter-spacing: 0.5pt; line-height: 1.1;
        }
        .q-company-address { font-size: 7pt; color: #333333; margin-top: 2pt; line-height: 1.6; }
        .q-company-contact { text-align: right; font-size: 7pt; color: #333333; line-height: 1.7; }

        .q-title-row { text-align: center; margin: 12pt 0 10pt; }
        .q-title {
          font-size: 17pt; font-weight: 900; color: #000000;
          text-decoration: underline; text-transform: uppercase; letter-spacing: 4pt;
        }

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
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
          color: #555555;
          margin-bottom: 1pt;
        }
        .left-field-value {
          font-size: 9pt;
          font-weight: 600;
          color: #000000;
          line-height: 1.4;
        }
        .left-field-value.customer-val {
          font-weight: 800;
          font-size: 10pt;
        }
        .left-field-value.remarks-val {
          font-weight: 400;
          font-size: 8pt;
          color: #333333;
          white-space: pre-line;
        }

        .rms-meta-box-wrap {
          width: 185pt;
          flex-shrink: 0;
        }
        .rms-meta-box-title {
          background-color: #f0f0f0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #000000 !important;
          font-size: 7pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.5pt; padding: 4pt 8pt; text-align: center;
        }
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
        .q-table thead th.right  { text-align: right; }

        .q-table tbody tr { border-bottom: 1px solid #e0e0e0; }
        .q-table tbody tr:last-child { border-bottom: 1.5px solid #000000; }
        .q-table tbody td {
          padding: 4.5pt 6pt; color: #000000; vertical-align: top;
          border-right: 1px solid #eeeeee;
        }
        .q-table tbody td:last-child { border-right: none; }
        .q-table tbody td.center { text-align: center; vertical-align: middle; }
        .q-table tbody td.right  { text-align: right;  vertical-align: middle; }

        .q-table tbody tr.filler td {
          height: 18pt; color: transparent; border-bottom: 1px solid #eeeeee;
        }

        .item-num  { color: #999999; font-size: 7.5pt; text-align: center; vertical-align: middle !important; }
        .item-code { font-weight: 600; font-size: 7.5pt; color: #000000; vertical-align: middle !important; }
        .item-name { font-weight: 600; color: #000000; font-size: 8.5pt; line-height: 1.3; }
        .item-desc {
  font-size: 7pt;
  font-weight: 400;
  color: #555555;
  margin-top: 1.5pt;
  line-height: 1.4;
  white-space: pre-line;
}

        .q-totals-wrap {
          display: flex; justify-content: flex-end;
          border-bottom: 1.5px solid #000000; margin-bottom: 12pt;
        }
        .q-totals-table { width: 185pt; border-collapse: collapse; font-size: 8.5pt; table-layout: fixed; }
        .q-totals-table td { padding: 4pt 6pt; color: #000000; border-top: 1px solid #e0e0e0; }
        .q-totals-table tr.grand td { font-weight: 800; font-size: 10pt; border-top: 1.5px solid #000000; }
        .q-totals-table td.right { text-align: right; width: 80pt; }
        .q-totals-table td.label { font-weight: 700; width: 105pt; }

        .q-section-label { font-weight: 700; font-size: 8.5pt; color: #000000; margin-bottom: 2pt; }
        .q-notes-section { margin-bottom: 8pt; font-size: 8.5pt; }
        .q-notes-section ol { padding-left: 16pt; line-height: 1.8; color: #000000; }
        .q-validity-section { font-size: 8.5pt; line-height: 1.8; color: #000000; margin-bottom: 1pt; }

        .q-signatory {
          display: flex; justify-content: space-between;
          margin-top: 10pt; padding-top: 5pt; font-size: 8.5pt;
        }
        .q-sig-line { width: 160pt; border-bottom: 1px solid #000000; height: 24pt; margin-top: 16pt; }
        .q-sig-sub { font-size: 7.5pt; color: #333333; }
      `}</style>

      <div className="rms-print-wrapper">
        <div className="rms-page" id="rms-quotation-print">

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
            <span className="q-title">{isBilling ? "Billing" : "Quotation"}</span>
          </div>

          {/* ── META ROW ── */}
          <div className="rms-meta-row">
            <div className="rms-left-box-wrap">
              <div>
                <div className="left-field-label">Bill To</div>
                <div className="left-field-value customer-val">
                  {quotation?.clients?.full_name ?? "[Customer Name]"}
                </div>
              </div>
              <div>
                <div className="left-field-label">Prepared By</div>
                <div className="left-field-value">
                  {quotation?.employees?.full_name ?? "\u2014"}
                </div>
              </div>
              <div>
                <div className="left-field-label">Remarks</div>
                <div className="left-field-value remarks-val">
                  {quotation?.remarks || "\u2014"}
                </div>
              </div>
            </div>

            <div className="rms-meta-box-wrap">
              <div className="rms-meta-box">
                <table className="rms-meta-table">
                  <tbody>
                    <tr>
                      <td className="meta-key">Date</td>
                      <td className="meta-val">{dateFormatted}</td>
                    </tr>
                    <tr>
                      <td className="meta-key">Quote No.</td>
                      <td className="meta-val" style={{ fontFamily: "monospace", fontSize: "9pt", fontWeight: "800" }}>
                        {quotation?.dr ? `DR-${String(quotation.dr).padStart(6, "0")}` : "\u2014"}
                      </td>
                    </tr>
                    <tr>
                      <td className="meta-key">Customer ID</td>
                      <td className="meta-val">{quotation?.client_id ?? "\u2014"}</td>
                    </tr>
                    <tr>
                      <td className="meta-key">Valid Until</td>
                      <td className="meta-val">{validUntil}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                <th className="right" style={{ width: "64pt" }}>Unit Price</th>
                <th className="right" style={{ width: "64pt" }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <tr className="filler" key={`f-${i}`}>
                    <td> </td><td> </td><td> </td>
                    <td> </td><td> </td><td> </td><td> </td>
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
                        {item.products?.warranty && (
                          <div className="item-desc">Warranty: {item.products.warranty}</div>
                        )}
                      </td>
                      <td className="center">{item.quantity || "\u2014"}</td>
                      <td className="center" style={{ fontSize: "7.5pt", color: "#333333", fontWeight: "600" }}>
                        {item.products?.price_um || "\u2014"}
                      </td>
                      <td className="right">{item.price ? fmt(item.price) : "\u2014"}</td>
                      <td className="right" style={{ fontWeight: "700" }}>
                        {item.price && item.quantity
                          ? fmt(Number(item.price) * Number(item.quantity))
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 2 - lines.length))].map((_, i) => (
                    <tr className="filler" key={`ef-${i}`}>
                      <td> </td><td> </td><td> </td>
                      <td> </td><td> </td><td> </td><td> </td>
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
                  <td className="label">Materials</td>
                  <td className="right">{fmt(materialsTotal)}</td>
                </tr>
                {electricalMaterials > 0 && (
                  <tr>
                    <td className="label">Electrical Materials</td>
                    <td className="right">+ {fmt(electricalMaterials)}</td>
                  </tr>
                )}
                {laborCharge > 0 && (
                  <tr>
                    <td className="label">Labor Charge</td>
                    <td className="right">+ {fmt(laborCharge)}</td>
                  </tr>
                )}
                {discount > 0 && (
                  <tr>
                    <td className="label">Discount</td>
                    <td className="right">&minus; {fmt(discount)}</td>
                  </tr>
                )}
                <tr className="grand">
                  <td className="label">Grand Total</td>
                  <td className="right">{fmt(grandTotal)}</td>
                </tr>
                {dpEntries.map(d => (
                  <tr key={d.n}>
                    <td className="label">
                      Downpayment{dpEntries.length > 1 ? ` #${d.n}` : ""}
                      {d.date && (
                        <div style={{ fontWeight: "400", fontSize: "7pt", color: "#555555" }}>
                          {new Date(d.date).toLocaleDateString("en-PH", {
                            year: "numeric", month: "long", day: "numeric"
                          })}
                        </div>
                      )}
                    </td>
                    <td className="right">&minus; {fmt(d.amt)}</td>
                  </tr>
                ))}
                {downpayment > 0 && (
                  <tr className="grand">
                    <td className="label">Balance Due</td>
                    <td className="right">{fmt(balance)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAYMENT BANKS ── */}
          <div className="q-validity-section">
            <strong>Bank Payment:</strong> Payment should be made by crossed cheque payable to <strong>"RMS Information Technology Solutions"</strong><br />
            Our bank account details:<br />
            <div style={{ marginTop: '6px', paddingLeft: '12px' }}>
              <strong>Account Name:</strong> RMS Information Technology Solutions<br />
              <strong>Bank:</strong> Banco de Oro (BDO)<br />
              <strong>Acct. No:</strong> 0106-8010-5492
            </div>
            <div style={{ marginTop: '6px', paddingLeft: '12px' }}>
              <strong>Account Name:</strong> RMS Information Technology Solutions<br />
              <strong>Bank:</strong> Rizal Commercial Banking Corporation (RCBC)<br />
              <strong>Acct. No:</strong> 7591-13443-7
            </div>
          </div>

          {/* ── VALIDITY / TERMS ── */}
          <div className="q-validity-section">
            <strong>Validity of Offer:</strong> Within seven (7) days from the date hereon.<br />
            <strong>Terms of Payment:</strong> 50% downpayment upon issuance of Purchase Order; 50% upon complete delivery and acceptance.
          </div>

          {/* ── SIGNATORY ── */}
          <div className="q-signatory">
            <div>
              <div style={{ fontSize: "8.5pt", marginBottom: "2pt" }}>Very truly yours,</div>
              <div style={{ fontWeight: "800", fontSize: "8.5pt", marginTop: "3pt" }}>RMS Information Technology Solutions</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "8.5pt", marginBottom: "2pt" }}>
                {isBilling ? "Payment Received by:" : "Customer's Conforme:"}
              </div>
              <div className="q-sig-line" style={{ marginLeft: "auto" }}></div>
              {isBilling ? "Authorized Signature" : "Customer's Signature"}
              <div className="q-sig-sub" style={{ marginTop: "5pt" }}>Date Signed:</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}