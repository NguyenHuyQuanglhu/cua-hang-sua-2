interface ExportOptions {
    format: 'excel' | 'pdf' | 'csv';
    filename?: string;
}
interface ReportData {
    title: string;
    headers: string[];
    rows: any[][];
    summary?: {
        [key: string]: any;
    };
}
export declare class ExportService {
    /**
     * Xuất dữ liệu ra Excel
     */
    exportToExcel(data: ReportData): Buffer;
    /**
     * Xuất dữ liệu ra CSV
     */
    exportToCSV(data: ReportData): Buffer;
    /**
     * Xuất báo cáo ra PDF
     */
    exportToPDF(data: ReportData): Promise<Buffer>;
    /**
     * Xuất báo cáo bán hàng
     */
    exportSalesReport(sales: any[], options: ExportOptions): Promise<Buffer>;
    /**
     * Xuất báo cáo tồn kho
     */
    exportInventoryReport(inventory: any[], options: ExportOptions): Promise<Buffer>;
    /**
     * Xuất báo cáo nhập hàng
     */
    exportPurchaseReport(purchases: any[], options: ExportOptions): Promise<Buffer>;
    /**
     * Xuất danh sách sản phẩm
     */
    exportProductList(products: any[], options: ExportOptions): Promise<Buffer>;
}
export declare const exportService: ExportService;
export {};
//# sourceMappingURL=export-service.d.ts.map