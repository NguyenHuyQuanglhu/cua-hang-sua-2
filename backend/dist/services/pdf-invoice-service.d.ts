interface InvoiceItem {
    productName: string;
    quantity: number;
    unitName: string;
    unitPrice: number;
    discount: number;
    total: number;
}
interface InvoiceData {
    invoiceNumber: string;
    invoiceDate: Date;
    storeName: string;
    storeAddress: string;
    storePhone: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    cashierName: string;
    notes?: string;
}
export declare function getSaleForInvoice(saleId: number, storeId: string, tenantId: string): Promise<InvoiceData | null>;
export declare function generateInvoicePDF(data: InvoiceData): Promise<Buffer>;
export {};
//# sourceMappingURL=pdf-invoice-service.d.ts.map