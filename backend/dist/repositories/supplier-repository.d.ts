/**
 * Supplier entity interface
 */
export interface Supplier {
    id: string;
    storeId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxCode?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Supplier with debt information
 */
export interface SupplierWithDebt extends Supplier {
    totalPurchases: number;
    totalPayments: number;
    debt: number;
}
/**
 * Query options
 */
export interface QueryOptions {
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}
/**
 * Supplier repository for managing suppliers
 */
export declare class SupplierRepository {
    /**
     * Find all suppliers for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Supplier[]>;
    /**
     * Find supplier by ID
     */
    findById(id: string, storeId: string): Promise<Supplier | null>;
    /**
     * Find supplier by name within a store
     */
    findByName(name: string, storeId: string): Promise<Supplier | null>;
    /**
     * Check if supplier name exists (for validation)
     */
    nameExists(name: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new supplier
     */
    create(entity: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>, storeId: string): Promise<Supplier>;
    /**
     * Update a supplier
     */
    update(id: string, entity: Partial<Supplier>, storeId: string): Promise<Supplier>;
    /**
     * Delete a supplier
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all suppliers with debt information
     */
    findAllWithDebt(storeId: string, options?: QueryOptions): Promise<SupplierWithDebt[]>;
    /**
     * Get supplier debt information
     */
    getDebtInfo(supplierId: string, storeId: string): Promise<{
        totalPurchases: number;
        totalPayments: number;
        debt: number;
    }>;
    /**
     * Check if supplier is in use
     */
    isInUse(supplierId: string, storeId: string): Promise<boolean>;
}
export declare const supplierRepository: SupplierRepository;
//# sourceMappingURL=supplier-repository.d.ts.map