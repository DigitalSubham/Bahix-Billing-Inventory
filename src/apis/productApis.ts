import axios from './axiosInstance';
import { fetchPaginatedList } from './pagination';
import { PaginationParams, ProductType } from '../types';

const normalizeProduct = (product: any): ProductType => ({
  ...product,
  rate: String(product.rate ?? product.selling_rate ?? ''),
  mrp: String(product.mrp ?? ''),
  taxRate: String(product.taxRate ?? product.tax_percent ?? '0.00'),
  stock: String(product.stock ?? '0'),
  unit: product.unit ?? product.base_unit ?? product.baseUnit ?? 'PCS',
  baseUnit: product.baseUnit ?? product.base_unit ?? product.unit ?? 'PCS',
  conversionFactor: String(
    product.conversionFactor ?? product.conversion_factor ?? '1',
  ),
  unitType: product.unitType ?? product.unit_type ?? 'SIMPLE',
  minStock: product.minStock ?? product.min_stock,
  barcode: product.barcode ?? product.sku ?? '',
  hsnCode: product.hsnCode ?? product.hsn_code ?? '',
  batchNo: product.batchNo ?? product.batch_no ?? '',
  expDate: product.expDate ?? product.exp_date ?? '',
  mfgBy: product.mfgBy ?? product.mfg_by ?? '',
});

const pickProducts = (payload: any): ProductType[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.products)) {
    return payload.products;
  }

  return [];
};

const normalizeProducts = (products: any) =>
  pickProducts(products).map(product => normalizeProduct(product));

export const fetchProducts = () =>
  axios.get('/products').then(res => normalizeProducts(res.data));

export const fetchProductsPage = (params?: PaginationParams) =>
  fetchPaginatedList<ProductType>('/products', params).then(page => ({
    ...page,
    items: normalizeProducts(page.items),
  }));

export const fetchProductById = (id: string) =>
  axios.get(`/products/${id}`).then(res => normalizeProduct(res.data));

export const createProduct = (data: any) =>
  axios.post('/products', data).then(res => normalizeProduct(res.data));

export const updateProduct = (id: string, data: any) =>
  axios.put(`/products/${id}`, data).then(res => normalizeProduct(res.data));

export const deleteProduct = (id: string) =>
  axios.delete(`/products/${id}`).then(res => res.data);
