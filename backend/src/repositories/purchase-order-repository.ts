import { BaseRepository, QueryOptions, PaginationOptions, PaginatedResult } from './base-repository';
import { query, queryOne, SqlValue, QueryParams } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne, transactionInsert } from '../db/transaction';
import { cashTransactionRepository } from './cash-transaction-repository';

export interface PurchaseOrder {
  id: string;
  storeId: string;
  orderNumber: string;
  supplierId?: string;
  importDate: string;
  totalAmount: number;
  paidAmount?: number;
  remainingDebt?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  cost: number;
  unitId: string;
  baseQuantity?: number;
  baseCost?: number;
  baseUnitId?: string;
}

export interface PurchaseLot {
  id: string;
  productId: string;
  storeId: string;
  importDate: string;
  quantity: number;
  remainingQuantity: number;
  cost: number;
  unitId: string;
  purchaseOrderId?: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: PurchaseOrderItemWithProduct[];
  supplierName?: string;
}

export interface PurchaseOrderItemWithProduct extends PurchaseOrderItem {
  productName?: string;
  unitName?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId?: string;
  importDate: string;
  notes?: string;
  totalAmount: number;
  createdBy?: string;
  items: CreatePurchaseOrderItemInput[];
}

export interface CreatePurchaseOrderItemInput {
  productId: string;
  quantity: number;
  cost: number;
  unitId: string;
  baseQuantity?: number;
  baseCost?: number;
  baseUnitId?: string;
}

interface PurchaseOrderRecord {
  id: string;
  store_id: string;
  order_number: string;
  supplier_id: string | null;
  import_date: Date;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  [key: string]: SqlValue;
}

interface PurchaseOrderItemRecord {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  cost: number;
  unit_id: string;
  base_quantity?: number;
  base_cost?: number;
  base_unit_id?: string;
  [key: string]: SqlValue;
}

interface PurchaseLotRecord {
  id: string;
  product_id: string;
  store_id: string;
  import_date: Date;
  quantity: number;
  remaining_quantity: number;
  cost: number;
  unit_id: string;
  purchase_order_id: string | null;
  [key: string]: SqlValue;
}

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrder> {
  constructor() {
    super('PurchaseOrders', 'id');
  }

  protected mapToEntity(record: Record<string, unknown>): PurchaseOrder {
    const r = record as unknown as PurchaseOrderRecord;
    return {
      id: r.id,
      storeId: r.store_id,
      orderNumber: r.order_number,
      supplierId: r.supplier_id || undefined,
      importDate: r.import_date instanceof Date ? r.import_date.toISOString() : String(r.import_date),
      totalAmount: r.total_amount,
      paidAmount: (r as any).paid_amount ?? 0,
      remainingDebt: (r as any).remaining_debt ?? r.total_amount,
      notes: r.notes || undefined,
      createdBy: r.created_by || undefined,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
  }

  protected mapToRecord(entity: Partial<PurchaseOrder>): Record<string, SqlValue> {
    const record: Record<string, SqlValue> = {};
    if (entity.id !== undefined) record.id = entity.id;
    if (entity.storeId !== undefined) record.store_id = entity.storeId;
    if (entity.orderNumber !== undefined) record.order_number = entity.orderNumber;
    if (entity.supplierId !== undefined) record.supplier_id = entity.supplierId || null;
    if (entity.importDate !== undefined) record.import_date = new Date(entity.importDate);
    if (entity.totalAmount !== undefined) record.total_amount = entity.totalAmount;
    if (entity.notes !== undefined) record.notes = entity.notes || null;
    if (entity.createdBy !== undefined) record.created_by = entity.createdBy || null;
    return record;
  }

  private mapItemToEntity(record: PurchaseOrderItemRecord): PurchaseOrderItem {
    return {
      id: record.id,
      purchaseOrderId: record.purchase_order_id,
      productId: record.product_id,
      quantity: record.quantity,
      cost: record.cost,
      unitId: record.unit_id,
      baseQuantity: record.base_quantity,
      baseCost: record.base_cost,
      baseUnitId: record.base_unit_id,
    };
  }

  private mapLotToEntity(record: PurchaseLotRecord): PurchaseLot {
    return {
      id: record.id,
      productId: record.product_id,
      storeId: record.store_id,
      importDate: record.import_date instanceof Date ? record.import_date.toISOString() : String(record.import_date),
      quantity: record.quantity,
      remainingQuantity: record.remaining_quantity,
      cost: record.cost,
      unitId: record.unit_id,
      purchaseOrderId: record.purchase_order_id || undefined,
    };
  }

  async generateOrderNumber(storeId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `PN${year}${month}`;
    const queryString = `SELECT TOP 1 order_number FROM PurchaseOrders WHERE store_id = @storeId AND order_number LIKE @prefix + '%' ORDER BY order_number DESC`;
    const result = await queryOne<{ order_number: string }>(queryString, { storeId, prefix: datePrefix });
    let nextSequence = 1;
    if (result) {
      const lastSequence = parseInt(result.order_number.substring(datePrefix.length), 10);
      if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
    }
    return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
  }

  async createWithItems(input: CreatePurchaseOrderInput, storeId: string): Promise<PurchaseOrderWithDetails> {
    return withTransaction(async (transaction) => {
      const orderNumber = await this.generateOrderNumber(storeId);
      const purchaseOrderId = crypto.randomUUID();
      const now = new Date();
      const orderRecord = await transactionInsert<PurchaseOrderRecord>(transaction, 'PurchaseOrders', {
        id: purchaseOrderId, 
        store_id: storeId, 
        order_number: orderNumber, 
        supplier_id: input.supplierId || null,
        import_date: new Date(input.importDate), 
        total_amount: input.totalAmount, 
        paid_amount: 0,
        remaining_debt: input.totalAmount,
        payment_status: 'unpaid',
        notes: input.notes || null,
        created_at: now,
        // updated_at will be set automatically by database DEFAULT
      });
      if (!orderRecord) throw new Error('Failed to create purchase order');
      const items: PurchaseOrderItemWithProduct[] = [];
      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        const lotId = crypto.randomUUID();
        
        // Use base values if provided, otherwise use original values
        const baseQuantity = item.baseQuantity || item.quantity;
        const baseCost = item.baseCost || item.cost;
        const baseUnitId = item.baseUnitId || item.unitId;
        
        const itemRecord = await transactionInsert<PurchaseOrderItemRecord>(transaction, 'PurchaseOrderItems', {
          id: itemId, purchase_order_id: purchaseOrderId, product_id: item.productId,
          quantity: item.quantity, cost: item.cost, unit_id: item.unitId,
          base_quantity: baseQuantity, base_cost: baseCost, base_unit_id: baseUnitId,
        });
        if (!itemRecord) throw new Error('Failed to create purchase order item');
        
        // PurchaseLots always use base unit values for inventory tracking
        await transactionInsert<PurchaseLotRecord>(transaction, 'PurchaseLots', {
          id: lotId, product_id: item.productId, store_id: storeId, import_date: new Date(input.importDate),
          quantity: baseQuantity, remaining_quantity: baseQuantity, cost: baseCost, unit_id: baseUnitId,
          purchase_order_id: purchaseOrderId,
        });
        
        // Update ProductInventory
        const existingInventory = await transactionQueryOne<{ Id: string; Quantity: number }>(
          transaction,
          `SELECT Id, Quantity FROM ProductInventory WHERE ProductId = @productId AND StoreId = @storeId`,
          { productId: item.productId, storeId }
        );
        
        if (existingInventory) {
          // Update existing inventory
          await transactionQuery(
            transaction,
            `UPDATE ProductInventory SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE() WHERE Id = @id`,
            { id: existingInventory.Id, quantity: baseQuantity }
          );
        } else {
          // Create new inventory record
          await transactionInsert(transaction, 'ProductInventory', {
            Id: crypto.randomUUID(),
            ProductId: item.productId,
            StoreId: storeId,
            UnitId: baseUnitId,
            Quantity: baseQuantity,
            CreatedAt: now,
            UpdatedAt: now,
          });
        }
        
        // Update product's updated_at to move it to top of list
        await transactionQuery(
          transaction,
          `UPDATE Products SET updated_at = GETDATE() WHERE id = @productId AND store_id = @storeId`,
          { productId: item.productId, storeId }
        );
        
        items.push(this.mapItemToEntity(itemRecord));
      }
      
      // Create cash transaction for the purchase (expense)
      try {
        await cashTransactionRepository.create(
          {
            storeId,
            type: 'chi',
            transactionDate: new Date(input.importDate).toISOString(),
            amount: input.totalAmount,
            reason: `Chi tiền nhập hàng - ${orderNumber}${input.supplierId ? ' từ nhà cung cấp' : ''}`,
            category: 'Nhập hàng',
            relatedInvoiceId: purchaseOrderId,
          },
          storeId
        );
        console.log(`[PurchaseOrderRepository] Created cash transaction for purchase ${orderNumber}: ${input.totalAmount}`);
      } catch (cashError) {
        // Log but don't fail the purchase if cash transaction fails
        console.error('[PurchaseOrderRepository] Failed to create cash transaction:', cashError);
      }
      
      return { ...this.mapToEntity(orderRecord as unknown as Record<string, unknown>), items };
    });
  }

  async findByIdWithDetails(purchaseOrderId: string, storeId: string): Promise<PurchaseOrderWithDetails | null> {
    const orderQuery = `SELECT po.*, s.name as supplier_name FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE po.id = @purchaseOrderId AND po.store_id = @storeId`;
    const orderResult = await queryOne<PurchaseOrderRecord & { supplier_name: string | null }>(orderQuery, { purchaseOrderId, storeId });
    if (!orderResult) return null;
    const itemsQuery = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
    const itemsResult = await query<PurchaseOrderItemRecord & { product_name: string | null; unit_name: string | null }>(itemsQuery, { purchaseOrderId });
    return {
      ...this.mapToEntity(orderResult as unknown as Record<string, unknown>),
      supplierName: orderResult.supplier_name || undefined,
      items: itemsResult.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined })),
    };
  }

  async findAllWithSupplier(storeId: string, options?: PaginationOptions & { search?: string; supplierId?: string; dateFrom?: string; dateTo?: string; }): Promise<PaginatedResult<PurchaseOrder & { supplierName?: string; itemCount: number; items?: PurchaseOrderItemWithProduct[] }>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const conditions: string[] = ['po.store_id = @storeId'];
    const params: QueryParams = { storeId };
    if (options?.search) { conditions.push('(po.order_number LIKE @search OR po.notes LIKE @search OR s.name LIKE @search)'); params.search = `%${options.search}%`; }
    if (options?.supplierId) { conditions.push('po.supplier_id = @supplierId'); params.supplierId = options.supplierId; }
    if (options?.dateFrom) { conditions.push('po.import_date >= @dateFrom'); params.dateFrom = new Date(options.dateFrom); }
    if (options?.dateTo) { conditions.push('po.import_date <= @dateTo'); params.dateTo = new Date(options.dateTo); }
    const whereClause = conditions.join(' AND ');
    const countQuery = `SELECT COUNT(*) as total FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: number }>(countQuery, params);
    const total = countResult?.total ?? 0;
    const orderBy = options?.orderBy || 'po.updated_at';
    const direction = options?.orderDirection || 'DESC';
    const dataQuery = `SELECT po.*, ISNULL(s.name, N'[Chưa có NCC]') as supplier_name, (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE ${whereClause} ORDER BY ${orderBy} ${direction} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
    const results = await query<PurchaseOrderRecord & { supplier_name: string | null; item_count: number }>(dataQuery, { ...params, offset, pageSize });
    
    // Fetch items for each purchase order
    const purchaseOrdersWithItems = await Promise.all(results.map(async (r) => {
      const itemsQuery = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
      const items = await query<PurchaseOrderItemRecord & { product_name: string | null; unit_name: string | null }>(itemsQuery, { purchaseOrderId: r.id });
      return {
        ...this.mapToEntity(r as unknown as Record<string, unknown>),
        supplierName: r.supplier_name || undefined,
        itemCount: r.item_count,
        items: items.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined }))
      };
    }));
    
    return { data: purchaseOrdersWithItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateWithItems(purchaseOrderId: string, input: Omit<CreatePurchaseOrderInput, 'createdBy'>, storeId: string): Promise<PurchaseOrderWithDetails> {
    return withTransaction(async (transaction) => {
      const existingOrder = await transactionQueryOne<PurchaseOrderRecord>(transaction, `SELECT * FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
      if (!existingOrder) throw new Error('Purchase order not found or access denied');
      await transactionQuery(transaction, `DELETE FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
      await transactionQuery(transaction, `DELETE FROM PurchaseOrderItems WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
      const updateQuery = `UPDATE PurchaseOrders SET supplier_id = @supplierId, import_date = @importDate, total_amount = @totalAmount, notes = @notes, updated_at = GETDATE() OUTPUT INSERTED.* WHERE id = @purchaseOrderId AND store_id = @storeId`;
      const updatedOrder = await transactionQueryOne<PurchaseOrderRecord>(transaction, updateQuery, { purchaseOrderId, storeId, supplierId: input.supplierId || null, importDate: new Date(input.importDate), totalAmount: input.totalAmount, notes: input.notes || null });
      if (!updatedOrder) throw new Error('Failed to update purchase order');
      const items: PurchaseOrderItemWithProduct[] = [];
      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        const lotId = crypto.randomUUID();
        
        // Use base values if provided, otherwise use original values
        const baseQuantity = item.baseQuantity || item.quantity;
        const baseCost = item.baseCost || item.cost;
        const baseUnitId = item.baseUnitId || item.unitId;
        
        const itemRecord = await transactionInsert<PurchaseOrderItemRecord>(transaction, 'PurchaseOrderItems', { 
          id: itemId, purchase_order_id: purchaseOrderId, product_id: item.productId, 
          quantity: item.quantity, cost: item.cost, unit_id: item.unitId,
          base_quantity: baseQuantity, base_cost: baseCost, base_unit_id: baseUnitId,
        });
        if (!itemRecord) throw new Error('Failed to create purchase order item');
        
        // PurchaseLots always use base unit values for inventory tracking
        await transactionInsert<PurchaseLotRecord>(transaction, 'PurchaseLots', { 
          id: lotId, product_id: item.productId, store_id: storeId, import_date: new Date(input.importDate), 
          quantity: baseQuantity, remaining_quantity: baseQuantity, cost: baseCost, unit_id: baseUnitId, 
          purchase_order_id: purchaseOrderId 
        });
        items.push(this.mapItemToEntity(itemRecord));
      }
      return { ...this.mapToEntity(updatedOrder as unknown as Record<string, unknown>), items };
    });
  }

  async deleteWithItems(purchaseOrderId: string, storeId: string): Promise<boolean> {
    return withTransaction(async (transaction) => {
      const existingOrder = await transactionQueryOne<PurchaseOrderRecord>(transaction, `SELECT * FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
      if (!existingOrder) throw new Error('Purchase order not found or access denied');
      
      // Check if any lots have been used
      const usedLots = await transactionQueryOne<{ count: number }>(transaction, `SELECT COUNT(*) as count FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId AND remaining_quantity < quantity`, { purchaseOrderId });
      if (usedLots && usedLots.count > 0) throw new Error('Cannot delete purchase order with used inventory');
      
      // Get all lots to update inventory
      const lots = await transactionQuery<{ product_id: string; quantity: number; unit_id: string }>(
        transaction,
        `SELECT product_id, quantity, unit_id FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`,
        { purchaseOrderId }
      );
      
      // Update ProductInventory - subtract quantities
      for (const lot of lots) {
        await transactionQuery(
          transaction,
          `UPDATE ProductInventory 
           SET Quantity = Quantity - @quantity, UpdatedAt = GETDATE() 
           WHERE ProductId = @productId AND StoreId = @storeId`,
          { productId: lot.product_id, storeId, quantity: lot.quantity }
        );
      }
      
      // Delete purchase lots
      await transactionQuery(transaction, `DELETE FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
      
      // Delete purchase order items
      await transactionQuery(transaction, `DELETE FROM PurchaseOrderItems WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
      
      // Delete purchase order
      await transactionQuery(transaction, `DELETE FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
      
      return true;
    });
  }

  async getItems(purchaseOrderId: string): Promise<PurchaseOrderItemWithProduct[]> {
    const queryString = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
    const results = await query<PurchaseOrderItemRecord & { product_name: string | null; unit_name: string | null }>(queryString, { purchaseOrderId });
    return results.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined }));
  }

  async getPurchaseLots(purchaseOrderId: string): Promise<PurchaseLot[]> {
    const queryString = `SELECT * FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId ORDER BY import_date ASC`;
    const results = await query<PurchaseLotRecord>(queryString, { purchaseOrderId });
    return results.map(r => this.mapLotToEntity(r));
  }

  async findBySupplier(supplierId: string, storeId: string, options?: QueryOptions): Promise<PurchaseOrder[]> {
    return this.findBy('supplier_id', supplierId, storeId, options);
  }

  async getTotalAmount(storeId: string, dateFrom?: string, dateTo?: string): Promise<number> {
    let queryString = `SELECT COALESCE(SUM(total_amount), 0) as Total FROM PurchaseOrders WHERE store_id = @storeId`;
    const params: QueryParams = { storeId };
    if (dateFrom) { queryString += ` AND import_date >= @dateFrom`; params.dateFrom = new Date(dateFrom); }
    if (dateTo) { queryString += ` AND import_date <= @dateTo`; params.dateTo = new Date(dateTo); }
    const result = await queryOne<{ Total: number }>(queryString, params);
    return result?.Total ?? 0;
  }

  async canDelete(purchaseOrderId: string, storeId: string): Promise<boolean> {
    const queryString = `SELECT COUNT(*) as count FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId AND store_id = @storeId AND remaining_quantity < quantity`;
    const result = await queryOne<{ count: number }>(queryString, { purchaseOrderId, storeId });
    return !result || result.count === 0;
  }
}

export const purchaseOrderRepository = new PurchaseOrderRepository();
