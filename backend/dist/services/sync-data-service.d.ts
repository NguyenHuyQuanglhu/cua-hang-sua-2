export declare const UNITS_BY_STORE_TYPE: Record<string, Array<{
    name: string;
    description: string;
}>>;
export declare const SUPPLIERS_BY_STORE_TYPE: Record<string, Array<{
    name: string;
    phone: string;
    address: string;
    contactPerson: string;
}>>;
export declare const SAMPLE_CUSTOMERS: {
    name: string;
    phone: string;
    email: string;
    address: string;
    customerType: string;
}[];
export interface SyncDataResult {
    units: {
        added: number;
        existing: number;
    };
    suppliers: {
        added: number;
        existing: number;
    };
    customers: {
        added: number;
        existing: number;
    };
    purchases: {
        added: number;
    };
    sales: {
        added: number;
    };
}
interface StoreRecord {
    id: string;
    name: string;
    business_type: string;
}
export interface SyncCustomerAccountsResult {
    totalCustomers: number;
    updatedCustomers: number;
    details: Array<{
        customerId: string;
        customerName: string;
        oldValues: {
            totalSpent: number;
            totalPaid: number;
            totalDebt: number;
        };
        newValues: {
            totalSpent: number;
            totalPaid: number;
            totalDebt: number;
        };
    }>;
}
export declare class SyncDataService {
    /**
     * Sync all customer accounts - recalculate total_spent, total_paid, total_debt from Sales data
     * This calculates debt from Sales table and returns the results
     */
    syncCustomerAccounts(storeId: string): Promise<SyncCustomerAccountsResult>;
    /**
     * Generate a unique order number
     */
    private generateOrderNumber;
    /**
     * Generate a unique invoice number
     */
    private generateInvoiceNumber;
    /**
     * Get store info by ID
     */
    getStoreInfo(storeId: string): Promise<StoreRecord | null>;
    /**
     * Sync units for a store based on business type
     */
    syncUnits(storeId: string, storeType: string): Promise<{
        added: number;
        existing: number;
    }>;
    /**
     * Sync suppliers for a store based on business type
     */
    syncSuppliers(storeId: string, storeType: string): Promise<{
        added: number;
        existing: number;
    }>;
    /**
     * Sync customers for a store
     */
    syncCustomers(storeId: string): Promise<{
        added: number;
        existing: number;
    }>;
    /**
     * Create sample purchase orders for suppliers
     */
    syncPurchaseOrders(storeId: string): Promise<{
        added: number;
    }>;
    /**
     * Create sample sales for customers
     */
    syncSales(storeId: string): Promise<{
        added: number;
    }>;
    /**
     * Sync all sample data for a store
     */
    syncAllData(storeId: string): Promise<SyncDataResult>;
}
export declare const syncDataService: SyncDataService;
export {};
//# sourceMappingURL=sync-data-service.d.ts.map