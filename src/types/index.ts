import { BusinessCategory } from '../constants/categoryFields';

export type DatePickerType = 'invoice' | 'due';
export enum formTypeEnum {
  ADD = 'add',
  EDIT = 'edit',
  VIEW = 'view',
}
export type Nullable<T> = T | null | undefined;

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface FormErrors {
  name?: string;
  mobile?: string;
  email?: string;
  gst_number?: string;
  pincode?: string;
}

export type UserRole = 'admin' | 'sales' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  permissions?: string[];
}

export interface CustomerBaseType {
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  gstNumber?: string;
  placeOfSupply: string;
  customerType: string;
  creditLimit: string;
  notes: string;
  // Category-specific (PHARMA); optional for every other category.
  dlNo?: string;
  fssaiNo?: string;
  uid?: string;
  stateCode?: string;
  beat?: string;
}

export interface CustomerType extends CustomerBaseType {
  id: string;
}

export interface Business {
  id: string;
  name: string;
  address: string;
  mobile: string;
  email?: string;
  gst_number?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  upiId?: string;
  logo?: string;
  businessCategory?: BusinessCategory;
  // Category-specific (PHARMA); optional for every other category.
  fssaiNo?: string;
  dlNo?: string;
  jurisdiction?: string;
}

export interface ProductFormErrors {
  name?: string;
  mrp?: string;
  rate?: string;
  taxRate?: string;
  stock?: string;
  conversionFactor?: string;
  unit?: string;
}

export interface ProductBaseType {
  name: string;
  description?: string;
  mrp: string;
  category: string;
  rate: string;
  taxRate: string;
  unit: string;
  stock: string;
  minStock?: number;
  barcode?: string;
  hsnCode?: string;
  baseUnit: string;
  conversionFactor: string;
  unitType: 'SIMPLE' | 'COMPOUND';
  // Category-specific (PHARMA) defaults copied onto an invoice line when the
  // product is added; editable per line afterwards.
  batchNo?: string;
  expDate?: string;
  mfgBy?: string;
}

export interface ProductType extends ProductBaseType {
  id: string;
}

export interface InvoiceItem {
  /**
   * Identifies the line, not the product. The same product can appear on
   * several lines (different batch, expiry or rate), so every lookup and
   * update is keyed by this, never by productId.
   */
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  mrp: string;
  sellingRate: string;
  taxRate: string;
  taxAmount: number;
  amount: number;
  /** qty * rate, less the scheme discount; the value tax is charged on. */
  taxableAmount: number;
  /**
   * The negotiated scheme rate. This is what the user enters and what is
   * stored; everything else about the discount is derived from it.
   */
  discountPercent: number;
  /** Derived per-unit rupee discount, printed in the "Dis Amt" column. */
  discountAmount: number;
  /** Goods given free with the line: billed at zero, still leaves stock. */
  freeQty: number;
  hsnCode?: string;
  unitType?: 'SIMPLE' | 'COMPOUND';
  unit?: string;
  baseUnit?: string;
  conversionFactor?: string;
  stockInBase?: string;
  qtyInputUnit?: 'COMPOUND' | 'BASE';
  // Category-specific (PHARMA).
  batchNo?: string;
  expDate?: string;
  mfgBy?: string;
}

export interface InvoiceBase {
  totalTax?: number;
  invoiceNumber?: number;
  customer: CustomerType;
  items: InvoiceItem[];
  subtotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal?: number;
  totalAmount: number;
  receivedAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  createdAt?: Date;
  discountAmount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED-AMOUNT';
  /**
   * The category this invoice was ISSUED under, stamped at creation.
   * The PDF uses it rather than the business's current category, so an
   * invoice always reprints in the layout the customer received.
   */
  businessCategory?: BusinessCategory;
}

export interface InvoiceForm {
  recievedAmount: string;
  invoiceDate: Date;
  dueDate: Date;
  discount: string;
  discountType: 'PERCENTAGE' | 'FIXED-AMOUNT';
}

export interface InvoiceType extends InvoiceBase {
  id?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
}

export type { BusinessCategory };

export interface DashboardStats {
  totalSales: number;
  totalInvoices: number;
  pendingAmount: number;
  lowStockItems: number;
  todaySales: number;
  monthSales: number;
}

export interface SalesData {
  date: string;
  amount: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  OTPVerification: { phoneNumber: string };
  Dashboard: undefined;
  ProductList: undefined;
  ProductForm: { productId?: string; formType: formTypeEnum };
  CustomerList: undefined;
  CustomerForm: { customerId?: string; formType: formTypeEnum };
  InvoiceList: undefined;
  CreateInvoice: undefined;
  InvoicePreview: {
    invoice: InvoiceType | InvoiceBase;
    formType: formTypeEnum;
  };
  InvoiceDetails: { invoiceId: string };
  BusinessSettings: undefined;
  Profile: undefined;
  UserManagement: undefined;
  Settings: undefined;
  SettingsHome: undefined;
  UserForm: { userId?: string; formType: formTypeEnum };
  UserList: undefined;
};
