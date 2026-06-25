import fs from "fs";
import { htmlTemplate } from "./htmlTemplate.js";

export const formatDate = (date) => {
  if (!date) return "NA";

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return "NA";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

const mockInvoice = {
  invoiceNumber: "INV-015-200000",
  invoiceDate: new Date(),
  dueDate: new Date(),
  customerName: "Rahul Traders",
  customerGST: "09ABCDE1234F1Z5",
  customerAddress: "Exhibition Road, Patna, Bihar",
  customerMobile: "9876543210",
  placeOfSupply: "Bihar",

  items: Array.from({ length: 21 }, (_, i) => ({
    productName: `Milk Product ${i + 1}`,
    quantity: 2,
    mrp: 100 + i * 5,
    rate: 90 + i * 5,
    taxRate: 5,
    taxAmount: (90 + i * 5) * 0.05,
    amount: (90 + i * 5) * 1.05,
  })),

  taxableAmount: 0, // optional for preview
  cgst: 0,
  sgst: 0,
  totalTax: 0,
  totalAmount: 0,
  receivedAmount: 0,
  totalAmountWords: "Rupees Two Thousand Only",
};

const mockBusiness = {
  name: "Sita Dairy",
  address: "Main Road, Patna",
  mobile: "9999999999",
  email: "info@sitadairy.com",
  gst_number: "10ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  bankName: "State Bank of India",
  accountNumber: "1234567890",
  ifsc: "SBIN0000123",
  upiId: "sitadairy@upi",
  qrCode:
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=sitadairy@upi",
};

const html = htmlTemplate(mockInvoice, mockBusiness);

fs.writeFileSync("invoice-preview.html", html);
console.log("invoice-preview.html generated");
