import { pharmaTemplate } from '../src/utils/pharmaTemplate';
import { htmlTemplate } from '../src/utils/htmlTemplate';
import { getVisibleItemColumns } from '../src/utils/invoiceColumns';
import { InvoiceItem } from '../src/types';

const mk = (over: Partial<InvoiceItem>): InvoiceItem => ({
  id: 'x', productId: 'p', productName: 'ITEM', quantity: 5, mrp: '99',
  sellingRate: '79.20', taxRate: '0', taxAmount: 0, amount: 258.9,
  taxableAmount: 258.9, discountPercent: 0, discountAmount: 0, freeQty: 0, unit: 'PCS', ...over,
});

const countTags = (html: string, tag: string) =>
  (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;

const bodyRows = (html: string) => {
  const tbody = html.split('<tbody>')[1].split('</tbody>')[0];
  return tbody.split('<tr').slice(1).map(r => countTags('<' + r, 'td'));
};

describe('rendered table structure', () => {
  it('header cell count matches every body row (general)', () => {
    const items = [mk({}), mk({ id: 'y' })];
    const html = pharmaTemplate({ items, totalAmount: 500 }, { name: 'Biz' });
    const expected = getVisibleItemColumns(items).length;

    expect(countTags(html, 'th')).toBe(expected);
    const rows = bodyRows(html);
    // last row is the totals row: 2 cells, one of them spanning the rest
    expect(rows.slice(0, -1).every(n => n === expected)).toBe(true);
    expect(rows[rows.length - 1]).toBe(2);
  });

  it('header cell count matches every body row (pharma, 15 cols)', () => {
    const items = [
      mk({ hsnCode: '40141010', batchNo: 'A9JLZ026', expDate: 'Apr-2029', mfgBy: 'MS PENTA L', freeQty: 3, discountPercent: 34.62 }),
      mk({ id: 'y', hsnCode: '40141010', batchNo: 'E7JLZ044', expDate: 'May-2029', mfgBy: 'MS PENTA L', freeQty: 0, discountPercent: 0 }),
    ];
    const html = pharmaTemplate({ items, totalAmount: 500 }, { name: 'Biz' });
    const expected = getVisibleItemColumns(items).length;

    expect(expected).toBe(15);
    expect(countTags(html, 'th')).toBe(15);
    const rows = bodyRows(html);
    expect(rows.slice(0, -1)).toEqual([15, 15]);
  });

  it('colspan on the totals row covers the table width', () => {
    const items = [mk({ batchNo: 'B1' })];
    const html = pharmaTemplate({ items, totalAmount: 1 }, { name: 'B' });
    const n = getVisibleItemColumns(items).length;
    expect(html).toContain(`colspan="${n - 1}"`);
  });

  it('switches to landscape only past 11 columns', () => {
    const narrow = [mk({})];
    const wide = [mk({ hsnCode: 'H', batchNo: 'B', expDate: 'E', mfgBy: 'M', freeQty: 1, discountPercent: 1 })];
    expect(pharmaTemplate({ items: narrow }, {})).toContain('size: A4 portrait');
    expect(pharmaTemplate({ items: wide }, {})).toContain('size: A4 landscape');
  });

  it('A5 uses the A5 page size', () => {
    expect(pharmaTemplate({ items: [mk({})] }, {}, 'A5')).toContain('148mm 210mm');
  });

  it('hides the bank block when no bank details are set', () => {
    const withBank = pharmaTemplate({ items: [mk({})] }, { name: 'B', bankName: 'HDFC' });
    const without = pharmaTemplate({ items: [mk({})] }, { name: 'B' });
    expect(withBank).toContain('Bank &amp; Payment');
    expect(without).not.toContain('Bank &amp; Payment');
  });

  it('omits empty header fields instead of printing N/A', () => {
    const html = pharmaTemplate({ items: [mk({})], customerName: 'ACME' }, { name: 'B' });
    expect(html).not.toContain('N/A');
    expect(html).toContain('ACME');
  });
});

describe('general category keeps its original invoice', () => {
  const items = [mk({ hsnCode: '3208', unit: 'BOX' })];

  it('renders the pre-existing 7-column retail table, not the pharma one', () => {
    const html = htmlTemplate({ items, totalAmount: 500 }, { name: 'Biz' });

    // the original design
    expect(html).toContain('BILL TO');
    expect(html).toContain('SHIP TO');
    expect(html).toContain('>ITEM<');
    expect(html).toContain('>QTY<');
    expect(html).toContain('>AMOUNT<');

    // and none of the pharma layout
    expect(html).not.toContain('Details of Supplier (From)');
    expect(html).not.toContain('Details of Consignee (To)');
    expect(html).not.toContain('Original Copy');
    expect(html).not.toContain('Batch No.');
    expect(html).not.toContain('Terms &amp; Conditions');
  });

  it('is byte-for-byte the template that shipped before this change', () => {
    const { execSync } = require('child_process');
    const original = execSync('git show HEAD:src/utils/htmlTemplate.ts').toString();
    const current = require('fs').readFileSync('src/utils/htmlTemplate.ts', 'utf8');
    expect(current).toBe(original);
  });

  it('A5 general is also the original template', () => {
    const { execSync } = require('child_process');
    const original = execSync('git show HEAD:src/utils/a5.ts').toString();
    const current = require('fs').readFileSync('src/utils/a5.ts', 'utf8');
    expect(current).toBe(original);
  });
});
