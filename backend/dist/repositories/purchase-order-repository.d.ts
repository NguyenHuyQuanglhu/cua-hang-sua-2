import { BaseRepository, QueryOptions, PaginationOptions, PaginatedResult } from './base-repository';
import { SqlValue } from '../db';
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
export declare class PurchaseOrderRepository extends BaseRepository<PurchaseOrder> {
    constructor();
    protected mapToEntity(record: Record<string, unknown>): PurchaseOrder;
    protected mapToRecord(entity: Partial<PurchaseOrder>): Record<string, SqlValue>;
    private mapItemToEntity;
    private mapLotToEntity;
    generateOrderNumber(storeId: string): Promise<string>;
    createWithItems(input: CreatePurchaseOrderInput, storeId: string): Promise<PurchaseOrderWithDetails>;
    findByIdWithDetails(purchaseOrderId: string, storeId: string): Promise<PurchaseOrderWithDetails | null>;
    findAllWithSupplier(storeId: string, options?: PaginationOptions & {
        search?: string;
        supplierId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PaginatedResult<PurchaseOrder & {
        supplierName?: string;
        itemCount: number;
        items?: PurchaseOrderItemWithProduct[];
    }>>;
    updateWithItems(purchaseOrderId: string, input: Omit<CreatePurchaseOrderInput, 'createdBy'>, storeId: string): Promise<PurchaseOrderWithDetails>;
    deleteWithItems(purchaseOrderId: string, storeId: string): Promise<boolean>;
    getItems(purchaseOrderId: string): Promise<PurchaseOrderItemWithProduct[]>;
    getPurchaseLots(purchaseOrderId: string): Promise<PurchaseLot[]>;
    findBySupplier(supplierId: string, storeId: string, options?: QueryOptions): Promise<PurchaseOrder[]>;
    getTotalAmount(storeId: string, dateFrom?: string, dateTo?: string): Promise<number>;
    canDelete(purchaseOrderId: string, storeId: string): Promise<boolean>;
}
export declare const purchaseOrderRepository: PurchaseOrderRepository;
//# sourceMappingURL=purchase-order-repository.d.ts.map