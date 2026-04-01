/**
 * Customer entity interface (simplified to match actual database schema)
 */
export interface Customer {
    id: string;
    storeId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    loyaltyTier?: string;
    customerType?: string;
    customerGroup?: string;
    lifetimePoints?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Customer with debt information
 */
export interface CustomerWithDebt extends Customer {
    totalSales: number;
    totalPayments: number;
    calculatedDebt: number;
}
/**
 * Query options
 */
export interface QueryOptions {
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}
/**
 * Customer repository for managing customers
 */
export declare class CustomerRepository {
    /**
     * Find all customers for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Customer[]>;
    /**
     * Find customer by ID
     */
    findById(id: string, storeId: string): Promise<Customer | null>;
    /**
     * Find customer by phone within a store
     */
    findByPhone(phone: string, storeId: string): Promise<Customer | null>;
    /**
     * Check if customer phone exists (for validation)
     */
    phoneExists(phone: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new customer
     */
    create(entity: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, storeId: string): Promise<Customer>;
    /**
     * Update a customer
     */
    update(id: string, entity: Partial<Customer>, storeId: string): Promise<Customer>;
    /**
     * Delete a customer
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all customers with debt information (simplified - no debt tracking in basic schema)
     */
    findAllWithDebt(storeId: string, options?: QueryOptions): Promise<CustomerWithDebt[]>;
    /**
     * Get debt info for a customer
     */
    getDebtInfo(customerId: string, storeId: string): Promise<{
        totalSales: number;
        totalPayments: number;
        currentDebt: number;
        lastPaymentDate?: string;
    }>;
    /**
     * Get debt history for a customer
     */
    getDebtHistory(customerId: string, storeId: string): Promise<Array<{
        id: string;
        type: 'sale' | 'payment';
        amount: number;
        date: string;
        description?: string;
    }>>;
}
export declare const customerRepository: CustomerRepository;
//# sourceMappingURL=customer-repository.d.ts.map