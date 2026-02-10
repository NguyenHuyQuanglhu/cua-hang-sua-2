export interface ProductImportRow {
    barcode?: string;
    name: string;
    categoryName?: string;
    unitName?: string;
    costPrice: number;
    sellingPrice: number;
    minStock?: number;
    description?: string;
}
export interface ImportResult {
    success: boolean;
    totalRows: number;
    imported: number;
    failed: number;
    errors: Array<{
        row: number;
        error: string;
    }>;
}
export interface ExportOptions {
    storeId: string;
    tenantId: string;
    includeInventory?: boolean;
}
export declare function parseProductsExcel(buffer: Buffer): ProductImportRow[];
export declare function importProducts(products: ProductImportRow[], storeId: string, tenantId: string): Promise<ImportResult>;
export declare function exportProducts(options: ExportOptions): Promise<Buffer>;
export declare function generateImportTemplate(): Buffer;
//# sourceMappingURL=bulk-import-service.d.ts.map