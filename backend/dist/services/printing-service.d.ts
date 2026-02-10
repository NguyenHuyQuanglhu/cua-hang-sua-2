interface Product {
    id: string;
    name: string;
    barcode?: string;
    sellingPrice: number;
    sku?: string;
}
interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplierName: string;
    orderDate: Date;
    totalAmount: number;
    items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}
interface PriceList {
    storeName: string;
    effectiveDate: Date;
    products: Array<{
        name: string;
        sku?: string;
        sellingPrice: number;
        category?: string;
    }>;
}
export declare class PrintingService {
    /**
     * In tem mã vạch sản phẩm
     */
    generateBarcodePDF(products: Product[]): Promise<Buffer>;
    /**
     * In phiếu nhập kho
     */
    generatePurchaseReceiptPDF(order: PurchaseOrder): Promise<Buffer>;
    /**
     * In phiếu xuất kho
     */
    generateDeliveryNotePDF(order: any): Promise<Buffer>;
    /**
     * In bảng giá sản phẩm
     */
    generatePriceListPDF(priceList: PriceList): Promise<Buffer>;
    /**
     * In nhãn giá (sticker nhỏ)
     */
    generatePriceLabelPDF(products: Product[]): Promise<Buffer>;
}
export declare const printingService: PrintingService;
export {};
//# sourceMappingURL=printing-service.d.ts.map