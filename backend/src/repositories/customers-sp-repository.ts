/**
 * Customers SP Repository
 * 
 * Repository for customer operations using stored procedures.
 * Implements CRUD operations via sp_Customers_* stored procedures.
 * Requirements: 3.1-3.5
 */

import { SPBaseRepository, SPParams } from './sp-base-repository';
import { query } from '../db/query';

/**
 * Database record interface for Customers from stored procedures (camelCase - as returned by SP)
 */
interface CustomerSPRecord {
  id: string;
  storeId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customerType: string | null;
  customerGroup: string | null;
  gender: string | null;
  birthday: string | null;
  zalo: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  creditLimit: number | null;
  loyaltyTier: string | null;
  loyaltyPoints: number | null;
  totalPaid: number | null;
  totalDebt: number | null;
  totalSales: number | null;
  calculatedDebt: number | null; // Calculated from Sales table
  totalPayments: number | null; // Calculated from Payments table
  status: string | null;
  lifetimePoints: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  calculatedDebt?: number; // Debt calculated from Sales
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
 * Result from create stored procedure
 */
interface CreateResult {
  Id: string;
}

/**
 * Result from update/delete stored procedures
 */
interface AffectedRowsResult {
  AffectedRows: number;
}

/**
 * Result from updateDebt stored procedure
 */
interface DebtResult {
  total_debt: number;
}

/**
 * Customers repository using stored procedures
 */
export class CustomersSPRepository extends SPBaseRepository<Customer> {
  protected tableName = 'Customers';

  /**
   * Map database record to Customer entity
   */
  private mapToEntity(record: CustomerSPRecord): Customer {
    return {
      id: record.id,
      storeId: record.storeId,
      name: record.name,
      phone: record.phone || undefined,
      email: record.email || undefined,
      address: record.address || undefined,
      customerType: record.customerType || 'retail',
      customerGroup: record.customerGroup || undefined,
      gender: record.gender || undefined,
      birthday: record.birthday || undefined,
      zalo: record.zalo || undefined,
      bankName: record.bankName || undefined,
      bankAccountNumber: record.bankAccountNumber || undefined,
      bankBranch: record.bankBranch || undefined,
      creditLimit: record.creditLimit ?? 0,
      loyaltyTier: record.loyaltyTier || 'bronze',
      loyaltyPoints: record.loyaltyPoints ?? 0,
      totalSpent: record.totalSales ?? 0,
      totalPaid: record.totalPaid ?? record.totalPayments ?? 0,
      totalPayments: record.totalPayments ?? 0,
      totalDebt: record.totalDebt ?? 0,
      calculatedDebt: record.calculatedDebt ?? record.totalDebt ?? 0, // Use calculated if available
      status: record.status || 'active',
      lifetimePoints: record.lifetimePoints ?? 0,
      notes: record.notes || undefined,
      createdAt: record.createdAt
        ? record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt)
        : undefined,
      updatedAt: record.updatedAt
        ? record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : String(record.updatedAt)
        : undefined,
    };
  }

  /**
   * Create a new customer using sp_Customers_Create
   * Requirements: 3.1
   *
   * @param input - Customer data to create
   * @returns Created customer
   */
  async create(input: CreateCustomerSPInput): Promise<Customer> {
    const id = input.id || crypto.randomUUID();

    const params: SPParams = {
      id,
      storeId: input.storeId,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      customerType: input.customerType || 'personal',
      customerGroup: input.customerGroup || null,
      gender: input.gender || null,
      birthday: input.birthday || null,
      zalo: input.zalo || null,
      bankName: input.bankName || null,
      bankAccountNumber: input.bankAccountNumber || null,
      bankBranch: input.bankBranch || null,
      creditLimit: input.creditLimit ?? 0,
      status: input.status || 'active',
      lifetimePoints: input.lifetimePoints ?? 0,
      loyaltyPoints: input.loyaltyPoints ?? 0,
      loyaltyTier: input.loyaltyTier || 'bronze',
      notes: input.notes || null,
    };

    // sp_Customers_Create returns the created customer directly
    const result = await this.executeSPSingle<CustomerSPRecord>('sp_Customers_Create', params);

    if (result) {
      return this.mapToEntity(result);
    }

    // Fallback: fetch by id (case-insensitive comparison)
    const customers = await this.getByStore(input.storeId);
    const customer = customers.find((c) => c.id.toLowerCase() === id.toLowerCase());
    if (!customer) {
      throw new Error('Failed to create customer');
    }
    return customer;
  }

  /**
   * Update a customer using sp_Customers_Update
   * Requirements: 3.2
   * 
   * @param id - Customer ID
   * @param storeId - Store ID
   * @param data - Fields to update
   * @returns Updated customer or null if not found
   */
  async update(
    id: string,
    storeId: string,
    data: UpdateCustomerSPInput
  ): Promise<Customer | null> {
    // Only pass parameters that are actually provided to avoid SP parameter mismatch
    const params: SPParams = {
      id,
      storeId,
    };

    // Add only non-undefined parameters
    if (data.name !== undefined) params.name = data.name;
    if (data.phone !== undefined) params.phone = data.phone;
    if (data.email !== undefined) params.email = data.email;
    if (data.address !== undefined) params.address = data.address;
    if (data.customerType !== undefined) params.customerType = data.customerType;
    if (data.customerGroup !== undefined) params.customerGroup = data.customerGroup;
    if (data.gender !== undefined) params.gender = data.gender;
    if (data.birthday !== undefined) params.birthday = data.birthday;
    if (data.zalo !== undefined) params.zalo = data.zalo;
    if (data.bankName !== undefined) params.bankName = data.bankName;
    if (data.bankAccountNumber !== undefined) params.bankAccountNumber = data.bankAccountNumber;
    if (data.bankBranch !== undefined) params.bankBranch = data.bankBranch;
    if (data.creditLimit !== undefined) params.creditLimit = data.creditLimit;
    if (data.status !== undefined) params.status = data.status;
    if (data.lifetimePoints !== undefined) params.lifetimePoints = data.lifetimePoints;
    if (data.loyaltyPoints !== undefined) params.loyaltyPoints = data.loyaltyPoints;
    if (data.loyaltyTier !== undefined) params.loyaltyTier = data.loyaltyTier;
    if (data.notes !== undefined) params.notes = data.notes;

    const result = await this.executeSPSingle<CustomerSPRecord>(
      'sp_Customers_Update',
      params
    );

    if (!result) {
      return null;
    }

    return this.mapToEntity(result);
  }

  /**
   * Delete a customer using sp_Customers_Delete
   * Requirements: 3.3
   * 
   * @param id - Customer ID
   * @param storeId - Store ID
   * @param forceDelete - Admin can force delete customers with transactions
   * @returns True if deleted, false if not found
   */
  async delete(id: string, storeId: string, forceDelete: boolean = false): Promise<boolean> {
    const result = await this.executeSPSingle<AffectedRowsResult>(
      'sp_Customers_Delete',
      { id, storeId, forceDelete }
    );

    return (result?.AffectedRows ?? 0) > 0;
  }

  /**
   * Get all customers for a store using sp_Customers_GetByStore
   * Requirements: 3.4
   * 
   * @param storeId - Store ID
   * @returns Array of customers
   */
  async getByStore(storeId: string): Promise<Customer[]> {
    const params: SPParams = {
      storeId,
    };

    const results = await this.executeSP<CustomerSPRecord>(
      'sp_Customers_GetByStore',
      params
    );

    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * Get a single customer by ID using sp_Customers_GetById
   *
   * @param id - Customer ID
   * @param storeId - Store ID
   * @returns Customer or null if not found
   */
  async getById(id: string, storeId: string): Promise<Customer | null> {
    const result = await this.executeSPSingle<CustomerSPRecord>(
      'sp_Customers_GetById',
      { id, storeId }
    );

    if (result) {
      return this.mapToEntity(result);
    }

    return null;
  }

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
  async updateDebt(
    id: string,
    storeId: string,
    spentAmount: number = 0,
    paidAmount: number = 0
  ): Promise<number> {
    const params: SPParams = {
      id,
      storeId,
      spentAmount,
      paidAmount,
    };

    const result = await this.executeSPSingle<DebtResult>(
      'sp_Customers_UpdateDebt',
      params
    );

    return result?.total_debt ?? 0;
  }

  /**
   * Add to customer's spent amount
   * Convenience method for recording a sale
   * 
   * @param id - Customer ID
   * @param storeId - Store ID
   * @param amount - Amount spent
   * @returns New total debt
   */
  async addSpent(id: string, storeId: string, amount: number): Promise<number> {
    return this.updateDebt(id, storeId, amount, 0);
  }

  /**
   * Record a payment from customer
   * Convenience method for recording a payment
   * 
   * @param id - Customer ID
   * @param storeId - Store ID
   * @param amount - Amount paid
   * @returns New total debt
   */
  async recordPayment(id: string, storeId: string, amount: number): Promise<number> {
    return this.updateDebt(id, storeId, 0, amount);
  }

  /**
   * Get customer debt information
   *
   * @param id - Customer ID
   * @param storeId - Store ID
   * @returns Debt information or null if customer not found
   */
  async getDebtInfo(
    id: string,
    storeId: string
  ): Promise<{ totalSpent: number; totalPaid: number; totalDebt: number } | null> {
    const customer = await this.getById(id, storeId);
    if (!customer) {
      return null;
    }

    return {
      totalSpent: customer.totalSpent ?? 0,
      totalPaid: customer.totalPaid ?? 0,
      totalDebt: customer.totalDebt ?? 0,
    };
  }

  /**
   * Get customer debt history from Sales and Payments
   * Requirements: 3.6
   *
   * @param customerId - Customer ID
   * @param storeId - Store ID
   * @returns Array of debt history items
   */
  async getDebtHistory(
    customerId: string,
    storeId: string
  ): Promise<CustomerDebtHistoryItem[]> {
    const results = await this.executeSP<DebtHistorySPRecord>(
      'sp_Customers_GetDebtHistory',
      { customerId, storeId }
    );

    // Calculate running balance
    let runningBalance = 0;
    return results.map((r) => {
      if (r.type === 'sale') {
        runningBalance += r.amount;
      } else {
        runningBalance -= r.amount;
      }
      return {
        id: r.id,
        customerId: r.customerId,
        amount: r.amount,
        type: r.type as 'sale' | 'payment',
        date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
        description: r.description,
        runningBalance: runningBalance,
      };
    });
  }
}

/**
 * Interface for debt history item returned from SP
 */
interface DebtHistorySPRecord {
  id: string;
  customerId: string;
  amount: number;
  type: string;
  date: Date | string;
  description: string;
  remainingDebt: number | null;
  createdAt: Date;
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

// Export singleton instance
export const customersSPRepository = new CustomersSPRepository();
