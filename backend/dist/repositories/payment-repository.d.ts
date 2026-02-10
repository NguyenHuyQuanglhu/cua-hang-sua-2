import { BaseRepository, QueryOptions } from './base-repository';
/**
 * Payment entity interface (matches database schema)
 */
export interface Payment {
    id: string;
    storeId: string;
    customerId: string;
    paymentDate: string;
    amount: number;
    notes?: string;
    createdAt?: string;
}
/**
 * Payment repository for managing customer payments
 */
export declare class PaymentRepository extends BaseRepository<Payment> {
    constructor();
    /**
     * Map database record to Payment entity
     */
    protected mapToEntity(record: Record<string, unknown>): Payment;
    /**
     * Find all payments for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Payment[]>;
    /**
     * Find payment by ID
     */
    findById(id: string, storeId: string): Promise<Payment | null>;
    /**
     * Find payments by customer
     */
    findByCustomer(customerId: string, storeId: string): Promise<Payment[]>;
    /**
     * Find payments by date range
     */
    findByDateRange(storeId: string, dateFrom: Date, dateTo: Date): Promise<Payment[]>;
    /**
     * Create a new payment
     */
    create(entity: Omit<Payment, 'id' | 'createdAt'>, storeId: string): Promise<Payment>;
    /**
     * Delete a payment
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get total payments for a customer
     */
    getTotalPaymentsByCustomer(customerId: string, storeId: string): Promise<number>;
    /**
     * Get total payments for a store
     */
    getTotalPayments(storeId: string, dateFrom?: Date, dateTo?: Date): Promise<number>;
}
export declare const paymentRepository: PaymentRepository;
//# sourceMappingURL=payment-repository.d.ts.map