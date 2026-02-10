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
            summary,
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
        
        -- Calculate opening stock (current stock + sales - purchases in period)
        ISNULL(p.stock_quantity, 0) + 
        ISNULL((SELECT SUM(si.quantity) 
                FROM SalesItems si 
                JOIN Sales s ON si.sales_transaction_id = s.id 
                WHERE si.product_id = p.id 
                  AND s.store_id = @storeId
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
                  AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
                  AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
               ), 0) as exportStock,
        
        -- Check if low stock (always 0 since we don't have threshold column)
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
// GET /api/reports/debt - Customer debt report
router.get('/debt', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { hasDebtOnly } = req.query;
        let havingClause = '';
        if (hasDebtOnly === 'true') {
            havingClause = 'HAVING ISNULL(SUM(s.final_amount), 0) - ISNULL(SUM(s.customer_payment), 0) > 0';
        }
        const result = await (0, db_1.query)(`SELECT 
        c.id, 
        c.full_name as name, 
        c.phone, 
        c.email,
        ISNULL(SUM(s.final_amount), 0) as totalSales,
        ISNULL(SUM(s.customer_payment), 0) as totalPayments,
        ISNULL(SUM(s.final_amount), 0) - ISNULL(SUM(s.customer_payment), 0) as totalDebt,
        COUNT(s.id) as transactionCount
       FROM Customers c
       LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = @storeId
       WHERE c.store_id = @storeId
       GROUP BY c.id, c.full_name, c.phone, c.email
       ${havingClause}
       ORDER BY totalDebt DESC`, { storeId });
        // Calculate totals
        const totals = {
            totalSales: 0,
            totalPayments: 0,
            totalDebt: 0,
        };
        result.forEach((row) => {
            totals.totalSales += Number(row.totalSales) || 0;
            totals.totalPayments += Number(row.totalPayments) || 0;
            totals.totalDebt += Number(row.totalDebt) || 0;
        });
        res.json({ data: result, total: result.length, totals });
    }
    catch (error) {
        console.error('Get debt report error:', error);
        res.status(500).json({ error: 'Failed to get debt report' });
    }
});
// GET /api/reports/supplier-debt - Supplier debt report
router.get('/supplier-debt', async (req, res) => {
    try {
        const storeId = req.storeId;
        const result = await (0, db_1.query)(`SELECT
        s.id, s.name, s.phone, s.email,
        ISNULL(SUM(p.total_amount), 0) as totalPurchases,
        ISNULL(SUM(p.paid_amount), 0) as totalPaid,
        ISNULL(SUM(p.remaining_debt), 0) as totalDebt,
        COUNT(p.id) as purchaseCount
       FROM Suppliers s
       LEFT JOIN Purchases p ON s.id = p.supplier_id AND p.store_id = @storeId
       WHERE s.store_id = @storeId
       GROUP BY s.id, s.name, s.phone, s.email
       HAVING ISNULL(SUM(p.remaining_debt), 0) > 0
       ORDER BY totalDebt DESC`, { storeId });
        res.json({ data: result, total: result.length });
    }
    catch (error) {
        console.error('Get supplier debt report error:', error);
        res.status(500).json({ error: 'Failed to get supplier debt report' });
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
        const result = await (0, db_1.query)(`SELECT 
        p.id, p.name, p.sku as barcode,
        c.name as categoryName,
        ISNULL(SUM(si.quantity), 0) as totalSold,
        ISNULL(SUM(si.subtotal), 0) as totalRevenue
       FROM Products p
       LEFT JOIN SaleItems si ON p.id = si.productId
       LEFT JOIN Sales s ON si.saleId = s.id
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.store_id = @storeId
         AND (s.id IS NULL OR (s.transaction_date >= @from AND s.transaction_date <= @to))
       GROUP BY p.id, p.name, p.sku, c.name
       ORDER BY totalSold DESC`, { storeId, from, to });
        res.json(result);
    }
    catch (error) {
        console.error('Get sold products report error:', error);
        res.status(500).json({ error: 'Failed to get sold products report' });
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map