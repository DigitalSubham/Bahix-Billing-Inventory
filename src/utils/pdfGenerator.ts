import * as RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Platform } from 'react-native';
import { htmlTemplate } from './htmlTemplate';
import { A5htmlTemplate } from './a5';
import { convertAmountToWords } from './calculations';
import { formatDate } from './helper';

export type InvoicePdfFormat = 'A4' | 'A5';

export const generateInvoicePDF = async (
  invoice: any,
  business: any,
  qrcode: any,
  format: InvoicePdfFormat = 'A4',
) => {
  const busi = {
    name: business.name,
    address: business.address,
    mobile: business.mobile,
    email: business.email,
    gst_number: business.gst_number,
    pan: business.pan_number,
    bankName: business.bank,
    ifsc: business.ifsc,
    accountNumber: business.account_no,
    upiId: business.upi_id,
    qrCode: qrcode,
  };

  const inv = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    dueDate: formatDate(invoice.dueDate),

    customerName: invoice.customer.name,
    customerAddress: invoice.customer.address,
    customerGST:
      invoice.customer.gst_number || invoice.customer.gstNumber || 'N/A',
    customerMobile: invoice.customer.mobile,
    placeOfSupply: invoice.customer.address,

    items: invoice.items,

    taxableAmount: Number(
      invoice.taxableAmount ||
        Number(invoice.totalAmount) - Number(invoice.totalTax),
    ).toFixed(2),
    cgstTotal: invoice.cgstTotal,
    sgstTotal: invoice.sgstTotal,
    totalTax:
      Number(invoice.totalAmount) -
      Number(
        invoice.taxableAmount ||
          Number(invoice.totalAmount) - Number(invoice.totalTax),
      ),
    subtotal: invoice.subtotal,
    totalAmount: invoice.totalAmount,
    receivedAmount: invoice.receivedAmount,
    discountAmount: Number(invoice?.discountAmount || 0).toFixed(2),
    totalAmountWords: convertAmountToWords(invoice.totalAmount),
  };

  try {
    const selectedTemplate =
      format === 'A5' ? A5htmlTemplate(inv, busi) : htmlTemplate(inv, busi);
    const now = Date.now();
    const pageSize =
      format === 'A5'
        ? { width: 420, height: 595 } // A5 at 72 DPI
        : { width: 595, height: 842 }; // A4 at 72 DPI

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
