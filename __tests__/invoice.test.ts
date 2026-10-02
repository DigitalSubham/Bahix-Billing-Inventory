import {
  calculateItemAmount,
  calculateInvoiceTotals,
  calculateQuantityTotals,
} from '../src/utils/calculations';
import {
  getVisibleItemColumns,
  getColumnWidths,
  formatGstRate,
} from '../src/utils/invoiceColumns';
import { pharmaTemplate, pharmaNeedsLandscape } from '../src/utils/pharmaTemplate';
import { InvoiceItem } from '../src/types';

const line = (over: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: 'l1',
  productId: 'p1',
  productName: 'MANFORCE CONDOM CHOCOLATE+',
  quantity: 10,
  mrp: '30.00',
  sellingRate: '24.00',
  taxRate: '0',
  taxAmount: 0,
  amount: 240,
  taxableAmount: 240,
  discountPercent: 0,
  discountAmount: 0,
  freeQty: 0,
  unit: 'PCS',
  ...over,
});

describe('line maths', () => {
  it('matches an exempt line from the reference invoice', () => {
    // Row 1: Qty 10, Rate 24.00, no discount, Exempt -> Taxable 240.00
    const calc = calculateItemAmount(10, '24.00', '0', 0);
    expect(calc.taxableAmount).toBe(240);
    expect(calc.taxAmount).toBe(0);
    expect(calc.totalAmount).toBe(240);
  });

  it('charges tax on the value left after the scheme discount', () => {
    // 10 x 100 = 1000, less 10% = 900 taxable, 5% GST = 45 tax
    const calc = calculateItemAmount(10, '100', '5', 10);
    expect(calc.taxableAmount).toBe(900);
    expect(calc.discountAmount).toBe(10); // per unit
    expect(calc.discountTotal).toBe(100);
    expect(calc.taxAmount).toBe(45);
    expect(calc.totalAmount).toBe(945);
  });

  it('clamps the discount rate to 100%', () => {
    const calc = calculateItemAmount(2, '50', '5', 999);
    expect(calc.discountPercent).toBe(100);
    expect(calc.taxableAmount).toBe(0);
    expect(calc.totalAmount).toBe(0);
  });

  /**
   * Every discounted row of the reference invoice, at one scheme rate.
   * These are the numbers that proved the discount is a percentage rather
   * than a flat per-line or per-unit rupee amount.
   */
  describe.each([
    ['row 6', 5, '79.20', 27.42, 258.9],
    ['row 8', 6, '79.20', 27.42, 310.69],
    ['row 12', 5, '120.00', 41.54, 392.28],
    ['row 14', 7, '120.00', 41.54, 549.19],
  ])('reference invoice %s', (_label, qty, rate, disAmt, taxable) => {
    it(`reproduces Dis Amt ${disAmt} and Taxable ${taxable} at 34.62%`, () => {
      const calc = calculateItemAmount(qty, rate, '0', 34.62);
      expect(calc.discountAmount).toBe(disAmt);
      expect(calc.taxableAmount).toBe(taxable);
    });
  });

  it('treats junk input as zero rather than NaN', () => {
    const calc = calculateItemAmount(undefined, 'abc', null, undefined);
    expect(calc.taxableAmount).toBe(0);
    expect(calc.totalAmount).toBe(0);
    expect(Number.isNaN(calc.totalAmount)).toBe(false);
  });
});

describe('quantity totals', () => {
  it('sums billed and free quantities separately', () => {
    const totals = calculateQuantityTotals([
      line({ quantity: 10, freeQty: 3 }),
      line({ id: 'l2', quantity: 20, freeQty: 6 }),
      line({ id: 'l3', quantity: 5, freeQty: 0 }),
    ]);
    expect(totals.totalQuantity).toBe(35);
    expect(totals.totalFreeQuantity).toBe(9);
  });
});

describe('invoice totals', () => {
  it('rolls line discounts into the invoice discount', () => {
    const items = [
      line({ discountPercent: 10, discountAmount: 10, taxableAmount: 900, taxAmount: 45, amount: 945, quantity: 10, sellingRate: '100', taxRate: '5' }),
    ];
    const totals = calculateInvoiceTotals(items, '0', 'FIXED-AMOUNT');

    expect(totals.subtotal).toBe(1000);
    expect(totals.lineDiscountTotal).toBe(100);
    expect(totals.taxableAmount).toBe(900);
    expect(totals.totalAmount).toBe(945);
  });

  it('applies an invoice-level percentage on top of line discounts', () => {
    const items = [
      line({ discountPercent: 10, discountAmount: 10, taxableAmount: 900, taxAmount: 45, quantity: 10, sellingRate: '100', taxRate: '5' }),
    ];
    const totals = calculateInvoiceTotals(items, '10', 'PERCENTAGE');

    expect(totals.invoiceDiscountAmount).toBe(90); // 10% of 900
    expect(totals.discountAmount).toBe(190); // 100 line + 90 invoice
    expect(totals.taxableAmount).toBe(810);
    expect(totals.totalAmount).toBe(855); // 810 + 45 tax
  });

  it('splits tax evenly into CGST and SGST', () => {
    const items = [line({ taxAmount: 45, taxableAmount: 900, quantity: 10, sellingRate: '100' })];
    const totals = calculateInvoiceTotals(items, '0', 'FIXED-AMOUNT');
    expect(totals.cgstTotal).toBe(22.5);
    expect(totals.sgstTotal).toBe(22.5);
  });
});

describe('data-driven columns', () => {
  it('shows a narrow table for a general-retail invoice', () => {
    const columns = getVisibleItemColumns([line()]);
    const keys = columns.map(c => c.key);

    expect(keys).not.toContain('batchNo');
    expect(keys).not.toContain('expDate');
    expect(keys).not.toContain('freeQty');
    expect(keys).toContain('description');
    expect(keys).toContain('taxableAmount');
    expect(pharmaNeedsLandscape([line()])).toBe(false);
  });

  it('grows to the pharma column set when the lines carry that data', () => {
    const pharma = [
      line({
        hsnCode: '40141010',
        batchNo: 'A9JLZ026',
        expDate: 'Apr-2029',
        mfgBy: 'MS PENTA L',
        freeQty: 3,
        discountAmount: 27.42,
      }),
    ];
    const keys = getVisibleItemColumns(pharma).map(c => c.key);

    expect(keys).toEqual([
      'no',
      'description',
      'hsn',
      'batchNo',
      'expDate',
      'mfgBy',
      'quantity',
      'freeQty',
      'unit',
      'mrp',
      'sellingRate',
      'discountAmount',
      'taxableAmount',
      'taxRate',
      'amount',
    ]);
    expect(pharmaNeedsLandscape(pharma)).toBe(true);
  });

  it('keeps column widths adding up to 100%', () => {
    const widths = getColumnWidths(getVisibleItemColumns([line({ batchNo: 'X' })]));
    const sum = widths.reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(100);
  });

  it('prints a zero GST rate the way the trade does', () => {
    expect(formatGstRate(0)).toBe('Exempt');
    expect(formatGstRate('0')).toBe('Exempt');
    expect(formatGstRate(5)).toBe('5.00%');
  });
});

describe('template', () => {
  const business = {
    name: 'KASERA AND COMPANY',
    address: 'Chowk, Patna city, Patna-800001',
    fssaiNo: '10416000000820',
    dlNo: '20B-234/21B-234A',
    gst_number: '10AACFK8132F1ZW',
    mobile: '9334037625',
    jurisdiction: 'PATNA',
  };

  const invoice = {
    invoiceNumber: 25,
    invoiceDate: '08/09/2026',
    customerName: 'PATNA MEDICAL HALL',
    customerAddress: 'MAHENDRU law college',
    customerStateLabel: 'Bihar (10)',
    customerBeat: 'Sundry Debtors',
    customerMobile: '8434054327',
    items: [line({ hsnCode: '40141010', batchNo: 'A9JLZ026', expDate: 'Apr-2029', freeQty: 3 })],
    totalQuantity: 10,
    totalFreeQuantity: 3,
    primaryUnit: 'PCS',
    totalAmount: 240,
    taxableAmount: 240,
    cgstTotal: 0,
    sgstTotal: 0,
    subtotal: 240,
    totalAmountWords: 'Two Hundred Forty Rupees',
  };

  it('renders the supplier, consignee and invoice boxes', () => {
    const html = pharmaTemplate(invoice, business);

    expect(html).toContain('Details of Supplier (From)');
    expect(html).toContain('Details of Consignee (To)');
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('Original Copy');
    expect(html).toContain('KASERA AND COMPANY');
    expect(html).toContain('PATNA MEDICAL HALL');
    expect(html).toContain('10416000000820'); // FSSAI
    expect(html).toContain('20B-234/21B-234A'); // D.L.No.
    expect(html).toContain('Bihar (10)');
    expect(html).toContain('Sundry Debtors'); // BEAT
  });

  it('renders the batch columns and the totals row', () => {
    const html = pharmaTemplate(invoice, business);

    expect(html).toContain('Batch No.');
    expect(html).toContain('A9JLZ026');
    expect(html).toContain('Apr-2029');
    expect(html).toContain('Exempt');
    expect(html).toContain('10.00+3.00'); // qty + free on the totals row
    expect(html).toContain('PCS');
  });

  it('prints the terms and jurisdiction', () => {
    const html = pharmaTemplate(invoice, business);

    expect(html).toContain('Goods once sold will not be taken back');
    expect(html).toContain("Subject to 'PATNA' Jurisdiction only");
    expect(html).toContain('Authorised Signatory');
    expect(html).toContain('Amount in Words');
  });

  it('omits the jurisdiction clause when none is configured', () => {
    const html = pharmaTemplate(invoice, { ...business, jurisdiction: '' });
    expect(html).toContain('E &amp; O. E.');
    expect(html).not.toContain('Jurisdiction only');
  });

  it('escapes values instead of letting them break the markup', () => {
    const html = pharmaTemplate(
      { ...invoice, customerName: '<script>x</script>' },
      business,
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('survives an invoice with no items', () => {
    const html = pharmaTemplate({ ...invoice, items: [] }, business);
    expect(html).toContain('No items');
  });
});
