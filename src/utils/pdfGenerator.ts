import * as RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Platform } from 'react-native';
import { htmlTemplate } from './htmlTemplate';
import { A5htmlTemplate } from './a5';
import { pharmaTemplate, pharmaNeedsLandscape } from './pharmaTemplate';
import { calculateQuantityTotals, convertAmountToWords } from './calculations';
import { formatDate } from './helper';
import { normalizeCategory } from '../constants/categoryFields';

export type InvoicePdfFormat = 'A4' | 'A5';

const PAGE_SIZES = {
  A4: { portrait: { width: 595, height: 842 }, landscape: { width: 842, height: 595 } },
  A5: { portrait: { width: 420, height: 595 }, landscape: { width: 595, height: 420 } },
} as const;

/** The unit printed on the totals row — only when every line agrees on one. */
const getPrimaryUnit = (items: any[] = []): string => {
  const units = items
    .map(item => String(item?.unit ?? item?.baseUnit ?? '').trim())
    .filter(Boolean);

  if (!units.length) return '';
  return units.every(unit => unit === units[0]) ? units[0] : '';
};

const pick = (...values: any[]) =>
  values.find(value => value !== undefined && value !== null && value !== '') ??
  '';

export const generateInvoicePDF = async (
  invoice: any,
  business: any,
  qrcode: any,
  format: InvoicePdfFormat = 'A4',
) => {
  const customer = invoice.customer ?? {};
  const items = invoice.items ?? [];
  const quantityTotals = calculateQuantityTotals(items);

  const busi = {
    name: business?.name,
    address: business?.address,
    mobile: business?.mobile,
    email: business?.email,
    gst_number: business?.gst_number,
    pan: business?.pan_number,
    bankName: business?.bank,
    ifsc: business?.ifsc,
    accountNumber: business?.account_no,
    upiId: business?.upi_id,
    qrCode: qrcode,
    // category-specific supplier identifiers
    fssaiNo: pick(business?.fssai_no, business?.fssaiNo),
    dlNo: pick(business?.dl_no, business?.dlNo),
    jurisdiction: pick(business?.jurisdiction, business?.city),
  };

  const customerState = pick(customer.state, customer.placeOfSupply);
  const customerStateCode = pick(customer.state_code, customer.stateCode);

  const inv = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    dueDate: formatDate(invoice.dueDate),
    copyLabel: 'Original Copy',

    customerName: customer.name,
    customerAddress: customer.address,
    customerGST: pick(customer.gst_number, customer.gstNumber),
    customerMobile: customer.mobile,
    placeOfSupply: pick(customer.placeOfSupply, customer.state),
    customerStateLabel: customerState
      ? `${customerState}${customerStateCode ? ` (${customerStateCode})` : ''}`
      : '',
    // category-specific buyer identifiers
    customerDlNo: pick(customer.dl_no, customer.dlNo),
    customerFssai: pick(customer.fssai_no, customer.fssaiNo),
    customerUid: pick(customer.uid),
    customerBeat: pick(customer.beat),

    items,
    totalQuantity: quantityTotals.totalQuantity,
    totalFreeQuantity: quantityTotals.totalFreeQuantity,
    primaryUnit: getPrimaryUnit(items),

    subtotal: invoice.subtotal,
    discountAmount: Number(invoice?.discountAmount || 0),
    taxableAmount: Number(
      invoice.taxableAmount ||
        Number(invoice.totalAmount) - Number(invoice.totalTax || 0),
    ),
    cgstTotal: invoice.cgstTotal,
    sgstTotal: invoice.sgstTotal,
    totalAmount: invoice.totalAmount,
    receivedAmount: invoice.receivedAmount,
    totalAmountWords: convertAmountToWords(invoice.totalAmount),
  };

  try {
    // Each category has its own invoice design: pharma uses the distributor
    // layout with batch/expiry columns, everything else keeps the original
    // retail invoice.
    //
    // The invoice's own stamped category wins over the business's current one.
    // An invoice is a historical document: switching category must not change
    // how already-issued invoices reprint. The fallback covers invoices created
    // before the category was stamped.
    const isPharma =
      normalizeCategory(
        invoice?.businessCategory ?? business?.business_category,
      ) === 'PHARMA';

    const selectedTemplate = isPharma
      ? pharmaTemplate(inv, busi, format)
      : format === 'A5'
        ? A5htmlTemplate(inv, busi)
        : htmlTemplate(inv, busi);

    const now = Date.now();
    const orientation =
      isPharma && pharmaNeedsLandscape(items) ? 'landscape' : 'portrait';
    const pageSize = PAGE_SIZES[format][orientation];

    const file = await RNHTMLtoPDF.generatePDF({
      html: selectedTemplate,
      fileName: `Invoice_${invoice.invoiceNumber || 1}_${format}_${now}`,
      base64: true,
      ...pageSize,
    });
    return file.filePath;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};

export const shareInvoicePDF = async (filePath: string) => {
  try {
    if (!filePath) {
      console.warn('❌ Cannot share: filePath is empty');
      return;
    }
    const shareUrl =
      Platform.OS === 'android' ? `file://${filePath}` : filePath;

    await Share.open({
      url: shareUrl,
      type: 'application/pdf',
      showAppsToView: true,
      failOnCancel: false,
    });
  } catch (error) {
    console.error('Share Error:', error);
  }
};
