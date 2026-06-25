import { formatDate } from "./previewInvoice.js";

export const htmlTemplate = (invoice = {}, business = {}) => {
  const safe = (v) => v ?? "";
  const format = (v) => (typeof v === "number" ? v.toFixed(2) : v);
  const currency = (v = 0) => `₹${format(v)}`;

  const renderItems = () => {
    if (!invoice.items?.length) {
      return `<tr><td colspan="7" style="text-align:center;">No items</td></tr>`;
    }

    return invoice.items
      .map((it, idx) => {
        const pageBreak = idx > 0 && idx % 21 === 0;
        return `
          ${pageBreak ? `<tr style="page-break-before:always"></tr>` : ""}
          <tr>
            <td>${idx + 1}</td>
            <td>${safe(it.productName)}</td>
            <td class="c-qty">${safe(it.quantity)}</td>
            <td>${currency(it.mrp)}</td>
            <td>${currency(it.rate ?? it.selling_rate)}</td>
            <td>${safe(it.taxRate)}%<br/>${currency(it.taxAmount)}</td>
            <td>${currency(it.amount)}</td>
          </tr>
        `;
      })
      .join("");
  };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice</title>

<style>
@page { size: A4; margin: 10mm 10mm 12mm 10mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; line-height: 1.25; color: #000; margin: 0; padding: 0; }
.container { padding: 4px; }

.company { font-size: 15px; font-weight: 700; text-transform: uppercase; margin: 0; }
.comp-address { font-size: 10px; line-height: 1.3; margin-top: 2px; }
.addr-row { margin-top: 2px; }
.value { margin-right: 0px; }
.sep { margin: 0 2px; color: #000; }

.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.invoice-title-right { font-weight: 700; font-size: 12px; text-transform: uppercase; text-align: right; white-space: nowrap; }

.box { border: 1px solid #000; padding: 5px; font-size: 10.5px; line-height: 1.25; }
.two-cols { display: flex; gap: 6px; margin-top: 4px; }
.col { flex: 1; }

table.items { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; font-size: 10.5px; }
table.items th, table.items td { border: 1px solid #000; padding: 3px 4px; }
table.items th { background: #f2f2f2; font-weight: 700; }

thead { display: table-header-group; }
tr { page-break-inside: avoid; }

.c-sno { width: 5%; }
.c-item { width: 43%; }
.c-qty { width: 7%; text-align: center; }
.c-mrp, .c-rate, .c-tax, .c-amt { width: 11%; text-align: right; }

.section-safe { page-break-inside: avoid; }

.bank { width: 100%; padding: 6px 0; font-size: 10.5px; margin-top: 6px; page-break-inside: avoid; }
.bank-flex { display: grid; grid-template-columns: 0.7fr 0.95fr; gap: 12px; }
.bank-left { padding-right: 10px; display: flex; justify-content: space-between; gap: 10px; }
.qr img { width: 80px; height: 80px; }

.amount-box { margin-right: 4px; padding-right: 10px; text-align: right; line-height: 1.3; }
.amount-row { margin-top: 2px; }
.amount-row .label { font-weight: 700; margin-right: 4px; }
.amount-row.total { margin-top: 4px; font-weight: 700; }

.bank-title { font-weight: 700; font-size: 11px; margin-bottom: 3px; text-transform: uppercase; }
.bank-row { margin-top: 2px; }

.subtotal { margin-top: 8px; text-align: right; font-size: 10.5px; padding-right: 10px; }
.clear { clear: both; }

.total-words { margin-top: 6px; font-weight: 700; text-align: right; margin-right: 14px; }
.label {
  font-weight: 700;
}

</style>
</head>

<body>
<div class="container">

<div class="header-row">
  <div>
    <div class="company">${safe(business.name)}</div>
    <div class="comp-address">
      <div class="addr-row">${safe(business.address)}</div>
      <div class="addr-row">
        <span class="label">Mob:</span> ${safe(business.mobile)}
        <span class="sep">|</span>
        <span class="label">Email:</span> ${safe(business.email)}
      </div>
      <div class="addr-row">
        <span class="label">GSTIN:</span> ${safe(business.gst_number)}
        <span class="sep">|</span>
        <span class="label">PAN:</span> ${safe(business.pan)}
      </div>
    </div>
  </div>
  <div class="invoice-title-right">
  TAX INVOICE
  
  <div style="padding-top:20px;">
  <b>No:</b> ${safe(invoice.invoiceNumber)} &nbsp;
  <b>Date:</b> ${formatDate(invoice.invoiceDate)} &nbsp;
  <b>Due:</b> ${formatDate(invoice.dueDate)}
</div>
  </div>
</div>




<div class="two-cols">
  <div class="col">
    <div class="box">
      <b>BILL TO</b><br/>
      ${safe(invoice.customerName)}<br/>
      ${safe(invoice.customerGST)}<br/>
      ${safe(invoice.customerAddress)}<br/>
      Mob: ${safe(invoice.customerMobile)}<br/>
      POS: ${safe(invoice.placeOfSupply)}
    </div>
  </div>
  <div class="col">
    <div class="box">
      <b>SHIP TO</b><br/>
      ${safe(invoice.customerName)}<br/>
      ${safe(invoice.customerAddress)}
    </div>
  </div>
</div>

<table class="items">
<thead>
<tr>
  <th class="c-sno">#</th>
  <th class="c-item">ITEM</th>
  <th class="c-qty">QTY</th>
  <th class="c-mrp">MRP</th>
  <th class="c-rate">RATE</th>
  <th class="c-tax">TAX</th>
  <th class="c-amt">AMOUNT</th>
</tr>
</thead>
<tbody>
${renderItems()}
</tbody>
</table>

<div class="subtotal">
  <span class="label">Subtotal:</span>
  Items ${invoice.items?.length || 0} |
  Tax ${currency(invoice.totalTax)} |
  Total ${currency(invoice.totalAmount)}
</div>

<div class="bank section-safe">
  <div class="bank-flex">
    <div class="bank-left">
      <div>
        <div class="bank-title">BANK & PAYMENT DETAILS</div>
        <div class="bank-row">${safe(business.bankName)}</div>
        <div class="bank-row"><span class="label">A/C:</span> ${safe(
          business.accountNumber
        )}</div>
        <div class="bank-row"><span class="label">IFSC:</span> ${safe(
          business.ifsc
        )}</div>
        <div class="bank-row"><span class="label">UPI:</span> ${safe(
          business.upiId
        )}</div>
      </div>
      ${
        business.qrCode
          ? `<div class="qr"><img src="${business.qrCode}" /></div>`
          : ""
      }
    </div>

    <div class="amount-box">
      <div class="amount-row"><span class="label">Taxable:</span> ₹0.00</div>
      <div class="amount-row"><span class="label">CGST:</span> ₹0.00</div>
      <div class="amount-row"><span class="label">SGST:</span> ₹0.00</div>
      <div class="amount-row total"><span class="label">Total:</span> ₹0.00</div>
      <div class="amount-row"><span class="label">Received:</span> ₹0.00</div>
    </div>
  </div>
</div>

<div class="total-words">${safe(invoice.totalAmountWords)}</div>

</div>
</body>
</html>`;
};
