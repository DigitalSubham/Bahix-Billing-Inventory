import { InvoiceItem } from '../types';

const round2 = (value: number) => Number((Number(value) || 0).toFixed(2));

/**
 * Line maths.
 *
 * The discount is a scheme percentage, which is how the trade negotiates it
 * and how the reference invoice computes: the taxable value comes from the
 * unrounded percentage, and the "Dis Amt" column shows the per-unit rupee
 * equivalent rounded for display. Deriving the rupee figure from a stored
 * percentage (rather than the reverse) keeps a line correct when its rate
 * changes.
 *
 * A reduced taxable value reduces the tax charged on the line.
 */
export const calculateItemAmount = (
  quantity: any,
  rate: any,
  taxRate: any,
  discountPercent: any = 0,
) => {
  const qty = Number(quantity) || 0;
  const unitRate = Number(rate) || 0;
  const baseAmount = qty * unitRate;

  const percent = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  const taxableAmount = round2(baseAmount * (1 - percent / 100));

  // Per-unit rupee discount, for the printed column.
  const discountAmount = round2(unitRate * (percent / 100));
  // What this line actually takes off the invoice.
  const discountTotal = round2(baseAmount - taxableAmount);

  const taxAmount = round2((taxableAmount * (Number(taxRate) || 0)) / 100);
  const totalAmount = round2(taxableAmount + taxAmount);

  return {
    baseAmount: round2(baseAmount),
    discountPercent: percent,
    discountAmount,
    discountTotal,
    taxableAmount,
    taxAmount,
    totalAmount,
  };
};

/**
 * Billed quantity and free quantity, summed across lines.
 * Printed as the "Totals c/o  154+42 PCS" row.
 */
export const calculateQuantityTotals = (items: InvoiceItem[]) => {
  let totalQuantity = 0;
  let totalFreeQuantity = 0;

  items.forEach(item => {
    totalQuantity += Number(item.quantity) || 0;
    totalFreeQuantity += Number(item.freeQty) || 0;
  });

  return {
    totalQuantity: round2(totalQuantity),
    totalFreeQuantity: round2(totalFreeQuantity),
  };
};

export const calculateInvoiceTotals = (
  items: InvoiceItem[],
  discount: string,
  discountType: 'PERCENTAGE' | 'FIXED-AMOUNT',
) => {
  let subtotal = 0;
  let totalTax = 0;
  let lineDiscountTotal = 0;
  let lineTaxableTotal = 0;

  items.forEach((item: InvoiceItem) => {
    const base = (Number(item.quantity) || 0) * (Number(item.sellingRate) || 0);
    const taxable = Number.isFinite(Number(item.taxableAmount))
      ? Number(item.taxableAmount)
      : base;

    subtotal += base;
    totalTax += Number(item.taxAmount) || 0;
    // What the line took off, derived from the values rather than the
    // per-unit figure shown in the Dis Amt column.
    lineDiscountTotal += base - taxable;
    lineTaxableTotal += taxable;
  });

  const parsedDiscount = Number(discount) || 0;

  let invoiceDiscount = 0;

  if (discountType === 'PERCENTAGE') {
    invoiceDiscount = (lineTaxableTotal * parsedDiscount) / 100;
  } else {
    invoiceDiscount = parsedDiscount;
  }

  // Prevent a negative taxable value
  invoiceDiscount = Math.min(Math.max(invoiceDiscount, 0), lineTaxableTotal);

  const taxableAmount = lineTaxableTotal - invoiceDiscount;

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  const totalAmount = taxableAmount + totalTax;

  return {
    subtotal: round2(subtotal),
    lineDiscountTotal: round2(lineDiscountTotal),
    // Total taken off the invoice: per-line discounts plus the invoice-level one.
    discountAmount: round2(lineDiscountTotal + invoiceDiscount),
    invoiceDiscountAmount: round2(invoiceDiscount),
    taxableAmount: round2(taxableAmount),
    cgstTotal: round2(cgst),
    sgstTotal: round2(sgst),
    totalAmount: round2(totalAmount),
  };
};

export const convertAmountToWords = (amount: number) => {
  if (amount == null || Number.isNaN(amount)) return '';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const convertToWords = (num: number): string => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
    if (num < 1000)
      return (
        ones[Math.floor(num / 100)] + ' Hundred ' + convertToWords(num % 100)
      );
    if (num < 100000)
      return (
        convertToWords(Math.floor(num / 1000)) +
        ' Thousand ' +
        convertToWords(num % 1000)
      );
    if (num < 10000000)
      return (
        convertToWords(Math.floor(num / 100000)) +
        ' Lakh ' +
        convertToWords(num % 100000)
      );
    return (
      convertToWords(Math.floor(num / 10000000)) +
      ' Crore ' +
      convertToWords(num % 10000000)
    );
  };

  const [rupees, paise] = Number(amount)?.toFixed(2).split('.');
  let result = convertToWords(Number.parseInt(rupees))?.trim();
  if (!result) result = 'Zero';
  result += ' Rupees';

  if (Number.parseInt(paise) > 0) {
    result += ' and ' + convertToWords(Number.parseInt(paise)) + ' Paise';
  }

  return result.trim();
};
