"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefund = createRefund;
exports.getRefunds = getRefunds;
exports.getRefundById = getRefundById;
const db_1 = require("../db");
// Create a refund for a sale
async function createRefund(request, storeId, tenantId, userId) {
    const transaction = await (0, db_1.beginTransaction)();
    try {
        // Verify sale exists and belongs to store
        const saleResult = await (0, db_1.executeQuery)(`SELECT s.*, c.CustomerID
       FROM Sales s
       LEFT JOIN Customers c ON s.CustomerID = c.CustomerID
       WHERE s.SaleID = @saleId AND s.StoreID = @storeId AND s.TenantID = @tenantId`, { saleId: request.saleId, storeId, tenantId }, transaction);
        if (!saleResult.recordset || saleResult.recordset.length === 0) {
            throw new Error('Sale not found');
        }
        const sale = saleResult.recordset[0];
        // Check if sale is already fully refunded
        if (sale.Status === 'refunded') {
            throw new Error('Sale has already been fully refunded');
        }
        // Generate refund number
        const refundNumber = `RF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        // Calculate total refund amount
        let totalRefundAmount = 0;
        const refundItems = [];
        for (const item of request.items) {
            // Get sale item details
            const itemResult = await (0, db_1.executeQuery)(`SELECT si.*, p.ProductName
         FROM SaleItems si
         JOIN Products p ON si.ProductID = p.ProductID
         WHERE si.SaleItemID = @saleItemId AND si.SaleID = @saleId`, { saleItemId: item.saleItemId, saleId: request.saleId }, transaction);
            if (!itemResult.recordset || itemResult.recordset.length === 0) {
                throw new Error(`Sale item ${item.saleItemId} not found`);
            }
            const saleItem = itemResult.recordset[0];
            // Validate refund quantity
            if (item.quantity > saleItem.Quantity) {
                throw new Error(`Refund quantity exceeds original quantity for ${saleItem.ProductName}`);
            }
            // Check if item was already refunded
            const existingRefundResult = await (0, db_1.executeQuery)(`SELECT ISNULL(SUM(Quantity), 0) as RefundedQty
         FROM RefundItems
         WHERE SaleItemID = @saleItemId`, { saleItemId: item.saleItemId }, transaction);
            const alreadyRefunded = existingRefundResult.recordset?.[0]?.RefundedQty || 0;
            const remainingQty = saleItem.Quantity - alreadyRefunded;
            if (item.quantity > remainingQty) {
                throw new Error(`Cannot refund ${item.quantity} units. Only ${remainingQty} available for refund.`);
            }
            const unitPrice = saleItem.UnitPrice;
            const refundAmount = unitPrice * item.quantity;
            totalRefundAmount += refundAmount;
            refundItems.push({
                saleItemId: item.saleItemId,
                productId: item.productId,
                quantity: item.quantity,
                unitId: item.unitId || saleItem.UnitID,
                unitPrice,
                refundAmount,
                reason: item.reason || null,
            });
        }
        // Create refund record
        const insertRefundResult = await (0, db_1.executeQuery)(`INSERT INTO Refunds (
        TenantID, StoreID, SaleID, RefundNumber, RefundType, RefundMethod,
        TotalAmount, Reason, Notes, Status, CreatedBy, CreatedAt
      ) OUTPUT INSERTED.RefundID
      VALUES (
        @tenantId, @storeId, @saleId, @refundNumber, @refundType, @refundMethod,
        @totalAmount, @reason, @notes, 'completed', @userId, GETDATE()
      )`, {
            tenantId,
            storeId,
            saleId: request.saleId,
            refundNumber,
            refundType: request.refundType,
            refundMethod: request.refundMethod,
            totalAmount: totalRefundAmount,
            reason: request.reason,
            notes: request.notes || null,
            userId,
        }, transaction);
        const refundId = insertRefundResult.recordset?.[0]?.RefundID;
        if (!refundId) {
            throw new Error('Failed to create refund record');
        }
        // Create refund items and restore inventory
        for (const item of refundItems) {
            // Insert refund item
            await (0, db_1.executeQuery)(`INSERT INTO RefundItems (
          RefundID, SaleItemID, ProductID, UnitID, Quantity, UnitPrice, RefundAmount, Reason
        ) VALUES (
          @refundId, @saleItemId, @productId, @unitId, @quantity, @unitPrice, @refundAmount, @reason
        )`, {
                refundId,
                saleItemId: item.saleItemId,
                productId: item.productId,
                unitId: item.unitId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                refundAmount: item.refundAmount,
                reason: item.reason,
            }, transaction);
            // Restore inventory
            await (0, db_1.executeQuery)(`UPDATE ProductInventory
         SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE()
         WHERE ProductID = @productId AND StoreID = @storeId`, { productId: item.productId, storeId, quantity: item.quantity }, transaction);
        }
        // Update sale status if full refund
        if (request.refundType === 'full') {
            await (0, db_1.executeQuery)(`UPDATE Sales SET Status = 'refunded', UpdatedAt = GETDATE() WHERE SaleID = @saleId`, { saleId: request.saleId }, transaction);
        }
        else {
            await (0, db_1.executeQuery)(`UPDATE Sales SET Status = 'partially_refunded', UpdatedAt = GETDATE() WHERE SaleID = @saleId`, { saleId: request.saleId }, transaction);
        }
        // If store credit, add to customer balance
        if (request.refundMethod === 'store_credit' && sale.CustomerID) {
            await (0, db_1.executeQuery)(`UPDATE Customers
         SET StoreCredit = ISNULL(StoreCredit, 0) + @amount, UpdatedAt = GETDATE()
         WHERE CustomerID = @customerId`, { customerId: sale.CustomerID, amount: totalRefundAmount }, transaction);
        }
        await (0, db_1.commitTransaction)(transaction);
        return {
            refundId,
            refundNumber,
            totalRefundAmount,
            status: 'completed',
        };
    }
    catch (error) {
        await (0, db_1.rollbackTransaction)(transaction);
        throw error;
    }
}
// Get refunds for a store
async function getRefunds(storeId, tenantId, options = {}) {
    const { page = 1, pageSize = 20, saleId } = options;
    const offset = (page - 1) * pageSize;
    let whereClause = 'r.StoreID = @storeId AND r.TenantID = @tenantId';
    const params = { storeId, tenantId };
    if (saleId) {
        whereClause += ' AND r.SaleID = @saleId';
        params.saleId = saleId;
    }
    const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) as total FROM Refunds r WHERE ${whereClause}`, params);
    const total = countResult.recordset?.[0]?.total || 0;
    const result = await (0, db_1.executeQuery)(`SELECT r.*, s.InvoiceNumber, u.FullName as CreatedByName
     FROM Refunds r
     LEFT JOIN Sales s ON r.SaleID = s.SaleID
     LEFT JOIN Users u ON r.CreatedBy = u.UserID
     WHERE ${whereClause}
     ORDER BY r.CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { ...params, offset, pageSize });
    return {
        refunds: result.recordset || [],
        total,
    };
}
// Get refund by ID
async function getRefundById(refundId, storeId, tenantId) {
    const refundResult = await (0, db_1.executeQuery)(`SELECT r.*, s.InvoiceNumber, u.FullName as CreatedByName
     FROM Refunds r
     LEFT JOIN Sales s ON r.SaleID = s.SaleID
     LEFT JOIN Users u ON r.CreatedBy = u.UserID
     WHERE r.RefundID = @refundId AND r.StoreID = @storeId AND r.TenantID = @tenantId`, { refundId, storeId, tenantId });
    if (!refundResult.recordset || refundResult.recordset.length === 0) {
        return null;
    }
    const itemsResult = await (0, db_1.executeQuery)(`SELECT ri.*, p.ProductName, u.UnitName
     FROM RefundItems ri
     LEFT JOIN Products p ON ri.ProductID = p.ProductID
     LEFT JOIN Units u ON ri.UnitID = u.UnitID
     WHERE ri.RefundID = @refundId`, { refundId });
    return {
        refund: refundResult.recordset[0],
        items: itemsResult.recordset || [],
    };
}
//# sourceMappingURL=refund-service.js.map