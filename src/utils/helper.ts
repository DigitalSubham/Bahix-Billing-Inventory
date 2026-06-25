import { Nullable } from '../types';

export const formatDate = (date?: string | Date | null): string => {
  if (!date) return 'N/A';

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

export const safe = (v: Nullable<string | number>): string => {
  return String(v ?? 'N/A');
};

export const format = (v: Nullable<number>): string => {
  const num = Number(v);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
};

export const currency = (v: Nullable<number> = 0): string => {
  const num = Number(v);
  if (!Number.isFinite(num)) return '₹0.00';

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatQuantity = (
  value: Nullable<string | number>,
  maximumFractionDigits: number = 2,
): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';

  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

export const simpleToCompound = (stock: string, conf: string) => {
  const quantity =
    (Number.parseFloat(String(stock)) || 0) / Number.parseFloat(String(conf));

  return formatQuantity(quantity);
};

export const compoundToSimple = (stock: string, conf: string) => {
  return String(
    (Number.parseFloat(String(stock)) || 0) * Number.parseFloat(String(conf)),
  );
};

export const getProductUnitLabel = (product: {
  unit?: string | null;
  baseUnit?: string | null;
}) => product.baseUnit || product.unit || 'PCS';

export const formatProductStock = (product: {
  stock?: string | number | null;
  unit?: string | null;
  baseUnit?: string | null;
  conversionFactor?: string | number | null;
  unitType?: string | null;
}) => {
  const stock = String(product.stock ?? '0');
  const unit = product.unit || product.baseUnit || 'PCS';
  const baseUnit = product.baseUnit || product.unit || 'PCS';

  if (product.unitType === 'COMPOUND') {
    return `${simpleToCompound(stock, String(product.conversionFactor ?? '1'))} ${unit} | ${stock} ${baseUnit}`;
  }

  return `${stock} ${baseUnit}`;
};
