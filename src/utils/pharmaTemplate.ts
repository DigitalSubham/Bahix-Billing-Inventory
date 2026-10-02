import { currency, format, safe } from './helper';
import {
  getColumnWidths,
  getVisibleItemColumns,
  ItemColumn,
} from './invoiceColumns';

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Renders `label : value` only when the value is actually present. */
const field = (label: string, value: unknown): string => {
  const text = String(value ?? '').trim();
  if (!text || text === 'N/A') return '';
  return `<div class="f"><span class="f-l">${esc(label)}</span><span class="f-c">:</span><span class="f-v">${esc(text)}</span></div>`;
};

export type InvoicePageSize = 'A4' | 'A5';

/** True when this column set is too wide for a portrait page. */
export const pharmaNeedsLandscape = (items: any[] = []) =>
  getVisibleItemColumns(items).length > 11;

/**
 * Pharma / medical distributor invoice.
 *
 * Follows the trade layout: a four-box header band (supplier, consignee,
 * buyer licences, invoice details), batch and expiry per line, free goods,
 * and a carried-forward quantity total. The column set is decided by the
 * data on the lines, so columns nothing uses are dropped.
 *
 * General-category invoices use `htmlTemplate` instead — a different design.
 */
export const pharmaTemplate = (
  invoice: any = {},
  business: any = {},
  page: InvoicePageSize = 'A4',
) => {
  const items: any[] = invoice.items ?? [];
  const columns: ItemColumn[] = getVisibleItemColumns(items);
  const widths = getColumnWidths(columns);
  const landscape = columns.length > 11;
  const compact = page === 'A5';

  // Shrink the type as the table widens so 15 columns still fit the page.
  const baseFontSize =
    columns.length > 13 ? 7.5 : columns.length > 10 ? 8.5 : 9.5;
  const fontSize = compact ? baseFontSize - 1 : baseFontSize;
  const pageSize = compact ? '148mm 210mm' : 'A4';
  const pageMargin = compact ? '5mm' : '8mm';

  const renderHead = () =>
    columns
      .map(
        (column, index) =>
          `<th class="a-${column.align}" style="width:${widths[index].toFixed(2)}%">${esc(column.label)}</th>`,
      )
      .join('');

  const renderRows = () => {
    if (!items.length) {
      return `<tr><td colspan="${columns.length}" class="empty">No items</td></tr>`;
    }

    return items
      .map(
        (item, index) =>
          `<tr>${columns
            .map(
              column =>
                `<td class="a-${column.align}">${esc(column.value(item, index))}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('');
  };

  // "Totals c/o  154+42 PCS" — billed quantity plus free quantity.
  const totalsLabel = () => {
    const qty = format(invoice.totalQuantity);
    const free = Number(invoice.totalFreeQuantity) || 0;
    const unit = String(invoice.primaryUnit ?? '').trim();
    const qtyText = free > 0 ? `${qty}+${format(free)}` : qty;
    return `Totals&nbsp;&nbsp;${qtyText}${unit ? `&nbsp;${esc(unit)}` : ''}`;
  };

  const showBank = Boolean(
    business.bankName || business.accountNumber || business.upiId,
  );

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice</title>
<style>
@page { size: ${pageSize} ${landscape ? 'landscape' : 'portrait'}; margin: ${pageMargin}; }

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: ${fontSize}px;
  line-height: 1.3;
  color: #000;
  margin: 0;
  padding: 0;
  background: #fff;
}

.sheet { border: 1px solid #000; }

/* ---------- header band ---------- */
.head { display: table; width: 100%; table-layout: fixed; border-collapse: collapse; }
.head-cell { display: table-cell; vertical-align: top; padding: 4px 6px; border-right: 1px solid #000; }
.head-cell:last-child { border-right: 0; }
.w-supplier { width: 27%; }
.w-consignee { width: 30%; }
.w-buyer { width: 25%; }
.w-meta { width: 18%; }

.box-title { font-weight: 700; text-decoration: underline; margin-bottom: 2px; }
.party-name { font-weight: 700; font-size: ${(fontSize + 2).toFixed(1)}px; text-transform: uppercase; }
.party-address { margin-bottom: 2px; }

.doc-title { text-align: center; font-weight: 700; font-size: ${(fontSize + 4).toFixed(1)}px; letter-spacing: 0.5px; text-decoration: underline; margin-bottom: 3px; }
.copy-label { text-align: center; font-weight: 700; text-decoration: underline; margin-bottom: 3px; }

.f { display: table; width: 100%; }
.f-l { display: table-cell; width: 42%; white-space: nowrap; }
.f-c { display: table-cell; width: 6px; }
.f-v { display: table-cell; font-weight: 600; word-break: break-word; }

/* ---------- items ---------- */
table.items { width: 100%; border-collapse: collapse; table-layout: fixed; border-top: 1px solid #000; }
table.items th, table.items td { border: 1px solid #000; padding: 2px 3px; word-wrap: break-word; overflow-wrap: break-word; }
table.items th { font-weight: 700; vertical-align: middle; }
table.items td { vertical-align: top; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
.empty { text-align: center; padding: 10px 0; }

.a-left { text-align: left; }
.a-right { text-align: right; }
.a-center { text-align: center; }

.totals-row td { font-weight: 700; border-top: 1px solid #000; padding: 4px 3px; }

/* ---------- footer ---------- */
.foot { display: table; width: 100%; table-layout: fixed; border-top: 1px solid #000; page-break-inside: avoid; }
.foot-cell { display: table-cell; vertical-align: top; padding: 5px 6px; border-right: 1px solid #000; }
.foot-cell:last-child { border-right: 0; }
.w-terms { width: 46%; }
.w-bank { width: 27%; }
.w-amount { width: 27%; }

.terms-title { font-weight: 700; text-decoration: underline; margin-bottom: 2px; }
.terms-line { margin-top: 1px; }
.eoe { font-weight: 700; margin-top: 3px; }

.amount-row { display: table; width: 100%; margin-top: 1px; }
.amount-label { display: table-cell; }
.amount-value { display: table-cell; text-align: right; font-weight: 600; }
.amount-total { font-weight: 700; border-top: 1px solid #000; margin-top: 3px; padding-top: 2px; }

.qr img { width: 70px; height: 70px; margin-top: 3px; }

.words { border-top: 1px solid #000; padding: 4px 6px; font-weight: 700; page-break-inside: avoid; }

.sign { display: table; width: 100%; border-top: 1px solid #000; page-break-inside: avoid; }
.sign-cell { display: table-cell; vertical-align: bottom; padding: 5px 6px; height: 46px; }
.sign-right { text-align: right; font-weight: 700; }
</style>
</head>
<body>
<div class="sheet">

  <!-- header -->
  <div class="head">
    <div class="head-cell w-supplier">
      <div class="box-title">Details of Supplier (From)</div>
      <div class="party-name">${esc(safe(business.name))}</div>
      <div class="party-address">${esc(business.address ?? '')}</div>
      ${field('FSSAI', business.fssaiNo)}
      ${field('D.L.No.', business.dlNo)}
      ${field('GSTIN', business.gst_number)}
      ${field('PAN', business.pan)}
      ${field('PHONE', business.mobile)}
      ${field('Email', business.email)}
    </div>

    <div class="head-cell w-consignee">
      <div class="doc-title">TAX INVOICE</div>
      <div class="box-title">Details of Consignee (To)</div>
      ${field("Buyer's", invoice.customerName)}
      ${field('Address', invoice.customerAddress)}
      ${field('State', invoice.customerStateLabel)}
      ${field('BEAT', invoice.customerBeat)}
    </div>

    <div class="head-cell w-buyer">
      ${field('GSTIN', invoice.customerGST)}
      ${field('UID', invoice.customerUid)}
      ${field('D.L.No', invoice.customerDlNo)}
      ${field('FSSAI', invoice.customerFssai)}
      ${field('Mob', invoice.customerMobile)}
      ${field('Place of Supply', invoice.placeOfSupply)}
    </div>

    <div class="head-cell w-meta">
      <div class="copy-label">${esc(invoice.copyLabel ?? 'Original Copy')}</div>
      <div class="box-title">Invoice Details</div>
      ${field('Inv Date', invoice.invoiceDate)}
      ${field('Inv. No.', invoice.invoiceNumber)}
      ${field('Due Date', invoice.dueDate)}
    </div>
  </div>

  <!-- items -->
  <table class="items">
    <thead><tr>${renderHead()}</tr></thead>
    <tbody>
      ${renderRows()}
      <tr class="totals-row">
        <td class="a-left" colspan="${Math.max(columns.length - 1, 1)}">${totalsLabel()}</td>
        <td class="a-right">${format(invoice.totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <!-- footer -->
  <div class="foot">
    <div class="foot-cell w-terms">
      <div class="terms-title">Terms &amp; Conditions</div>
      <div class="terms-line">1. Goods once sold will not be taken back.</div>
      <div class="terms-line">2. Please check the stock properly before taking delivery.</div>
      <div class="eoe">E &amp; O. E.${
        String(business.jurisdiction ?? '').trim()
          ? ` Subject to '${esc(business.jurisdiction)}' Jurisdiction only.`
          : ''
      }</div>
    </div>

    <div class="foot-cell w-bank">
      ${
        showBank
          ? `<div class="terms-title">Bank &amp; Payment</div>
      ${field('Bank', business.bankName)}
      ${field('A/C', business.accountNumber)}
      ${field('IFSC', business.ifsc)}
      ${field('UPI', business.upiId)}
      ${business.qrCode ? `<div class="qr"><img src="${business.qrCode}" alt="QR" /></div>` : ''}`
          : ''
      }
    </div>

    <div class="foot-cell w-amount">
      <div class="amount-row"><span class="amount-label">Sub Total</span><span class="amount-value">${currency(invoice.subtotal)}</span></div>
      ${
        Number(invoice.discountAmount ?? 0) > 0
          ? `<div class="amount-row"><span class="amount-label">Discount</span><span class="amount-value">${currency(invoice.discountAmount)}</span></div>`
          : ''
      }
      <div class="amount-row"><span class="amount-label">Taxable Amt</span><span class="amount-value">${currency(invoice.taxableAmount)}</span></div>
      <div class="amount-row"><span class="amount-label">CGST</span><span class="amount-value">${currency(invoice.cgstTotal)}</span></div>
      <div class="amount-row"><span class="amount-label">SGST</span><span class="amount-value">${currency(invoice.sgstTotal)}</span></div>
      <div class="amount-row amount-total"><span class="amount-label">Total</span><span class="amount-value">${currency(invoice.totalAmount)}</span></div>
      ${
        Number(invoice.receivedAmount ?? 0) > 0
          ? `<div class="amount-row"><span class="amount-label">Received</span><span class="amount-value">${currency(invoice.receivedAmount)}</span></div>`
          : ''
      }
    </div>
  </div>

  <div class="words">Amount in Words : ${esc(invoice.totalAmountWords ?? '')}</div>

  <div class="sign">
    <div class="sign-cell"></div>
    <div class="sign-cell sign-right">
      For ${esc(safe(business.name))}<br/><br/>
      Authorised Signatory
    </div>
  </div>

</div>
</body>
</html>`;
};
