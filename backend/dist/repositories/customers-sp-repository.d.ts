/**
 * Customers SP Repository
 *
 * Repository for customer operations using stored procedures.
 * Implements CRUD operations via sp_Customers_* stored procedures.
 * Requirements: 3.1-3.5
 */
import { SPBaseRepository } from './sp-base-repository';
/**
 * Customer entity interface
 */
export interface Customer {
    id: string;
    storeId: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    customerType?: string;
    customerGroup?: string;
    gender?: string;
    birthday?: string;
    zalo?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranch?: string;
    creditLimit?: number;
    loyaltyTier?: string;
    loyaltyPoints?: number;
    totalSpent?: number;
    totalPaid?: number;
    totalDebt?: number;
    calculatedDebt?: number;
    totalPayments?: number;
    status?: string;
    lifetimePoints?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Input for creating a customer via stored procedure
 */
export interface CreateCustomerSPInput {
    id?: string;
    storeId: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    customerType?: string;
    customerGroup?: string | null;
    gender?: string | null;
    birthday?: string | null;
    zalo?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
    creditLimit?: number;
    loyaltyTier?: string;
    loyaltyPoints?: number;
    lifetimePoints?: number;
    status?: string;
    notes?: string | null;
}
/**
 * Input for updating a customer via stored procedure
 */
export interface UpdateCustomerSPInput {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    customerType?: string;
    customerGroup?: string | null;
    gender?: string | null;
    birthday?: string | null;
    zalo?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
    creditLimit?: number;
    lifetimePoints?: number;
    loyaltyPoints?: number;
    loyaltyTier?: string;
    status?: string;
    notes?: string | null;
}
/**
 * Customers repository using stored procedures
 */
export declare class CustomersSPRepository extends SPBaseRepository<Customer> {
    protected tableName: string;
    /**
     * Map database record to Customer entity
     */
    private mapToEntity;
    /**
     * Create a new customer using sp_Customers_Create
     * Requirements: 3.1
     *
     * @param input - Customer data to create
     * @returns Created customer
     */
    create(input: CreateCustomerSPInput): Promise<Customer>;
    /**
     * Update a customer using sp_Customers_Update
     * Requirements: 3.2
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated customer or null if not found
     */
    update(id: string, storeId: string, data: UpdateCustomerSPInput): Promise<Customer | null>;
    /**
     * Delete a customer using sp_Customers_Delete
     * Requirements: 3.3
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all customers for a store using sp_Customers_GetByStore
     * Requirements: 3.4
     *
     * @param storeId - Store ID
     * @returns Array of customers
     */
    getByStore(storeId: string): Promise<Customer[]>;
    /**
     * Get a single customer by ID using sp_Customers_GetById
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @returns Customer or null if not found
     */
    getById(id: string, storeId: string): Promise<Customer | null>;
    /**
     * Update customer debt using sp_Customers_UpdateDebt
     * Requirements: 3.5
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @param spentAmount - Amount spent to add (positive value)
     * @param paidAmount - Amount paid to add (positive value)
     * @returns New total debt after update
     */
    updateDebt(id: string, storeId: string, spentAmount?: number, paidAmount?: number): Promise<number>;
    /**
     * Add to customer's spent amount
     * Convenience method for recording a sale
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @param amount - Amount spent
     * @returns New total debt
     */
    addSpent(id: string, storeId: string, amount: number): Promise<number>;
    /**
     * Record a payment from customer
     * Convenience method for recording a payment
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @param amount - Amount paid
     * @returns New total debt
     */
    recordPayment(id: string, storeId: string, amount: number): Promise<number>;
    /**
     * Get customer debt information
     *
     * @param id - Customer ID
     * @param storeId - Store ID
     * @returns Debt information or null if customer not found
     */
    getDebtInfo(id: string, storeId: string): Promise<{
        totalSpent: number;
        totalPaid: number;
        totalDebt: number;
    } | null>;
    /**
     * Get customer debt history from Sales and Payments
     * Requirements: 3.6
     *
     * @param customerId - Customer ID
     * @param storeId - Store ID
     * @returns Array of debt history items
     */
    getDebtHistory(customerId: string, storeId: string): Promise<CustomerDebtHistoryItem[]>;
}
/**
 * Customer debt history item
 */
export interface CustomerDebtHistoryItem {
    id: string;
    customerId: string;
    amount: number;
    type: 'sale' | 'payment';
    date: string;
    description: string;
    runningBalance: number;
}
export declare const customersSPRepository: CustomersSPRepository;
//# sourceMappingURL=customers-sp-repository.d.ts.map