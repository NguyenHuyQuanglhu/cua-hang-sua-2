"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/reports/revenue
router.get('/revenue', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { from, to } = req.query;
        const result = await (0, db_1.query)(`SELECT 
        CAST(TransactionDate AS DATE) as Date,
        SUM(FinalAmount) as Revenue,
        COUNT(*) as OrderCount
       FROM Sales
       WHERE StoreId = @storeId
         AND TransactionDate >= @from
         AND TransactionDate <= @to
       GROUP BY CAST(TransactionDate AS DATE)
       ORDER BY Date`, { storeId, from, to });
        res.json(result);
    }
    catch (error) {
        console.error('Get revenue report error:', error);
        res.status(500).json({ error: 'Failed to get revenue report' });
    }
});
// GET /api/reports/supplier-debt
router.get('/supplier-debt', async (req, res) => {
    try {
        const storeId = req.storeId;
        // Get all suppliers
        const suppliers = await (0, db_1.query)(`SELECT id, name, contact_person, phone FROM Suppliers WHERE store_id = @storeId`, { storeId });
        // Primary source: PurchaseOrders remaining_debt (same logic as supplier debt report page)
        let purchaseTotals = {};
        let paidTotals = {};
        let debtTotals = {};
        try {
            const purchaseSummary = await (0, db_1.query)(`SELECT
           supplier_id,
           SUM(COALESCE(total_amount, 0)) as total_purchases,
           SUM(COALESCE(paid_amount, 0)) as total_paid,
           SUM(COALESCE(remaining_debt, COALESCE(total_amount, 0) - COALESCE(paid_amount, 0))) as total_debt
         FROM PurchaseOrders
         WHERE store_id = @storeId AND supplier_id IS NOT NULL
         GROUP BY supplier_id`, { storeId });
            purchaseSummary.forEach((row) => {
                const supplierId = row.supplier_id;
                if (!supplierId)
                    return;
                purchaseTotals[supplierId] = Number(row.total_purchases) || 0;
                paidTotals[supplierId] = Number(row.total_paid) || 0;
                debtTotals[supplierId] = Number(row.total_debt) || 0;
            });
        }
        catch {
            // Backward-compatible fallback for environments without paid_amount/remaining_debt columns.
            let paymentTotals = {};
            try {
                const purchases = await (0, db_1.query)(`SELECT supplier_id, SUM(total_amount) as total
           FROM PurchaseOrders
           WHERE store_id = @storeId AND supplier_id IS NOT NULL
           GROUP BY supplier_id`, { storeId });
                purchaseTotals = purchases.reduce((acc, p) => {
                    acc[p.supplier_id] = Number(p.total) || 0;
                    return acc;
                }, {});
            }
            catch {
                // PurchaseOrders table may not exist
            }
            try {
                const payments = await (0, db_1.query)(`SELECT supplier_id, SUM(amount) as total
           FROM SupplierPayments
           WHERE store_id = @storeId AND supplier_id IS NOT NULL
           GROUP BY supplier_id`, { storeId });
                paymentTotals = payments.reduce((acc, p) => {
                    acc[p.supplier_id] = Number(p.total) || 0;
                    return acc;
                }, {});
            }
            catch {
                // SupplierPayments table may not exist
            }
            paidTotals = paymentTotals;
            debtTotals = Object.keys(purchaseTotals).reduce((acc, supplierId) => {
                const totalPurchases = purchaseTotals[supplierId] || 0;
                const totalPaid = paymentTotals[supplierId] || 0;
                acc[supplierId] = totalPurchases - totalPaid;
                return acc;
            }, {});
        }
        // Calculate debt for each supplier and filter those with debt > 0
        const suppliersWithDebt = suppliers
            .map(supplier => {
            const totalPurchases = purchaseTotals[supplier.id] || 0;
            const totalPaid = paidTotals[supplier.id] || 0;
            const totalDebt = debtTotals[supplier.id] || 0;
            return {
                id: supplier.id,
                supplierName: supplier.name,
                contactPerson: supplier.contact_person,
                phone: supplier.phone,
                totalPurchases,
                totalPaid,
                totalDebt
            };
        })
            .filter(supplier => supplier.totalDebt > 0);
        res.json({ success: true, data: suppliersWithDebt });
    }
    catch (error) {
        console.error('Get supplier debt report error:', error);
        res.status(500).json({ error: 'Failed to get supplier debt report' });
    }
});
// GET /api/reports/debt
router.get('/debt', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { hasDebtOnly } = req.query;
        const customersResult = await (0, db_1.query)(`SELECT
        c.id,
        c.full_name as customerName,
        c.phone,
        c.total_debt as historicalDebt,
        c.total_paid as historicalPaid,
        -- Calculate accurate current debt from Sales
        (
            SELECT COALESCE(SUM(s.remaining_debt), 0)
            FROM Sales s
            WHERE s.customer_id = c.id AND s.remaining_debt > 0
        ) AS currentDebt,
        c.customer_group as customerGroup
       FROM Customers c
       WHERE c.store_id = @storeId`, { storeId });
        // Map and calculate actual debt
        let totalDebt = 0;
        let data = customersResult.map(c => {
            const debtValue = c.currentDebt > 0 ? c.currentDebt : 0;
            totalDebt += debtValue;
            return {
                id: c.id,
                customerName: c.customerName,
                phone: c.phone,
                totalDebt: debtValue,
                customerGroup: c.customerGroup
            };
        });
        if (hasDebtOnly === 'true') {
            data = data.filter(c => c.totalDebt > 0);
        }
        res.json({
            success: true,
            data,
            totals: {
                totalDebt
            }
        });
    }
    catch (error) {
        console.error('Get customer debt report error:', error);
        res.status(500).json({ success: false, error: 'Failed to get customer debt report' });
    }
});
// GET /api/reports/sales - Sales report with filters
router.get('/sales', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo, includeDetails } = req.query;
        // Get detailed sales data
        const salesData = await (0, db_1.query)(`SELECT
        s.id, s.invoice_number as invoiceNumber, s.transaction_date as transactionDate,
        s.total_amount as totalAmount, s.vat_amount as vatAmount, s.discount,
        s.final_amount as finalAmount, s.status,
        c.full_name as customerName
       FROM Sales s
       LEFT JOIN Customers c ON s.customer_id = c.id
       WHERE s.store_id = @storeId
         AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
         AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
       ORDER BY s.transaction_date DESC`, { storeId, dateFrom: dateFrom || null, dateTo: dateTo || null });
        // Calculate summary by date
        const summaryMap = new Map();
        let totalSales = 0;
        let totalRevenue = 0;
        let totalVat = 0;
        let totalDiscount = 0;
        for (const sale of salesData) {
            const dateKey = new Date(sale.transactionDate).toISOString().split('T')[0];
            const existing = summaryMap.get(dateKey) || { totalSales: 0, totalRevenue: 0, totalVat: 0, totalDiscount: 0, netRevenue: 0 };
            existing.totalSales += 1;
            existing.totalRevenue += sale.finalAmount || 0;
            existing.totalVat += sale.vatAmount || 0;
            existing.totalDiscount += sale.discount || 0;
            existing.netRevenue += sale.finalAmount || 0;
            summaryMap.set(dateKey, existing);
            totalSales += 1;
            totalRevenue += sale.finalAmount || 0;
            totalVat += sale.vatAmount || 0;
            totalDiscount += sale.discount || 0;
        }
        const summary = Array.from(summaryMap.entries()).map(([date, data]) => ({
            date,
            ...data
        })).sort((a, b) => a.date.localeCompare(b.date));
        const response = {
            success: true,
            summary: {
                totalOrders: totalSales,
                totalRevenue,
                totalVat,
                totalDiscount,
                netRevenue: totalRevenue
            },
            dailySummary: summary,
            totals: {
                totalSales,
                totalRevenue,
                totalVat,
                totalDiscount,
                netRevenue: totalRevenue
            }
        };
        if (includeDetails === 'true') {
            response.details = salesData;
        }
        res.json(response);
    }
    catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({ success: false, error: 'Failed to get sales report' });
    }
});
// GET /api/reports/inventory
router.get('/inventory', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo, search } = req.query;
        console.log('[Inventory Report] Request:', { storeId, dateFrom, dateTo, search });
        const params = {
            storeId,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            search: search ? `%${search}%` : null
        };
        // Build the WHERE clause dynamically
        let whereClause = 'WHERE p.store_id = @storeId';
        if (search) {
            whereClause += ' AND (p.name LIKE @search OR p.sku LIKE @search)';
        }
        const sqlQuery = `SELECT 
        p.id as productId,
        p.name as productName,
        p.sku as barcode,
        c.name as categoryName,
        u.name as unitName,
        p.stock_quantity as closingStock,
        p.cost_price as averageCost,
        0 as lowStockThreshold,
        
        -- Import stock (purchases in period)
        ISNULL((SELECT SUM(poi.quantity) 
                FROM PurchaseOrderItems poi 
                JOIN PurchaseOrders po ON poi.purchase_order_id = po.id 
                WHERE poi.product_id = p.id 
                  AND po.store_id = @storeId
                  AND (@dateFrom IS NULL OR po.import_date >= @dateFrom)
                  AND (@dateTo IS NULL OR po.import_date <= DATEADD(day, 1, @dateTo))
               ), 0) as importStock,
        
        -- Export stock (sales in period)
        ISNULL((SELECT SUM(si.quantity) 
                FROM SalesItems si 
                JOIN Sales s ON si.sales_transaction_id = s.id 
                WHERE si.product_id = p.id 
                  AND s.store_id = @storeId
                  AND s.status = 'completed'
                  AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
                  AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
               ), 0) as exportStock,
        
        -- Calculate opening stock: closingStock + exportStock - importStock
        -- This gives us the stock at the beginning of the period
        ISNULL(p.stock_quantity, 0) + 
        ISNULL((SELECT SUM(si.quantity) 
                FROM SalesItems si 
                JOIN Sales s ON si.sales_transaction_id = s.id 
                WHERE si.product_id = p.id 
                  AND s.store_id = @storeId
                  AND s.status = 'completed'
                  AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
                  AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
               ), 0) -
        ISNULL((SELECT SUM(poi.quantity) 
                FROM PurchaseOrderItems poi 
                JOIN PurchaseOrders po ON poi.purchase_order_id = po.id 
                WHERE poi.product_id = p.id 
                  AND po.store_id = @storeId
                  AND (@dateFrom IS NULL OR po.import_date >= @dateFrom)
                  AND (@dateTo IS NULL OR po.import_date <= DATEADD(day, 1, @dateTo))
               ), 0) as openingStock,
        
        -- Check if low stock (always 0 since column doesn't exist yet)
        0 as isLowStock
        
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.id
       LEFT JOIN Units u ON p.unit_id = u.id
       ${whereClause}
       ORDER BY p.name`;
        const result = await (0, db_1.query)(sqlQuery, params);
        // Calculate totals and stock value
        let totalOpeningStock = 0;
        let totalImportStock = 0;
        let totalExportStock = 0;
        let totalClosingStock = 0;
        let totalStockValue = 0;
        let lowStockCount = 0;
        const data = result.map((item) => {
            const openingStock = Number(item.openingStock) || 0;
            const importStock = Number(item.importStock) || 0;
            const exportStock = Number(item.exportStock) || 0;
            const closingStock = Number(item.closingStock) || 0;
            const averageCost = Number(item.averageCost) || 0;
            const stockValue = closingStock * averageCost;
            const isLowStock = item.isLowStock === 1;
            totalOpeningStock += openingStock;
            totalImportStock += importStock;
            totalExportStock += exportStock;
            totalClosingStock += closingStock;
            totalStockValue += stockValue;
            if (isLowStock)
                lowStockCount++;
            return {
                productId: item.productId,
                productName: item.productName,
                barcode: item.barcode,
                categoryName: item.categoryName,
                unitName: item.unitName,
                openingStock,
                importStock,
                exportStock,
                closingStock,
                averageCost,
                stockValue,
                lowStockThreshold: Number(item.lowStockThreshold) || 0,
                isLowStock,
            };
        });
        res.json({
            success: true,
            data,
            totals: {
                totalProducts: data.length,
                totalOpeningStock,
                totalImportStock,
                totalExportStock,
                totalClosingStock,
                totalStockValue,
            },
            lowStockCount,
        });
    }
    catch (error) {
        console.error('Get inventory report error:', error);
        res.status(500).json({ success: false, error: 'Failed to get inventory report' });
    }
});
// GET /api/reports/profit - Profit report
router.get('/profit', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo } = req.query;
        // Build date filter
        let dateFilter = '';
        const params = { storeId };
        if (dateFrom) {
            dateFilter += ' AND s.transaction_date >= @dateFrom';
            params.dateFrom = dateFrom;
        }
        if (dateTo) {
            dateFilter += ' AND s.transaction_date <= DATEADD(day, 1, @dateTo)';
            params.dateTo = dateTo;
        }
        // Get products with actual sales data
        const result = await (0, db_1.query)(`SELECT 
        p.id as productId,
        p.name as productName,
        p.cost_price as costPrice,
        p.price as sellingPrice,
        p.stock_quantity as stockQuantity,
        ISNULL(SUM(si.quantity), 0) as totalQuantity,
        ISNULL(SUM(si.quantity * si.price), 0) as totalRevenue,
        ISNULL(SUM(si.quantity * ISNULL(p.cost_price, 0)), 0) as totalCost
       FROM Products p
       LEFT JOIN SalesItems si ON p.id = si.product_id
       LEFT JOIN Sales s ON si.sales_transaction_id = s.id AND s.store_id = @storeId${dateFilter}
       WHERE p.store_id = @storeId
       GROUP BY p.id, p.name, p.cost_price, p.price, p.stock_quantity
       ORDER BY totalRevenue DESC`, params);
        // Calculate totals
        let totalQuantity = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        const data = result.map((item) => {
            const quantity = Number(item.totalQuantity) || 0;
            const revenue = Number(item.totalRevenue) || 0;
            const cost = Number(item.totalCost) || 0;
            const profit = revenue - cost;
            totalQuantity += quantity;
            totalRevenue += revenue;
            totalCost += cost;
            totalProfit += profit;
            return {
                productId: item.productId,
                productName: item.productName,
                totalQuantity: quantity,
                totalRevenue: revenue,
                totalCost: cost,
                profit: profit,
                costPrice: Number(item.costPrice) || 0,
                sellingPrice: Number(item.sellingPrice) || 0,
                stockQuantity: Number(item.stockQuantity) || 0,
            };
        });
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        res.json({
            data,
            total: data.length,
            summary: {
                totalQuantity,
                totalRevenue,
                totalCost,
                totalProfit,
                profitMargin,
            },
            totals: {
                totalQuantity,
                totalRevenue,
                totalCost,
                totalProfit,
                profitMargin,
            }
        });
    }
    catch (error) {
        console.error('Get profit report error:', error);
        res.status(500).json({ error: 'Failed to get profit report' });
    }
});
// GET /api/reports/sold-products - Sold products report
router.get('/sold-products', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { from, to } = req.query;
        console.log('[Sold Products] ===== REQUEST START =====');
        console.log('[Sold Products] Request:', { storeId, from, to });
        const result = await (0, db_1.query)(`SELECT 
        p.id, 
        p.name, 
        p.sku as barcode,
        c.name as categoryName,
        ISNULL(SUM(si.quantity), 0) as totalSold,
        ISNULL(SUM(si.quantity * si.price), 0) as totalRevenue
       FROM Products p
       LEFT JOIN SalesItems si ON p.id = si.product_id
       LEFT JOIN Sales s ON si.sales_transaction_id = s.id AND s.status IN ('unprinted', 'printed', 'pending', 'completed')
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.store_id = @storeId
         AND (s.id IS NULL OR (s.transaction_date >= @from AND s.transaction_date <= DATEADD(day, 1, CAST(@to AS DATETIME))))
       GROUP BY p.id, p.name, p.sku, c.name
       HAVING SUM(si.quantity) > 0
       ORDER BY totalRevenue DESC`, { storeId, from, to });
        console.log('[Sold Products] SUCCESS - Result count:', result.length);
        if (result.length > 0) {
            console.log('[Sold Products] Sample:', result[0]);
        }
        res.json(result);
    }
    catch (error) {
        console.error('[Sold Products] ===== ERROR =====');
        console.error('[Sold Products] Error details:', error);
        res.status(500).json({ error: 'Failed to get sold products report' });
    }
});
exports.default = router;
// GET /api/reports/sales-trends - Sales trends analysis
router.get('/sales-trends', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo, groupBy = 'day' } = req.query;
        let groupByClause = 'CAST(s.transaction_date AS DATE)';
        let selectClause = 'CAST(s.transaction_date AS DATE) as date';
        if (groupBy === 'week') {
            groupByClause = 'DATEPART(YEAR, s.transaction_date), DATEPART(WEEK, s.transaction_date)';
            selectClause = 'DATEPART(YEAR, s.transaction_date) as year, DATEPART(WEEK, s.transaction_date) as week';
        }
        else if (groupBy === 'month') {
            groupByClause = 'DATEPART(YEAR, s.transaction_date), DATEPART(MONTH, s.transaction_date)';
            selectClause = 'DATEPART(YEAR, s.transaction_date) as year, DATEPART(MONTH, s.transaction_date) as month';
        }
        const result = await (0, db_1.query)(`SELECT 
        ${selectClause},
        COUNT(s.id) as transactionCount,
        SUM(s.total_amount) as totalSales,
        SUM(s.final_amount) as totalRevenue,
        SUM(s.discount + ISNULL(s.tier_discount_amount, 0) + ISNULL(s.points_discount, 0)) as totalDiscounts,
        AVG(s.final_amount) as averageTransactionValue,
        COUNT(DISTINCT s.customer_id) as uniqueCustomers
       FROM Sales s
       WHERE s.store_id = @storeId
         AND s.status IN ('pending', 'printed')
         AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
         AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
       GROUP BY ${groupByClause}
       ORDER BY ${groupByClause}`, { storeId, dateFrom: dateFrom || null, dateTo: dateTo || null });
        res.json({
            success: true,
            data: result,
            groupBy
        });
    }
    catch (error) {
        console.error('Get sales trends error:', error);
        res.status(500).json({ success: false, error: 'Failed to get sales trends' });
    }
});
// GET /api/reports/product-performance - Product performance analysis
router.get('/product-performance', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo, limit = 50 } = req.query;
        const result = await (0, db_1.query)(`SELECT TOP ${limit}
        p.id as productId,
        p.name as productName,
        p.sku,
        c.name as categoryName,
        p.cost_price as costPrice,
        p.selling_price as sellingPrice,
        COUNT(DISTINCT si.sale_id) as timesSold,
        SUM(si.quantity) as totalQuantitySold,
        SUM(si.subtotal) as totalRevenue,
        SUM(si.quantity * p.cost_price) as totalCost,
        SUM(si.subtotal - (si.quantity * p.cost_price)) as totalProfit,
        AVG(si.price) as averageSellingPrice,
        CASE 
          WHEN SUM(si.subtotal) > 0 THEN
            ((SUM(si.subtotal - (si.quantity * p.cost_price)) / SUM(si.subtotal)) * 100)
          ELSE 0
        END as profitMarginPercentage,
        p.stock_quantity as currentStock,
        p.low_stock_threshold as lowStockThreshold,
        MAX(s.transaction_date) as lastSaleDate
       FROM Products p
       LEFT JOIN Categories c ON p.CategoryId = c.id
       LEFT JOIN SaleItems si ON p.id = si.product_id
       LEFT JOIN Sales s ON si.sale_id = s.id 
         AND s.status IN ('pending', 'printed')
         AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
         AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
       WHERE p.store_id = @storeId
         AND p.status = 'active'
       GROUP BY 
         p.id, p.name, p.sku, c.name, 
         p.cost_price, p.selling_price, p.stock_quantity, p.low_stock_threshold
       ORDER BY totalRevenue DESC`, { storeId, dateFrom: dateFrom || null, dateTo: dateTo || null });
        res.json({
            success: true,
            data: result.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                sku: item.sku,
                categoryName: item.categoryName,
                costPrice: Number(item.costPrice) || 0,
                sellingPrice: Number(item.sellingPrice) || 0,
                timesSold: Number(item.timesSold) || 0,
                totalQuantitySold: Number(item.totalQuantitySold) || 0,
                totalRevenue: Number(item.totalRevenue) || 0,
                totalCost: Number(item.totalCost) || 0,
                totalProfit: Number(item.totalProfit) || 0,
                averageSellingPrice: Number(item.averageSellingPrice) || 0,
                profitMarginPercentage: Number(item.profitMarginPercentage) || 0,
                currentStock: Number(item.currentStock) || 0,
                lowStockThreshold: Number(item.lowStockThreshold) || 0,
                lastSaleDate: item.lastSaleDate
            }))
        });
    }
    catch (error) {
        console.error('Get product performance error:', error);
        res.status(500).json({ success: false, error: 'Failed to get product performance' });
    }
});
// GET /api/reports/customer-analytics - Customer analytics
router.get('/customer-analytics', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo, limit = 50 } = req.query;
        const result = await (0, db_1.query)(`SELECT TOP ${limit}
        c.id as customerId,
        c.full_name as fullName,
        c.phone,
        c.email,
        c.customer_type as customerType,
        c.loyalty_tier as loyaltyTier,
        c.total_debt as totalDebt,
        c.total_paid as totalPaid,
        COUNT(s.id) as totalPurchases,
        SUM(s.final_amount) as totalSpent,
        AVG(s.final_amount) as averageOrderValue,
        MAX(s.transaction_date) as lastPurchaseDate,
        MIN(s.transaction_date) as firstPurchaseDate,
        DATEDIFF(DAY, MAX(s.transaction_date), GETDATE()) as daysSinceLastPurchase,
        SUM(s.final_amount) - c.total_debt as customerLifetimeValue
       FROM Customers c
       LEFT JOIN Sales s ON c.id = s.customer_id 
         AND s.status IN ('pending', 'printed')
         AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
         AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
       WHERE c.store_id = @storeId
         AND c.status = 'active'
       GROUP BY 
         c.id, c.full_name, c.phone, c.email,
         c.customer_type, c.loyalty_tier, c.total_debt, c.total_paid
       ORDER BY totalSpent DESC`, { storeId, dateFrom: dateFrom || null, dateTo: dateTo || null });
        res.json({
            success: true,
            data: result.map((item) => ({
                customerId: item.customerId,
                fullName: item.fullName,
                phone: item.phone,
                email: item.email,
                customerType: item.customerType,
                loyaltyTier: item.loyaltyTier,
                totalDebt: Number(item.totalDebt) || 0,
                totalPaid: Number(item.totalPaid) || 0,
                totalPurchases: Number(item.totalPurchases) || 0,
                totalSpent: Number(item.totalSpent) || 0,
                averageOrderValue: Number(item.averageOrderValue) || 0,
                lastPurchaseDate: item.lastPurchaseDate,
                firstPurchaseDate: item.firstPurchaseDate,
                daysSinceLastPurchase: Number(item.daysSinceLastPurchase) || 0,
                customerLifetimeValue: Number(item.customerLifetimeValue) || 0
            }))
        });
    }
    catch (error) {
        console.error('Get customer analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to get customer analytics' });
    }
});
//# sourceMappingURL=reports.js.map