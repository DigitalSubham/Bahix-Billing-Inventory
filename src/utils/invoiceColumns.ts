import { InvoiceItem } from '../types';
import { format, safe } from './helper';

export interface ItemColumn {
  key: string;
  label: string;
  align: 'left' | 'right' | 'center';
  /** Percentage width used when this column is part of the rendered set. */
  weight: number;
  value: (item: InvoiceItem, index: number) => string;
  /**
   * Omitted: the column is always rendered.
   * Present: the column is rendered only when at least one line satisfies it.
   */
  hasData?: (item: InvoiceItem) => boolean;
}

const text = (value: unknown) => {
  const str = value === null || value === undefined ? '' : String(value);
  return str.trim();
};

const num = (value: unknown) => Number(value) || 0;

/** A rate of zero is shown the way the trade prints it, not as "0%". */
export const formatGstRate = (taxRate: unknown) => {
  const rate = num(taxRate);
  return rate === 0 ? 'Exempt' : `${format(rate)}%`;
};

const lineTaxable = (item: InvoiceItem) => {
  const explicit = Number(item.taxableAmount);
  if (Number.isFinite(explicit) && explicit !== 0) return explicit;
  const base = num(item.quantity) * num(item.sellingRate);
  return base * (1 - num(item.discountPercent) / 100);
};

/**
 * Full column set in printed order. Optional columns drop out when no line
 * carries that data, so a general-retail invoice stays narrow and a pharma
 * invoice grows — without either template knowing about categories.
 */
export const ITEM_COLUMNS: ItemColumn[] = [
  {
    key: 'no',
    label: 'No',
    align: 'center',
    weight: 3,
    value: (_item, index) => String(index + 1),
  },
  {
    key: 'description',
    label: 'Description of Goods',
    align: 'left',
    weight: 22,
    value: item => safe(item.productName),
  },
  {
    key: 'hsn',
    label: 'HSN',
    align: 'center',
    weight: 7,
    hasData: item => text(item.hsnCode).length > 0,
    value: item => text(item.hsnCode),
  },
  {
    key: 'batchNo',
    label: 'Batch No.',
    align: 'center',
    weight: 8,
    hasData: item => text(item.batchNo).length > 0,
    value: item => text(item.batchNo),
  },
  {
    key: 'expDate',
    label: 'Exp Dt.',
    align: 'center',
    weight: 7,
    hasData: item => text(item.expDate).length > 0,
    value: item => text(item.expDate),
  },
  {
    key: 'mfgBy',
    label: 'Mfg. By',
    align: 'left',
    weight: 10,
    hasData: item => text(item.mfgBy).length > 0,
    value: item => text(item.mfgBy),
  },
  {
    key: 'quantity',
    label: 'Qty',
    align: 'right',
    weight: 5,
    value: item => format(num(item.quantity)),
  },
  {
    key: 'freeQty',
    label: 'Free',
    align: 'right',
    weight: 5,
    hasData: item => num(item.freeQty) > 0,
    value: item => format(num(item.freeQty)),
  },
  {
    key: 'unit',
    label: 'UOM',
    align: 'center',
    weight: 5,
    hasData: item => text(item.unit || item.baseUnit).length > 0,
    value: item => text(item.unit || item.baseUnit),
  },
  {
    key: 'mrp',
    label: 'MRP',
    align: 'right',
    weight: 7,
    hasData: item => num(item.mrp) > 0,
    value: item => format(num(item.mrp)),
  },
  {
    key: 'sellingRate',
    label: 'Rate',
    align: 'right',
    weight: 7,
    value: item => format(num(item.sellingRate)),
  },
  {
    // Driven by the stored percentage; prints the per-unit rupee equivalent.
    key: 'discountAmount',
    label: 'Dis Amt',
    align: 'right',
    weight: 7,
    hasData: item =>
      num(item.discountPercent) > 0 || num(item.discountAmount) > 0,
    value: item => format(num(item.discountAmount)),
  },
  {
    key: 'taxableAmount',
    label: 'Taxable Amt',
    align: 'right',
    weight: 9,
    value: item => format(lineTaxable(item)),
  },
  {
    key: 'taxRate',
    label: 'GST%',
    align: 'center',
    weight: 6,
    value: item => formatGstRate(item.taxRate),
  },
  {
    key: 'amount',
    label: 'Amt(Rs.)',
    align: 'right',
    weight: 9,
    value: item => format(num(item.amount)),
  },
];

/** The columns worth printing for this particular set of lines. */
export const getVisibleItemColumns = (
  items: InvoiceItem[] = [],
): ItemColumn[] =>
  ITEM_COLUMNS.filter(
    column => !column.hasData || items.some(item => column.hasData!(item)),
  );

/** Column widths as percentages that add up to 100. */
export const getColumnWidths = (columns: ItemColumn[]): number[] => {
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0);
  if (totalWeight <= 0) return columns.map(() => 0);
  return columns.map(column => (column.weight / totalWeight) * 100);
};
