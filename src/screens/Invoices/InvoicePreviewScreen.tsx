import { ScrollView, Alert, View, StyleSheet } from 'react-native';
import { Button, Divider, Card, Text, Portal, Modal } from 'react-native-paper';
import {
    generateInvoicePDF,
    shareInvoicePDF,
    InvoicePdfFormat,
} from '../../utils/pdfGenerator';
import { convertAmountToWords } from '../../utils/calculations';
import { formTypeEnum, InvoiceBase, InvoiceType } from '../../types';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfileApi } from '../../apis/authApi';
import { createInvoices } from '../../apis/InvoiceApis';
import { QrGenerator } from '../../utils/generateQrBase64';
import { formatDate } from '../../utils/helper';

interface InvoicePreviewProps {
    navigation: any;
    route: {
        params: {
            invoice: InvoiceBase | InvoiceType;
            formType: formTypeEnum;
        };
    };
}

export const InvoicePreviewScreen: React.FC<InvoicePreviewProps> = ({
    navigation,
    route,
}) => {
    const { invoice, formType } = route.params;
    const [isSaved, setIsSaved] = useState(false);
    const { data: business } = useQuery({
        queryKey: ['business'],
        queryFn: getProfileApi,

    })
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [showPdfFormatModal, setShowPdfFormatModal] = useState(false);
    const queryClient = useQueryClient();
    const generateInvoice = useMutation({
        mutationFn: (payload: any) => createInvoices(payload),
        onSuccess: (data) => {
            if (data.data.invoice_number) {
                invoice.invoiceNumber = data.data.invoice_number;
            }
            setIsSaved(true);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            Alert.alert('Success', 'Invoice saved successfully');
        },
        onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to save invoice');
        },
    })
    const handleSaveInvoice = () => {
        const payload = {
            customer_id: invoice.customer.id,
            invoice_type: "sale",
            invoice_date: invoice.invoiceDate,
            due_date: invoice.dueDate,
            payment_status: invoice.status,
            items: invoice.items.map(item => ({
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                selling_rate: item.sellingRate,
                tax_percent: item.taxRate,
                tax_amount: item.taxAmount,
                line_total: item.amount,
                cgst: Number(item.taxAmount) / 2,
                sgst: Number(item.taxAmount) / 2,
                igst: Number(item.taxAmount),
                hsn: item.hsnCode || null,
                unit: item.unit || item.baseUnit || null,
                mrp: Number(item.mrp) || null,
                batch_no: item.batchNo || null,
                exp_date: item.expDate || null,
                mfg_by: item.mfgBy || null,
                free_qty: Number(item.freeQty) || 0,
                discount_percent: Number(item.discountPercent) || 0,
                discount_amount: Number(item.discountAmount) || 0,
                taxable_amount: Number(item.taxableAmount) || 0,
            })),
            subtotal: invoice.subtotal,
            total_tax: invoice.cgstTotal + invoice.sgstTotal,
            cgst_total: invoice.cgstTotal,
            sgst_total: invoice.sgstTotal,
            igst_total: invoice.cgstTotal + invoice.sgstTotal,
            total_amount: invoice.totalAmount,
            received_amount: invoice.receivedAmount,
            discount_amnt: invoice.discountAmount,
            discount_type: invoice.discountType,
            notes: "Thank You",
        }
        generateInvoice.mutate(payload);
    };

    const generateAndSharePDF = async (format: InvoicePdfFormat) => {
        try {
            setGenerating(true);
            const filePath = await generateInvoicePDF(invoice, business, qrBase64, format);
            await shareInvoicePDF(filePath);
        } catch (error) {
            Alert.alert('Error', `Failed to generate ${format} PDF`);
        } finally {
            setGenerating(false);
        }
    };

    const handleGeneratePDF = async () => {
        if (!isSaved && formType !== formTypeEnum.EDIT) {
            Alert.alert(
                'Save Required',
                'Please save the invoice before sharing PDF'
            );
            return;
        }

        setShowPdfFormatModal(true);
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.previewContainer}>
                {/* Business Header */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="headlineMedium" style={styles.businessName}>
                            {business?.name}
                        </Text>
                        <Text variant="bodySmall" style={styles.businessInfo}>
                            {business?.address}
                        </Text>
                        <Text variant="bodySmall" style={styles.businessInfo}>
                            Mobile: {business?.mobile}
                        </Text>
                        {business?.email && (
                            <Text variant="bodySmall" style={styles.businessInfo}>
                                Email: {business?.email}
                            </Text>
                        )}
                        {business?.gst_number && (
                            <Text variant="bodySmall" style={styles.businessInfo}>
                                GSTIN: {business?.gst_number}
                            </Text>
                        )}
                    </Card.Content>
                </Card>

                {/* Invoice Details */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.invoiceTitle}>
                            TAX INVOICE
                        </Text>
                        <View style={styles.detailRow}>
                            <Text variant="bodyMedium">Invoice No:</Text>
                            <Text variant="bodyMedium" style={[styles.detailValue, styles.highlight]}>
                                {invoice?.invoiceNumber || "N/A"}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text variant="bodyMedium">Invoice Date:</Text>
                            <Text variant="bodyMedium" style={styles.detailValue}>
                                {formatDate(invoice.invoiceDate) || "N/A"}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text variant="bodyMedium">Due Date:</Text>
                            <Text variant="bodyMedium" style={styles.detailValue}>
                                {formatDate(invoice.dueDate) || "N/A"}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Customer Details */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            BILL TO
                        </Text>
                        <Text variant="bodyLarge">Name: {invoice.customer.name}</Text>
                        {!!invoice.customer.address && (
                            <Text variant="bodySmall" style={styles.customerInfo}>
                                address:  {invoice.customer.address || "N/A"}
                            </Text>
                        )}
                        <Text variant="bodySmall" style={styles.customerInfo}>
                            Mobile: {invoice.customer.mobile || "N/A"}
                        </Text>
                        <Text variant="bodySmall" style={styles.customerInfo}>
                            GSTIN: {invoice.customer.gst_number || invoice.customer.gstNumber || "N/A"}
                        </Text>
                    </Card.Content>
                </Card>

                {/* Items */}
                <Card style={styles.card}>
                    <Card.Content>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator
                            contentContainerStyle={styles.itemsTableContainer}
                        >
                            <View>
                                <View style={styles.itemsHeaderRow}>
                                    <Text style={[styles.colItem, styles.headerText]}>Item</Text>
                                    <Text style={[styles.colQty, styles.headerText, styles.alignRight]}>Qty</Text>
                                    <Text style={[styles.colRate, styles.headerText, styles.alignRight]}>Rate</Text>
                                    <Text style={[styles.colTax, styles.headerText, styles.alignRight]}>Tax</Text>
                                    <Text style={[styles.colAmount, styles.headerText, styles.alignRight]}>Amount</Text>
                                </View>

                                {invoice.items.map((item, index) => (
                                    <View key={index} style={styles.itemRow}>
                                        <View style={styles.colItem}>
                                            <Text
                                                variant="bodyMedium"
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                                style={styles.itemName}
                                            >
                                                {item.productName}
                                            </Text>
                                            <Text variant="bodySmall" style={styles.itemSubtext}>
                                                Tax: {item.taxRate || "0.00"}%
                                                {!!item.hsnCode && ` | HSN: ${item.hsnCode}`}
                                            </Text>
                                            {(!!item.batchNo || !!item.expDate || !!item.mfgBy) && (
                                                <Text variant="bodySmall" style={styles.itemSubtext}>
                                                    {[
                                                        item.batchNo && `Batch: ${item.batchNo}`,
                                                        item.expDate && `Exp: ${item.expDate}`,
                                                        item.mfgBy,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' | ')}
                                                </Text>
                                            )}
                                            {Number(item.discountPercent) > 0 && (
                                                <Text variant="bodySmall" style={styles.itemSubtext}>
                                                    Discount: {Number(item.discountPercent)}% (₹
                                                    {Number(item.discountAmount).toFixed(2)}/unit)
                                                </Text>
                                            )}
                                        </View>
                                        <Text numberOfLines={1} style={[styles.colQty, styles.cellValue, styles.alignRight]}>
                                            {Number(item.freeQty) > 0
                                                ? `${item.quantity}+${item.freeQty}`
                                                : item.quantity}
                                        </Text>
                                        <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.colRate, styles.cellValue, styles.alignRight]}>₹{item.sellingRate}</Text>
                                        <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.colTax, styles.cellValue, styles.alignRight]}>₹{item.taxAmount}</Text>
                                        <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.colAmount, styles.cellValue, styles.alignRight]}>
                                            ₹{item?.amount}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Card.Content>
                </Card>

                {/* Totals */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.totalRow}>
                            <Text variant="bodyMedium">Sub Total</Text>
                            <Text variant="bodyMedium">
                                ₹{invoice.subtotal}
                            </Text>
                        </View>
                        {(invoice?.discountAmount ?? 0) > 0 && (
                            <View style={styles.totalRow}>
                                <Text variant="bodyMedium">Discount ({invoice.discountType === 'PERCENTAGE' ? '%' : '₹'})</Text>
                                <Text variant="bodyMedium">₹{Number(invoice?.discountAmount || 0).toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text variant="bodyMedium">Taxable Amount</Text>
                            <Text variant="bodyMedium">
                                ₹{Number(invoice.taxableAmount || invoice.totalAmount - (invoice.totalTax || 0)).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text variant="bodyMedium">CGST</Text>
                            <Text variant="bodyMedium">₹{invoice.cgstTotal}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text variant="bodyMedium">SGST</Text>
                            <Text variant="bodyMedium">₹{invoice.sgstTotal}</Text>
                        </View>

                        <Divider style={styles.divider} />
                        <View style={styles.totalRow}>
                            <Text variant="titleLarge" style={styles.totalLabel}>
                                Total Amount
                            </Text>
                            <Text variant="titleLarge" style={styles.totalAmount}>
                                ₹{invoice.totalAmount}
                            </Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text variant="bodyMedium">Received Amount</Text>
                            <Text variant="bodyMedium">
                                ₹{invoice.receivedAmount || 0}
                            </Text>
                        </View>
                        <Text variant="bodySmall" style={styles.amountWords}>
                            {convertAmountToWords(invoice.totalAmount)}
                        </Text>
                    </Card.Content>
                </Card>

                {/* Terms */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleSmall" style={styles.termsTitle}>
                            TERMS AND CONDITIONS
                        </Text>
                        <Text variant="bodySmall" style={styles.termsText}>
                            • Please check stock properly before taking the stock
                        </Text>
                        <Text variant="bodySmall" style={styles.termsText}>
                            • Damaged items will not be taken back
                        </Text>
                    </Card.Content>
                </Card>

                <View style={styles.bottomSpace} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                {!isSaved && formType !== formTypeEnum.EDIT && (
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        style={styles.actionButton}
                    >
                        Edit
                    </Button>
                )}

                <Button
                    mode="contained-tonal"
                    onPress={handleGeneratePDF}
                    loading={generating}
                    disabled={(generating || !isSaved) && formType !== formTypeEnum.EDIT}
                    icon="file-pdf-box"
                    style={styles.actionButton}>
                    {formType === formTypeEnum.EDIT ? "Share PDF" : isSaved ? "Share PDF" : "Save to Enable PDF"}
                </Button>
                {(formType !== formTypeEnum.EDIT || isSaved) && <Button
                    mode="contained"
                    onPress={handleSaveInvoice}
                    disabled={isSaved || generateInvoice.isPending}
                    loading={generateInvoice.isPending}
                    icon="check"
                    style={styles.actionButton}>
                    Save
                </Button>}

                <QrGenerator
                    value={`upi://pay?pa=${business?.upi_id}&pn=${business?.name}`}
                    onGenerated={setQrBase64}
                />
            </View>

            <Portal>
                <Modal
                    visible={showPdfFormatModal}
                    onDismiss={() => setShowPdfFormatModal(false)}
                    contentContainerStyle={styles.pdfModalContainer}
                >
                    <Card style={styles.pdfModalCard}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.pdfModalTitle}>
                                Select PDF Format
                            </Text>
                            <Text variant="bodyMedium" style={styles.pdfModalSubtitle}>
                                Choose invoice page size
                            </Text>

                            <View style={styles.pdfOptions}>
                                <Button
                                    mode="contained-tonal"
                                    icon="file-document-outline"
                                    style={styles.pdfOptionButton}
                                    contentStyle={styles.pdfOptionButtonContent}
                                    onPress={() => {
                                        setShowPdfFormatModal(false);
                                        generateAndSharePDF('A4');
                                    }}
                                >
                                    A4 (Standard)
                                </Button>
                                <Button
                                    mode="contained-tonal"
                                    icon="file-document-outline"
                                    style={styles.pdfOptionButton}
                                    contentStyle={styles.pdfOptionButtonContent}
                                    onPress={() => {
                                        setShowPdfFormatModal(false);
                                        generateAndSharePDF('A5');
                                    }}
                                >
                                    A5 (Compact)
                                </Button>
                            </View>

                            <Button
                                mode="text"
                                onPress={() => setShowPdfFormatModal(false)}
                                style={styles.pdfCancelButton}
                            >
                                Cancel
                            </Button>
                        </Card.Content>
                    </Card>
                </Modal>
            </Portal>
        </View>
    );
};

export default InvoicePreviewScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    previewContainer: {
        flex: 1,
    },
    card: {
        margin: 12,
    },
    businessName: {
        fontWeight: 'bold',
        color: '#2196F3',
        textAlign: 'center',
    },
    highlight: {
        color: '#2196F3',
        fontWeight: "900"
    },
    businessInfo: {
        textAlign: 'center',
        color: '#666',
        marginTop: 2,
    },
    invoiceTitle: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    detailValue: {
        fontWeight: '600',
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    customerInfo: {
        color: '#666',
        marginTop: 2,
    },
    itemSubtext: {
        color: '#666',
        marginTop: 2,
    },
    itemsTableContainer: {
        minWidth: 620,
    },
    itemsHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingBottom: 8,
        marginBottom: 6,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingVertical: 8,
    },
    headerText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    cellValue: {
        fontSize: 13,
        lineHeight: 18,
        fontVariant: ['tabular-nums'],
    },
    itemName: {
        fontWeight: '500',
        lineHeight: 20,
    },
    alignRight: {
        textAlign: 'right',
    },
    colItem: {
        width: 240,
        paddingRight: 10,
    },
    colQty: {
        width: 52,
        paddingLeft: 6,
    },
    colRate: {
        width: 102,
        paddingLeft: 8,
    },
    colTax: {
        width: 102,
        paddingLeft: 8,
    },
    colAmount: {
        width: 112,
        paddingLeft: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    divider: {
        marginVertical: 8,
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    totalAmount: {
        fontWeight: 'bold',
        color: '#2196F3',
    },
    amountWords: {
        marginTop: 8,
        fontStyle: 'italic',
        color: '#666',
    },
    termsTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    termsText: {
        color: '#666',
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 8,
    },
    actionButton: {
        flex: 1,
    },
    pdfModalContainer: {
        margin: 20,
    },
    pdfModalCard: {
        borderRadius: 16,
    },
    pdfModalTitle: {
        fontWeight: '700',
    },
    pdfModalSubtitle: {
        color: '#666',
        marginTop: 4,
        marginBottom: 16,
    },
    pdfOptions: {
        gap: 10,
    },
    pdfOptionButton: {
        borderRadius: 12,
    },
    pdfOptionButtonContent: {
        height: 48,
    },
    pdfCancelButton: {
        marginTop: 10,
    },
    bottomSpace: {
        height: 20,
    },
})
