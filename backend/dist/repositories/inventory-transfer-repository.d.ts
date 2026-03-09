import { PaginationOptions, PaginatedResult } from './base-repository';
export interface InventoryTransfer {
    id: string;
    sourceStoreId: string;
    destinationStoreId: string;
    transferNumber: string;
    transferDate: string;
    status: 'pending' | 'completed' | 'cancelled';
    notes?: string;
    createdBy?: string;
    createdAt: string;
}
export interface InventoryTransferItem {
    id: string;
    transferId: string;
    productId: string;
    quantity: number;
    cost: number;
    unitId: string;
    sourceLotId?: string;
    createdAt: string;
}
export interface InventoryTransferWithDetails extends InventoryTransfer {
    items: InventoryTransferItemWithProduct[];
    sourceStoreName?: string;
    destinationStoreName?: string;
}
export interface InventoryTransferItemWithProduct extends InventoryTransferItem {
    productName?: string;
    unitName?: string;
}
export interface CreateInventoryTransferInput {
    sourceStoreId: string;
    destinationStoreId: string;
    transferDate: string;
    notes?: string;
    createdBy?: string;
    items: CreateInventoryTransferItemInput[];
}
export interface CreateInventoryTransferItemInput {
    productId: string;
    quantity: number;
    cost: number;
    unitId: string;
    sourceLotId?: string;
}
export declare class InventoryTransferRepository {
    private tableName;
    private mapToEntity;
    private mapItemToEntity;
    generateTransferNumber(): Promise<string>;
    create(input: CreateInventoryTransferInput): Promise<InventoryTransferWithDetails>;
    findById(transferId: string): Promise<InventoryTransferWithDetails | null>;
    findByStore(storeId: string, type?: 'source' | 'destination' | 'both', options?: PaginationOptions): Promise<PaginatedResult<InventoryTransfer & {
        sourceStoreName?: string;
        destinationStoreName?: string;
        itemCount: number;
    }>>;
    getItems(transferId: string): Promise<InventoryTransferItemWithProduct[]>;
}
export declare const inventoryTransferRepository: InventoryTransferRepository;
//# sourceMappingURL=inventory-transfer-repository.d.ts.map