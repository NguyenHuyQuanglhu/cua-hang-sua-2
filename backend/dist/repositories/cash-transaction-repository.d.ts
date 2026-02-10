/**
 * CashTransaction entity interface
 */
export interface CashTransaction {
    id: string;
    storeId: string;
    type: 'thu' | 'chi';
    transactionDate: string;
    amount: number;
    reason: string;
    category?: string;
    relatedInvoiceId?: string;
    createdBy?: string;
    createdAt?: string;
}
/**
 * Cash flow summary interface
 */
export interface CashFlowSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
}
/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
/**
 * CashTransaction repository for managing cash flow transactions
 */
export declare class CashTransactionRepository {
    /**
     * Find all cash transactions with filtering options
     */
    findAllFiltered(storeId: string, options?: {
        page?: number;
        pageSize?: number;
        type?: 'thu' | 'chi';
        category?: string;
        dateFrom?: string;
        dateTo?: string;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<PaginatedResult<CashTransaction>>;
    /**
     * Find by ID
     */
    findById(id: string, storeId: string): Promise<CashTransaction | null>;
    /**
     * Create a new cash transaction
     */
    create(entity: Omit<CashTransaction, 'id' | 'createdAt'>, storeId: string): Promise<CashTransaction>;
    /**
     * Update a cash transaction
     */
    update(id: string, entity: Partial<CashTransaction>, storeId: string): Promise<CashTransaction>;
    /**
     * Delete a cash transaction
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get cash flow summary for a date range
     */
    getSummary(storeId: string, dateFrom?: string, dateTo?: string): Promise<CashFlowSummary>;
    /**
     * Get distinct categories used in cash transactions
     */
    getCategories(storeId: string): Promise<string[]>;
}
export declare const cashTransactionRepository: CashTransactionRepository;
//# sourceMappingURL=cash-transaction-repository.d.ts.map