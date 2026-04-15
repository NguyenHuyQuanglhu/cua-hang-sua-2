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
export interface CustomerImportRow {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gender?: string;
    birthday?: string;
    notes?: string;
}
export declare function parseCustomersExcel(buffer: Buffer): CustomerImportRow[];
export declare function importCustomers(customers: CustomerImportRow[], storeId: string): Promise<ImportResult>;
export declare function generateCustomerImportTemplate(): Buffer;
export declare function exportCustomers(storeId: string): Promise<Buffer>;
//# sourceMappingURL=bulk-import-service.d.ts.map