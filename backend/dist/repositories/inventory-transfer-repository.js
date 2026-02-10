"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryTransferRepository = exports.InventoryTransferRepository = void 0;
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
class InventoryTransferRepository {
    tableName = 'InventoryTransfers';
    mapToEntity(record) {
        return {
            id: record.Id,
            sourceStoreId: record.SourceStoreId,
            destinationStoreId: record.DestinationStoreId,
            transferNumber: record.TransferNumber,
            transferDate: record.TransferDate instanceof Date
                ? record.TransferDate.toISOString()
                : String(record.TransferDate),
            status: record.Status,
            notes: record.Notes || undefined,
            createdBy: record.CreatedBy || undefined,
            createdAt: record.CreatedAt instanceof Date
                ? record.CreatedAt.toISOString()
                : String(record.CreatedAt),
        };
    }
    mapItemToEntity(record) {
        return {
            id: record.Id,
            transferId: record.TransferId,
            productId: record.ProductId,
            quantity: record.Quantity,
            cost: record.Cost,
            unitId: record.UnitId,
            sourceLotId: record.SourceLotId || undefined,
            createdAt: record.CreatedAt instanceof Date
                ? record.CreatedAt.toISOString()
                : String(record.CreatedAt),
        };
    }
    async generateTransferNumber() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const datePrefix = `TF${year}${month}`;
        const queryString = `
      SELECT TOP 1 TransferNumber 
      FROM InventoryTransfers 
      WHERE TransferNumber LIKE @prefix + '%' 
      ORDER BY TransferNumber DESC
    `;
        const result = await (0, db_1.queryOne)(queryString, { prefix: datePrefix });
        let nextSequence = 1;
        if (result) {
            const lastSequence = parseInt(result.TransferNumber.substring(datePrefix.length), 10);
            if (!isNaN(lastSequence)) {
                nextSequence = lastSequence + 1;
            }
        }
        return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
    }
    async create(input) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const transferNumber = await this.generateTransferNumber();
            const transferId = crypto.randomUUID();
            const now = new Date();
            const insertQuery = `
        INSERT INTO InventoryTransfers (Id, SourceStoreId, DestinationStoreId, TransferNumber, TransferDate, Status, Notes, CreatedBy, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@id, @sourceStoreId, @destinationStoreId, @transferNumber, @transferDate, @status, @notes, @createdBy, @createdAt)
      `;
            const transferResult = await (0, transaction_1.transactionQueryOne)(transaction, insertQuery, {
                id: transferId,
                sourceStoreId: input.sourceStoreId,
                destinationStoreId: input.destinationStoreId,
                transferNumber,
                transferDate: new Date(input.transferDate),
                status: 'completed',
                notes: input.notes || null,
                createdBy: input.createdBy || null,
                createdAt: now,
            });
            if (!transferResult) {
                throw new Error('Failed to create inventory transfer');
            }
            const items = [];
            for (const item of input.items) {
                const itemId = crypto.randomUUID();
                const itemInsertQuery = `
          INSERT INTO InventoryTransferItems (Id, TransferId, ProductId, Quantity, Cost, UnitId, SourceLotId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@id, @transferId, @productId, @quantity, @cost, @unitId, @sourceLotId, @createdAt)
        `;
                const itemResult = await (0, transaction_1.transactionQueryOne)(transaction, itemInsertQuery, {
                    id: itemId,
                    transferId,
                    productId: item.productId,
                    quantity: item.quantity,
                    cost: item.cost,
                    unitId: item.unitId,
                    sourceLotId: item.sourceLotId || null,
                    createdAt: now,
                });
                if (!itemResult) {
                    throw new Error('Failed to create inventory transfer item');
                }
                items.push(this.mapItemToEntity(itemResult));
            }
            return {
                ...this.mapToEntity(transferResult),
                items,
            };
        });
    }
    async findById(transferId) {
        const transferQuery = `
      SELECT it.*, 
             ss.name as SourceStoreName, 
             ds.name as DestinationStoreName
      FROM InventoryTransfers it
      LEFT JOIN Stores ss ON it.SourceStoreId = ss.Id
      LEFT JOIN Stores ds ON it.DestinationStoreId = ds.Id
      WHERE it.Id = @transferId
    `;
        const transferResult = await (0, db_1.queryOne)(transferQuery, { transferId });
        if (!transferResult) {
            return null;
        }
        const itemsQuery = `
      SELECT iti.*, 
             p.name as ProductName, 
             u.name as UnitName
      FROM InventoryTransferItems iti
      LEFT JOIN Products p ON iti.ProductId = p.id
      LEFT JOIN Units u ON iti.UnitId = u.id
      WHERE iti.TransferId = @transferId
    `;
        const itemsResult = await (0, db_1.query)(itemsQuery, { transferId });
        return {
            ...this.mapToEntity(transferResult),
            sourceStoreName: transferResult.SourceStoreName || undefined,
            destinationStoreName: transferResult.DestinationStoreName || undefined,
            items: itemsResult.map(item => ({
                ...this.mapItemToEntity(item),
                productName: item.ProductName || undefined,
                unitName: item.UnitName || undefined,
            })),
        };
    }
    async findByStore(storeId, type = 'both', options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let whereClause;
        if (type === 'source') {
            whereClause = 'it.SourceStoreId = @storeId';
        }
        else if (type === 'destination') {
            whereClause = 'it.DestinationStoreId = @storeId';
        }
        else {
            whereClause = '(it.SourceStoreId = @storeId OR it.DestinationStoreId = @storeId)';
        }
        const countQuery = `
      SELECT COUNT(*) as total 
      FROM InventoryTransfers it 
      WHERE ${whereClause}
    `;
        const countResult = await (0, db_1.queryOne)(countQuery, { storeId });
        const total = countResult?.total ?? 0;
        const orderBy = options?.orderBy || 'it.TransferDate';
        const direction = options?.orderDirection || 'DESC';
        const dataQuery = `
      SELECT it.*, 
             ss.name as SourceStoreName, 
             ds.name as DestinationStoreName,
             (SELECT COUNT(*) FROM InventoryTransferItems WHERE TransferId = it.Id) as ItemCount
      FROM InventoryTransfers it
      LEFT JOIN Stores ss ON it.SourceStoreId = ss.Id
      LEFT JOIN Stores ds ON it.DestinationStoreId = ds.Id
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;
        const results = await (0, db_1.query)(dataQuery, { storeId, offset, pageSize });
        return {
            data: results.map(r => ({
                ...this.mapToEntity(r),
                sourceStoreName: r.SourceStoreName || undefined,
                destinationStoreName: r.DestinationStoreName || undefined,
                itemCount: r.ItemCount,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async getItems(transferId) {
        const queryString = `
      SELECT iti.*, 
             p.name as ProductName, 
             u.name as UnitName
      FROM InventoryTransferItems iti
      LEFT JOIN Products p ON iti.ProductId = p.id
      LEFT JOIN Units u ON iti.UnitId = u.id
      WHERE iti.TransferId = @transferId
    `;
        const results = await (0, db_1.query)(queryString, { transferId });
        return results.map(item => ({
            ...this.mapItemToEntity(item),
            productName: item.ProductName || undefined,
            unitName: item.UnitName || undefined,
        }));
    }
}
exports.InventoryTransferRepository = InventoryTransferRepository;
exports.inventoryTransferRepository = new InventoryTransferRepository();
//# sourceMappingURL=inventory-transfer-repository.js.map