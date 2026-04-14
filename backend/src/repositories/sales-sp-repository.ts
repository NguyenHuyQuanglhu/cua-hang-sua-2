/**
 * Sales SP Repository
 * 
 * Repository for sales operations using stored procedures.
 * Implements CRUD operations via sp_Sales_* stored procedures.
 * Requirements: 2.1-2.5
 */

import { SPBaseRepository, SPParams } from './sp-base-repository';
import { Sale, SalesItem } from './sales-repository';

/**
 * Database record interface for Sales from stored procedures (camelCase - as returned by SP)
 */
interface SaleSPRecord {
  id: string;
  storeId: string;
  invoiceNumber: string;
  customerId: string | null;
  shiftId: string | null;
  projectName?: string | null;
  transactionDate: Date;
  status: string;
  totalAmount: number;
  vatAmount: number;
  finalAmount: number;
  discount: number;
  discountType: string | null;
  discountValue: number | null;
  tierDiscountPercentage: number | null;
  tierDiscountAmount: number | null;
  pointsUsed: number;
  pointsDiscount: number;
  customerPayment: number | null;
  previousDebt: number | null;
  remainingDebt: number | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields from SP
  customerName?: string;
  itemCount?: number;
}

/**
 * Database record interface for SalesItems from stored procedures (camelCase - as returned by SP)
 */
interface SalesItemSPRecord {
  id: string;
  salesTransactionId: string;
  productId: string;
  quantity: number;
  price: number;
  unitId: string | null;
  // Joined fields from SP
  productName?: string;
  unitName?: string;
}

/**
 * Extended Sale with customer name
 */
export interface SaleWithCustomer extends Sale {
  customerName?: string;
  itemCount?: number;
}

/**
 * Extended SalesItem with product and unit names
 */
export interface SalesItemWithDetails extends SalesItem {
  unitId?: string;
  productName?: string;
  unitName?: string;
}

/**
 * Sale with items result
 */
export interface SaleWithItems {
  sale: SaleWithCustomer;
  items: SalesItemWithDetails[];
}


/**
 * Input for creating a sale via stored procedure
 */
export interface CreateSaleSPInput {
  id?: string;
  storeId: string;
  invoiceNumber?: string;
  customerId?: string | null;
  shiftId?: string | null;
  totalAmount: number;
  vatAmount?: number;
  finalAmount: number;
  discount?: number;
  discountType?: 'percentage' | 'amount' | null;
  discountValue?: number | null;
  tierDiscountPercentage?: number | null;
  tierDiscountAmount?: number | null;
  pointsUsed?: number;
  pointsDiscount?: number;
  customerPayment?: number;
  previousDebt?: number;
  remainingDebt?: number;
  status?: 'pending' | 'unprinted' | 'printed';
}

/**
 * Input for creating a sales item via stored procedure
 */
export interface CreateSalesItemSPInput {
  id?: string;
  salesTransactionId: string;
  productId: string;
  quantity: number;
  price: number;
  unitId: string;
}

/**
 * Filters for getting sales by store
 */
export interface GetSalesByStoreFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  customerId?: string | null;
  status?: string | null;
}

/**
 * Sales repository using stored procedures
 */
export class SalesSPRepository extends SPBaseRepository<Sale> {
  protected tableName = 'Sales';

  /**
   * Map database record to Sale entity
   */
  private mapToSaleEntity(record: SaleSPRecord): SaleWithCustomer {
    return {
      id: record.id,
      storeId: record.storeId,
      invoiceNumber: record.invoiceNumber,
      customerId: record.customerId || undefined,
      shiftId: record.shiftId || undefined,
      projectName: record.projectName || undefined,
      transactionDate: record.transactionDate
        ? record.transactionDate instanceof Date
          ? record.transactionDate.toISOString()
          : String(record.transactionDate)
        : new Date().toISOString(),
      status: (record.status as 'pending' | 'unprinted' | 'printed') || 'pending',
      totalAmount: record.totalAmount || 0,
      vatAmount: record.vatAmount || 0,
      finalAmount: record.finalAmount || 0,
      discount: record.discount || 0,
      discountType: (record.discountType as 'percentage' | 'amount') || undefined,
      discountValue: record.discountValue ?? undefined,
      tierDiscountPercentage: record.tierDiscountPercentage ?? undefined,
      tierDiscountAmount: record.tierDiscountAmount ?? undefined,
      pointsUsed: record.pointsUsed || 0,
      pointsDiscount: record.pointsDiscount || 0,
      customerPayment: record.customerPayment ?? undefined,
      previousDebt: record.previousDebt ?? undefined,
      remainingDebt: record.remainingDebt ?? undefined,
      createdBy: record.createdBy || undefined,
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
      customerName: record.customerName,
      itemCount: record.itemCount,
    };
  }

  /**
   * Map database record to SalesItem entity
   */
  private mapToSalesItemEntity(record: SalesItemSPRecord): SalesItemWithDetails {
    return {
      id: record.id,
      salesTransactionId: record.salesTransactionId,
      productId: record.productId,
      quantity: record.quantity,
      price: record.price,
      unitId: record.unitId || undefined,
      productName: record.productName,
      unitName: record.unitName,
    };
  }


  /**
   * Create a new sale using sp_Sales_Create
   * Requirements: 2.1
   * 
   * @param input - Sale data to create
   * @returns Created sale with ID and invoice number
   */
  async create(input: CreateSaleSPInput): Promise<{ id: string; invoiceNumber: string }> {
    const id = input.id || crypto.randomUUID();
    const invoiceNumber = input.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`;

    const params: SPParams = {
      id,
      storeId: input.storeId,
      invoiceNumber,
      customerId: input.customerId || null,
      shiftId: input.shiftId || null,
      totalAmount: input.totalAmount,
      vatAmount: input.vatAmount ?? 0,
      finalAmount: input.finalAmount,
      discount: input.discount ?? 0,
      discountType: input.discountType || null,
      discountValue: input.discountValue ?? null,
      tierDiscountPercentage: input.tierDiscountPercentage ?? null,
      tierDiscountAmount: input.tierDiscountAmount ?? null,
      pointsUsed: input.pointsUsed ?? 0,
      pointsDiscount: input.pointsDiscount ?? 0,
      customerPayment: input.customerPayment ?? 0,
      previousDebt: input.previousDebt ?? 0,
      remainingDebt: input.remainingDebt ?? 0,
      status: input.status || 'pending',
    };

    const result = await this.executeSPSingle<{ Id: string; InvoiceNumber: string }>(
      'sp_Sales_Create',
      params
    );

    return {
      id: result?.Id || id,
      invoiceNumber: result?.InvoiceNumber || invoiceNumber,
    };
  }

  /**
   * Create a sales item using sp_SalesItems_Create
   * This also deducts inventory automatically
   * Requirements: 2.1, 2.5
   * 
   * @param input - Sales item data to create
   * @returns Created sales item ID
   */
  async createItem(input: CreateSalesItemSPInput): Promise<string> {
    const id = input.id || crypto.randomUUID();

    const params: SPParams = {
      id,
      salesTransactionId: input.salesTransactionId,
      productId: input.productId,
      quantity: input.quantity,
      price: input.price,
      unitId: input.unitId,
    };

    const result = await this.executeSPSingle<{ Id: string }>(
      'sp_SalesItems_Create',
      params
    );

    return result?.Id || id;
  }

  /**
   * Create a sale with items in a single transaction
   * Requirements: 2.1, 2.5
   * 
   * @param saleInput - Sale data
   * @param items - Array of sales items
   * @returns Created sale with items
   */
  async createWithItems(
    saleInput: CreateSaleSPInput,
    items: Omit<CreateSalesItemSPInput, 'salesTransactionId'>[]
  ): Promise<SaleWithItems> {
    return this.withSPTransaction(async (helpers) => {
      const id = saleInput.id || crypto.randomUUID();
      const invoiceNumber = saleInput.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`;

      // Create sale
      await helpers.executeSP('sp_Sales_Create', {
        id,
        storeId: saleInput.storeId,
        invoiceNumber,
        customerId: saleInput.customerId || null,
        shiftId: saleInput.shiftId || null,
        totalAmount: saleInput.totalAmount,
        vatAmount: saleInput.vatAmount ?? 0,
        finalAmount: saleInput.finalAmount,
        discount: saleInput.discount ?? 0,
        discountType: saleInput.discountType || null,
        discountValue: saleInput.discountValue ?? null,
        tierDiscountPercentage: saleInput.tierDiscountPercentage ?? null,
        tierDiscountAmount: saleInput.tierDiscountAmount ?? null,
        pointsUsed: saleInput.pointsUsed ?? 0,
        pointsDiscount: saleInput.pointsDiscount ?? 0,
        customerPayment: saleInput.customerPayment ?? 0,
        previousDebt: saleInput.previousDebt ?? 0,
        remainingDebt: saleInput.remainingDebt ?? 0,
        status: saleInput.status || 'pending',
      });

      // Create items
      for (const item of items) {
        const itemId = crypto.randomUUID();
        await helpers.executeSP('sp_SalesItems_Create', {
          id: itemId,
          salesTransactionId: id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          unitId: item.unitId,
        });
      }

      // Fetch and return the created sale with items
      const result = await this.getById(id, saleInput.storeId);
      if (!result) {
        throw new Error('Failed to create sale');
      }
      return result;
    });
  }


  /**
   * Get a sale by ID with items using sp_Sales_GetById
   * Returns multiple result sets: sale and items
   * Requirements: 2.2
   * 
   * @param id - Sale ID
   * @param storeId - Store ID
   * @returns Sale with items or null if not found
   */
  async getById(id: string, storeId: string): Promise<SaleWithItems | null> {
    const result = await this.executeSPMultiple<SaleSPRecord | SalesItemSPRecord>(
      'sp_Sales_GetById',
      { id, storeId }
    );

    // First recordset is the sale, second is the items
    const saleRecords = result.recordsets[0] as SaleSPRecord[];
    const itemRecords = (result.recordsets[1] || []) as SalesItemSPRecord[];

    if (!saleRecords || saleRecords.length === 0) {
      return null;
    }

    return {
      sale: this.mapToSaleEntity(saleRecords[0]),
      items: itemRecords.map((r) => this.mapToSalesItemEntity(r)),
    };
  }

  /**
   * Get sales for a store using sp_Sales_GetByStore
   * Requirements: 2.3
   * 
   * @param storeId - Store ID
   * @param filters - Optional filters (date range, customer, status)
   * @returns Array of sales with customer names
   */
  async getByStore(
    storeId: string,
    filters?: GetSalesByStoreFilters
  ): Promise<SaleWithCustomer[]> {
    const params: SPParams = {
      storeId,
      startDate: filters?.startDate || null,
      endDate: filters?.endDate || null,
      customerId: filters?.customerId || null,
      status: filters?.status || null,
      page: 1,
      pageSize: 10000, // Get all records, pagination is done in the route
    };

    // SP returns 2 recordsets: [0] = total count, [1] = sales data
    const result = await this.executeSPMultiple<SaleSPRecord>(
      'sp_Sales_GetByStore',
      params
    );

    // Get sales from second recordset (index 1)
    const salesRecords = (result.recordsets[1] || []) as SaleSPRecord[];
    return salesRecords.map((r) => this.mapToSaleEntity(r));
  }

  /**
   * Update sale status using sp_Sales_UpdateStatus
   * Requirements: 2.4
   * 
   * @param id - Sale ID
   * @param storeId - Store ID
   * @param status - New status
   * @returns True if updated, false if not found
   */
  async updateStatus(
    id: string,
    storeId: string,
    status: 'pending' | 'unprinted' | 'printed'
  ): Promise<boolean> {
    const result = await this.executeSPSingle<{ AffectedRows: number }>(
      'sp_Sales_UpdateStatus',
      { id, storeId, status }
    );

    return (result?.AffectedRows ?? 0) > 0;
  }

  /**
   * Get sales by date range
   * Convenience method using getByStore with date filters
   * 
   * @param storeId - Store ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of sales
   */
  async getByDateRange(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SaleWithCustomer[]> {
    return this.getByStore(storeId, { startDate, endDate });
  }

  /**
   * Get sales by customer
   * Convenience method using getByStore with customer filter
   * 
   * @param storeId - Store ID
   * @param customerId - Customer ID
   * @returns Array of sales
   */
  async getByCustomer(
    storeId: string,
    customerId: string
  ): Promise<SaleWithCustomer[]> {
    return this.getByStore(storeId, { customerId });
  }
}

// Export singleton instance
export const salesSPRepository = new SalesSPRepository();
