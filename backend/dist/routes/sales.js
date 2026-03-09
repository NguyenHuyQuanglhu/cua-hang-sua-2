"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services");
const sales_sp_repository_1 = require("../repositories/sales-sp-repository");
const pdfInvoiceService = __importStar(require("../services/pdf-invoice-service"));
const validateStatus_1 = require("../middleware/validateStatus");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// Helper function to generate invoice number
async function generateInvoiceNumber(storeId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `PN${year}${month}${day}`;
    const result = await (0, db_1.queryOne)(`SELECT TOP 1 invoice_number 
        FROM Sales 
        WHERE store_id = @storeId AND invoice_number LIKE @prefix + '%' 
        ORDER BY invoice_number DESC`, { storeId, prefix: datePrefix });
    let nextSequence = 1;
    if (result) {
        const lastSequence = parseInt(result.invoice_number.substring(datePrefix.length), 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }
    return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
}
// GET /api/sales
router.get('/', validateStatus_1.validateStatusQuery, async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { page = '1', pageSize = '20', search, status, customerId, dateFrom, dateTo } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        // Use SP Repository to get sales with filters
        const filters = {
            startDate: dateFrom ? new Date(dateFrom) : null,
            endDate: dateTo ? new Date(dateTo) : null,
            customerId: customerId && customerId !== 'all' ? customerId : null,
            status: status && status !== 'all' ? status : null,
        };
        let sales = await sales_sp_repository_1.salesSPRepository.getByStore(storeId, filters);
        // Filter by employee: only show sales created by current user
        // Exception: owner and company_manager can see all sales
        if (userRole !== 'owner' && userRole !== 'company_manager') {
            sales = sales.filter(s => s.createdBy === userId);
        }
        // Apply search filter (client-side since SP doesn't support it)
        if (search) {
            const searchLower = search.toLowerCase();
            sales = sales.filter(s => s.invoiceNumber?.toLowerCase().includes(searchLower) ||
                s.customerName?.toLowerCase().includes(searchLower));
        }
        // Calculate status counts for all sales (before pagination)
        const statusCounts = {
            pending: sales.filter(s => s.status === 'pending').length,
            processed: sales.filter(s => s.status === 'processed').length,
        };
        // Calculate pagination
        const total = sales.length;
        const totalPages = Math.ceil(total / pageSizeNum);
        const offset = (pageNum - 1) * pageSizeNum;
        const paginatedSales = sales.slice(offset, offset + pageSizeNum);
        // Get item counts for all paginated sales in a single query (fix N+1)
        let itemCountMap = {};
        if (paginatedSales.length > 0) {
            const saleIds = paginatedSales.map(s => s.id);
            const placeholders = saleIds.map((_, i) => `@id${i}`).join(',');
            const params = {};
            saleIds.forEach((id, i) => { params[`id${i}`] = id; });
            const countResults = await (0, db_1.query)(`SELECT sales_transaction_id, COUNT(*) as item_count
         FROM SalesItems
         WHERE sales_transaction_id IN (${placeholders})
         GROUP BY sales_transaction_id`, params);
            countResults.forEach(r => {
                itemCountMap[r.sales_transaction_id] = r.item_count;
            });
        }
        const salesWithItemCount = paginatedSales.map(s => ({
            ...s,
            itemCount: itemCountMap[s.id] || 0,
        }));
        res.json({
            success: true,
            data: salesWithItemCount.map((s) => ({
                id: s.id,
                storeId: s.storeId,
                invoiceNumber: s.invoiceNumber,
                customerId: s.customerId,
                customerName: s.customerName,
                shiftId: s.shiftId,
                transactionDate: s.transactionDate,
                status: s.status,
                totalAmount: s.totalAmount,
                vatAmount: s.vatAmount,
                finalAmount: s.finalAmount,
                discount: s.discount,
                discountType: s.discountType,
                discountValue: s.discountValue,
                tierDiscountPercentage: s.tierDiscountPercentage,
                tierDiscountAmount: s.tierDiscountAmount,
                pointsUsed: s.pointsUsed,
                pointsDiscount: s.pointsDiscount,
                customerPayment: s.customerPayment,
                previousDebt: s.previousDebt,
                remainingDebt: s.remainingDebt,
                paymentMethod: s.paymentMethod,
                itemCount: s.itemCount,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            })),
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages,
            counts: statusCounts,
        });
    }
    catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Failed to get sales' });
    }
});
// GET /api/sales/items/all - Get all sale items for dashboard (must be before /:id)
router.get('/items/all', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo } = req.query;
        let dateFilter = '';
        const params = { storeId };
        if (dateFrom) {
            dateFilter += ' AND s.transaction_date >= @dateFrom';
            params.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            dateFilter += ' AND s.transaction_date <= @dateTo';
            params.dateTo = new Date(dateTo);
        }
        // This query is specific and not covered by SP, keep inline
        const items = await (0, db_1.query)(`SELECT si.id, si.sales_transaction_id, si.product_id, si.quantity, si.price,
              p.name as product_name, s.transaction_date
       FROM SalesItems si
       JOIN Products p ON si.product_id = p.id
       JOIN Sales s ON si.sales_transaction_id = s.id
       WHERE s.store_id = @storeId${dateFilter}
       ORDER BY s.transaction_date DESC`, params);
        res.json({
            success: true,
            data: items.map((i) => ({
                id: i.id,
                salesTransactionId: i.sales_transaction_id,
                productId: i.product_id,
                productName: i.product_name,
                unitName: null,
                quantity: i.quantity,
                price: i.price,
                totalPrice: i.quantity * i.price,
                transactionDate: i.transaction_date,
            })),
        });
    }
    catch (error) {
        console.error('Get all sale items error:', error);
        res.status(500).json({ error: 'Failed to get sale items' });
    }
});
// GET /api/sales/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const result = await sales_sp_repository_1.salesSPRepository.getById(id, storeId);
        if (!result) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        const { sale, items } = result;
        res.json({
            sale: {
                id: sale.id,
                storeId: sale.storeId,
                invoiceNumber: sale.invoiceNumber,
                customerId: sale.customerId,
                customerName: sale.customerName,
                shiftId: sale.shiftId,
                transactionDate: sale.transactionDate,
                status: sale.status,
                totalAmount: sale.totalAmount,
                vatAmount: sale.vatAmount,
                finalAmount: sale.finalAmount,
                discount: sale.discount,
                discountType: sale.discountType,
                discountValue: sale.discountValue,
                tierDiscountPercentage: sale.tierDiscountPercentage,
                tierDiscountAmount: sale.tierDiscountAmount,
                pointsUsed: sale.pointsUsed,
                pointsDiscount: sale.pointsDiscount,
                customerPayment: sale.customerPayment,
                previousDebt: sale.previousDebt,
                remainingDebt: sale.remainingDebt,
                items: items.map((item) => ({
                    id: item.id,
                    salesId: item.salesTransactionId,
                    productId: item.productId,
                    productName: item.productName,
                    unitName: item.unitName,
                    quantity: item.quantity,
                    price: item.price,
                })),
            },
        });
    }
    catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({ error: 'Failed to get sale' });
    }
});
// GET /api/sales/:id/items
router.get('/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository to get sale with items
        const result = await sales_sp_repository_1.salesSPRepository.getById(id, storeId);
        if (!result) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        res.json({
            success: true,
            data: result.items.map((i) => ({
                id: i.id,
                saleId: i.salesTransactionId,
                productId: i.productId,
                productName: i.productName,
                unitName: i.unitName,
                quantity: i.quantity,
                price: i.price,
                unitPrice: i.price,
                totalPrice: i.quantity * i.price,
            })),
        });
    }
    catch (error) {
        console.error('Get sale items error:', error);
        res.status(500).json({ error: 'Failed to get sale items' });
    }
});
// POST /api/sales
router.post('/', validateStatus_1.validateAndNormalizeStatus, async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user.id;
        const { customerId, shiftId, items, totalAmount, vatAmount, finalAmount, discount, discountType, discountValue, customerPayment, previousDebt, remainingDebt, tierDiscountPercentage, tierDiscountAmount, pointsUsed, pointsDiscount, status } = req.body;
        // Convert previousDebt to number if it's a string
        const previousDebtAmount = previousDebt ? Number(previousDebt) : 0;
        const customerPaymentAmount = customerPayment ? Number(customerPayment) : 0;
        const totalAmountValue = totalAmount ? Number(totalAmount) : 0;
        // Set default status to "pending" if not provided (Requirement 2.2)
        const orderStatus = status || 'pending';
        console.log('[POST /api/sales] Creating sale:', {
            storeId, userId, customerId, shiftId,
            itemsCount: items?.length,
            totalAmount: totalAmountValue,
            finalAmount,
            previousDebt: previousDebtAmount,
            customerPayment: customerPaymentAmount,
            status: orderStatus
        });
        // Allow empty items if this is a debt payment only (previousDebt > 0 and totalAmount = 0)
        const isDebtPaymentOnly = previousDebtAmount > 0 && totalAmountValue === 0 && (!items || items.length === 0);
        // Validate items (unless it's debt payment only)
        if (!isDebtPaymentOnly && (!items || items.length === 0)) {
            res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm' });
            return;
        }
        // If debt payment only, create a simple sale record without inventory management
        if (isDebtPaymentOnly) {
            console.log('[POST /api/sales] Creating debt payment only sale');
            console.log('[POST /api/sales] Debt payment details:', {
                customerId,
                previousDebt: previousDebtAmount,
                customerPayment: customerPaymentAmount,
                totalAmount: totalAmountValue
            });
            const saleId = crypto.randomUUID();
            const invoiceNumber = await generateInvoiceNumber(storeId);
            await (0, db_1.query)(`INSERT INTO Sales (
          id, store_id, customer_id, shift_id, invoice_number, transaction_date,
          total_amount, discount, discount_type, discount_value, vat_amount, final_amount,
          customer_payment, previous_debt, remaining_debt, status, CreatedBy, created_at, updated_at
        ) VALUES (
          @id, @storeId, @customerId, @shiftId, @invoiceNumber, GETDATE(),
          @totalAmount, @discount, @discountType, @discountValue, @vatAmount, @finalAmount,
          @customerPayment, @previousDebt, @remainingDebt, @status, @createdBy, GETDATE(), GETDATE()
        )`, {
                id: saleId,
                storeId,
                customerId: customerId || null,
                shiftId: shiftId || null,
                invoiceNumber,
                totalAmount: 0,
                discount: 0,
                discountType: 'amount',
                discountValue: 0,
                vatAmount: 0,
                finalAmount: 0,
                customerPayment: customerPaymentAmount,
                previousDebt: previousDebtAmount,
                remainingDebt: 0, // Debt is paid
                status: orderStatus,
                createdBy: userId,
            });
            // Update customer debt and clear remaining_debt from old sales
            // IMPORTANT: Always run this if we have customerId and previousDebt
            if (customerId && previousDebtAmount > 0) {
                console.log('[POST /api/sales] ✓ Starting debt update process');
                console.log('[POST /api/sales] Customer ID:', customerId);
                console.log('[POST /api/sales] Previous Debt:', previousDebtAmount);
                console.log('[POST /api/sales] Store ID:', storeId);
                // First, update the customer's total_debt
                const updateCustomerResult = await (0, db_1.query)(`UPDATE Customers 
           SET total_debt = ISNULL(total_debt, 0) - @previousDebt,
               total_paid = ISNULL(total_paid, 0) + @previousDebt,
               updated_at = GETDATE()
           WHERE id = @customerId AND store_id = @storeId`, { customerId, previousDebt: previousDebtAmount, storeId });
                console.log('[POST /api/sales] ✓ Customer table updated');
                // Then, clear remaining_debt from old sales (FIFO - oldest first)
                // Get all sales with remaining debt
                const salesWithDebt = await (0, db_1.query)(`SELECT id, remaining_debt, transaction_date, created_at, invoice_number
           FROM Sales
           WHERE customer_id = @customerId 
             AND store_id = @storeId 
             AND remaining_debt > 0
           ORDER BY transaction_date ASC, created_at ASC`, { customerId, storeId });
                console.log('[POST /api/sales] ✓ Found', salesWithDebt.length, 'sales with debt');
                // Apply payment to sales (FIFO)
                let remainingPayment = previousDebtAmount;
                for (const sale of salesWithDebt) {
                    if (remainingPayment <= 0)
                        break;
                    const debtToPay = Math.min(sale.remaining_debt, remainingPayment);
                    const newRemainingDebt = sale.remaining_debt - debtToPay;
                    console.log('[POST /api/sales] ✓ Updating sale:', {
                        invoice: sale.invoice_number,
                        saleId: sale.id,
                        oldDebt: sale.remaining_debt,
                        payment: debtToPay,
                        newDebt: newRemainingDebt
                    });
                    await (0, db_1.query)(`UPDATE Sales
             SET remaining_debt = @newRemainingDebt,
                 updated_at = GETDATE()
             WHERE id = @saleId`, { saleId: sale.id, newRemainingDebt });
                    remainingPayment -= debtToPay;
                }
                console.log('[POST /api/sales] ✓ Debt update completed successfully!');
                console.log('[POST /api/sales] Remaining payment after allocation:', remainingPayment);
            }
            else {
                console.log('[POST /api/sales] ✗ SKIPPING debt update');
                console.log('[POST /api/sales] Reason: customerId =', customerId, '(type:', typeof customerId, ')');
                console.log('[POST /api/sales] Reason: previousDebt =', previousDebtAmount, '(type:', typeof previousDebtAmount, ')');
            }
            console.log('[POST /api/sales] Debt payment sale created:', saleId, invoiceNumber);
            res.status(201).json({
                id: saleId,
                invoiceNumber,
                status: orderStatus,
                finalAmount: 0,
                customerPayment: customerPaymentAmount,
                previousDebt: previousDebtAmount,
                totalAmount: 0,
                conversions: [],
            });
            return;
        }
        // Map items to include unitId
        const mappedItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price ?? item.unitPrice,
            unitId: item.unitId, // Support unitId for unit conversion
        }));
        // Use SalesService to create sale with inventory management
        // Note: SalesService handles complex inventory deduction logic
        const result = await services_1.salesService.createSale({
            customerId,
            shiftId,
            items: mappedItems,
            discount,
            discountType,
            discountValue,
            tierDiscountPercentage,
            tierDiscountAmount,
            pointsUsed,
            pointsDiscount,
            customerPayment,
            previousDebt,
            vatAmount,
            status: orderStatus, // Pass the status to the service
        }, storeId, userId);
        console.log('[POST /api/sales] Sale created:', result.sale.id, result.sale.invoiceNumber);
        if (result.conversions.length > 0) {
            console.log('[POST /api/sales] Auto conversions:', result.conversions.length);
        }
        res.status(201).json({
            id: result.sale.id,
            invoiceNumber: result.sale.invoiceNumber,
            status: result.sale.status,
            finalAmount: result.sale.finalAmount,
            conversions: result.conversions.map((c) => ({
                id: c.id,
                productId: c.productId,
                conversionType: c.conversionType,
                conversionUnitChange: c.conversionUnitChange,
                baseUnitChange: c.baseUnitChange,
                notes: c.notes,
            })),
        });
    }
    catch (error) {
        console.error('Create sale error:', error);
        // Handle insufficient stock error
        if (error instanceof services_1.InventoryInsufficientStockError) {
            res.status(400).json({
                error: error.message,
                code: 'INSUFFICIENT_STOCK',
                productId: error.productId,
                requestedQuantity: error.requestedQuantity,
                availableQuantity: error.availableQuantity,
                unitId: error.unitId,
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Catch SQL Server RAISERROR for insufficient stock caused by concurrent transaction race conditions
        if (errorMessage.includes('Insufficient stock for product')) {
            res.status(400).json({
                error: 'Sản phẩm đã hết hàng hoặc không đủ số lượng để bán. Vui lòng kiểm tra lại tồn kho.',
                code: 'INSUFFICIENT_STOCK',
                details: errorMessage
            });
            return;
        }
        res.status(500).json({ error: `Failed to create sale: ${errorMessage}` });
    }
});
// PUT /api/sales/:id
router.put('/:id', validateStatus_1.validateAndNormalizeStatus, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { status, customerPayment, remainingDebt } = req.body;
        console.log('[Sales PUT] Update request:', {
            id,
            storeId,
            status,
            customerPayment,
            remainingDebt,
        });
        // Use SP Repository for status update if only status is being updated
        if (status && !customerPayment && !remainingDebt) {
            console.log('[Sales PUT] Using SP for status update');
            const updated = await sales_sp_repository_1.salesSPRepository.updateStatus(id, storeId, status);
            console.log('[Sales PUT] SP result:', updated);
            if (!updated) {
                console.error('[Sales PUT] Sale not found:', { id, storeId });
                res.status(404).json({ error: 'Sale not found' });
                return;
            }
            res.json({ success: true });
            return;
        }
        // For other updates, use inline query (SP doesn't support partial updates)
        console.log('[Sales PUT] Using inline query for update');
        await (0, db_1.query)(`UPDATE Sales SET 
        status = COALESCE(@status, status),
        customer_payment = COALESCE(@customerPayment, customer_payment),
        remaining_debt = COALESCE(@remainingDebt, remaining_debt),
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, { id, storeId, status, customerPayment, remainingDebt });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update sale error:', error);
        res.status(500).json({ error: 'Failed to update sale' });
    }
});
// PATCH /api/sales/:id - Update sale status (Requirement 2.3, 2.4, 3.1)
router.patch('/:id', validateStatus_1.validateAndNormalizeStatus, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { status, customerPayment, remainingDebt } = req.body;
        console.log('[Sales PATCH] Update request:', {
            id,
            storeId,
            status,
            customerPayment,
            remainingDebt,
        });
        // Use SP Repository for status update if only status is being updated
        if (status && !customerPayment && !remainingDebt) {
            console.log('[Sales PATCH] Using SP for status update');
            const updated = await sales_sp_repository_1.salesSPRepository.updateStatus(id, storeId, status);
            console.log('[Sales PATCH] SP result:', updated);
            if (!updated) {
                console.error('[Sales PATCH] Sale not found:', { id, storeId });
                res.status(404).json({ error: 'Sale not found' });
                return;
            }
            res.json({ success: true });
            return;
        }
        // For other updates, use inline query (SP doesn't support partial updates)
        console.log('[Sales PATCH] Using inline query for update');
        const result = await (0, db_1.query)(`UPDATE Sales SET 
        status = COALESCE(@status, status),
        customer_payment = COALESCE(@customerPayment, customer_payment),
        remaining_debt = COALESCE(@remainingDebt, remaining_debt),
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, { id, storeId, status, customerPayment, remainingDebt });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update sale error:', error);
        res.status(500).json({ error: 'Failed to update sale' });
    }
});
// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Delete sale items first
        await (0, db_1.query)('DELETE FROM SalesItems WHERE sales_transaction_id = @id', { id });
        // Delete sale
        await (0, db_1.query)('DELETE FROM Sales WHERE id = @id AND store_id = @storeId', { id, storeId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete sale error:', error);
        res.status(500).json({ error: 'Failed to delete sale' });
    }
});
// GET /api/sales/:id/invoice-pdf - Generate PDF invoice
router.get('/:id/invoice-pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        // Get invoice data
        const invoiceData = await pdfInvoiceService.getSaleForInvoice(parseInt(id), storeId, tenantId);
        if (!invoiceData) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        // Generate PDF
        const pdfBuffer = await pdfInvoiceService.generateInvoicePDF(invoiceData);
        // Send PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceNumber}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Generate invoice PDF error:', error);
        res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
});
exports.default = router;
//# sourceMappingURL=sales.js.map