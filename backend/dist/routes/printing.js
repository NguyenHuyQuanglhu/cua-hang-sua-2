"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const printing_service_1 = require("../services/printing-service");
const export_service_1 = require("../services/export-service");
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
/**
 * POST /api/printing/barcode
 * In tem mã vạch sản phẩm
 */
router.post('/barcode', async (req, res) => {
    try {
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            res.status(400).json({ error: 'Product IDs are required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        // Lấy thông tin sản phẩm
        const placeholders = productIds.map((_, i) => `@productId${i}`).join(',');
        const request = pool.request().input('storeId', mssql_1.default.UniqueIdentifier, storeId);
        productIds.forEach((id, i) => {
            request.input(`productId${i}`, mssql_1.default.UniqueIdentifier, id);
        });
        const result = await request.query(`
      SELECT 
        id,
        name,
        barcode,
        sellingPrice,
        sku
      FROM Products
      WHERE id IN (${placeholders}) AND storeId = @storeId
    `);
        if (result.recordset.length === 0) {
            res.status(404).json({ error: 'No products found' });
            return;
        }
        const pdfBuffer = await printing_service_1.printingService.generateBarcodePDF(result.recordset);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=barcode-labels.pdf');
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Barcode printing error:', error);
        res.status(500).json({ error: 'Failed to generate barcode labels' });
    }
});
/**
 * POST /api/printing/price-label
 * In nhãn giá sản phẩm
 */
router.post('/price-label', async (req, res) => {
    try {
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            res.status(400).json({ error: 'Product IDs are required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        const placeholders = productIds.map((_, i) => `@productId${i}`).join(',');
        const request = pool.request().input('storeId', mssql_1.default.UniqueIdentifier, storeId);
        productIds.forEach((id, i) => {
            request.input(`productId${i}`, mssql_1.default.UniqueIdentifier, id);
        });
        const result = await request.query(`
      SELECT 
        id,
        name,
        sellingPrice,
        sku
      FROM Products
      WHERE id IN (${placeholders}) AND storeId = @storeId
    `);
        if (result.recordset.length === 0) {
            res.status(404).json({ error: 'No products found' });
            return;
        }
        const pdfBuffer = await printing_service_1.printingService.generatePriceLabelPDF(result.recordset);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=price-labels.pdf');
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Price label printing error:', error);
        res.status(500).json({ error: 'Failed to generate price labels' });
    }
});
/**
 * GET /api/printing/purchase-receipt/:orderId
 * In phiếu nhập kho
 */
router.get('/purchase-receipt/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        // Lấy thông tin đơn nhập hàng
        const orderResult = await pool.request()
            .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          po.id,
          po.orderNumber,
          po.orderDate,
          po.totalAmount,
          s.name as supplierName
        FROM PurchaseOrders po
        INNER JOIN Suppliers s ON po.supplierId = s.id
        WHERE po.id = @orderId AND po.storeId = @storeId
      `);
        if (orderResult.recordset.length === 0) {
            res.status(404).json({ error: 'Purchase order not found' });
            return;
        }
        const order = orderResult.recordset[0];
        // Lấy chi tiết sản phẩm
        const itemsResult = await pool.request()
            .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
            .query(`
        SELECT 
          p.name as productName,
          poi.quantity,
          poi.unitPrice,
          (poi.quantity * poi.unitPrice) as total
        FROM PurchaseOrderItems poi
        INNER JOIN Products p ON poi.productId = p.id
        WHERE poi.purchaseOrderId = @orderId
      `);
        const orderData = {
            ...order,
            items: itemsResult.recordset,
        };
        const pdfBuffer = await printing_service_1.printingService.generatePurchaseReceiptPDF(orderData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=purchase-receipt-${order.orderNumber}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Purchase receipt printing error:', error);
        res.status(500).json({ error: 'Failed to generate purchase receipt' });
    }
});
/**
 * GET /api/printing/delivery-note/:saleId
 * In phiếu xuất kho
 */
router.get('/delivery-note/:saleId', async (req, res) => {
    try {
        const { saleId } = req.params;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        // Lấy thông tin đơn bán hàng
        const saleResult = await pool.request()
            .input('saleId', mssql_1.default.UniqueIdentifier, saleId)
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          s.id,
          s.saleNumber as orderNumber,
          s.saleDate as orderDate,
          s.totalAmount,
          c.name as customerName
        FROM Sales s
        LEFT JOIN Customers c ON s.customerId = c.id
        WHERE s.id = @saleId AND s.storeId = @storeId
      `);
        if (saleResult.recordset.length === 0) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        const sale = saleResult.recordset[0];
        // Lấy chi tiết sản phẩm
        const itemsResult = await pool.request()
            .input('saleId', mssql_1.default.UniqueIdentifier, saleId)
            .query(`
        SELECT 
          p.name as productName,
          si.quantity,
          si.price as unitPrice,
          (si.quantity * si.price) as total
        FROM SalesItems si
        INNER JOIN Products p ON si.productId = p.id
        WHERE si.saleId = @saleId
      `);
        const saleData = {
            ...sale,
            items: itemsResult.recordset,
        };
        const pdfBuffer = await printing_service_1.printingService.generateDeliveryNotePDF(saleData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=delivery-note-${sale.orderNumber}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Delivery note printing error:', error);
        res.status(500).json({ error: 'Failed to generate delivery note' });
    }
});
/**
 * GET /api/printing/price-list
 * In bảng giá sản phẩm
 */
router.get('/price-list', async (req, res) => {
    try {
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        const { categoryId } = req.query;
        // Lấy thông tin cửa hàng
        const storeResult = await pool.request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`SELECT name FROM Stores WHERE id = @storeId`);
        const storeName = storeResult.recordset[0]?.name || 'Cửa hàng';
        // Lấy danh sách sản phẩm
        let query = `
      SELECT 
        p.name,
        p.sku,
        p.sellingPrice,
        c.name as category
      FROM Products p
      LEFT JOIN Categories c ON p.categoryId = c.id
      WHERE p.storeId = @storeId AND p.status = 'active'
    `;
        const request = pool.request().input('storeId', mssql_1.default.UniqueIdentifier, storeId);
        if (categoryId) {
            query += ` AND p.categoryId = @categoryId`;
            request.input('categoryId', mssql_1.default.UniqueIdentifier, categoryId);
        }
        query += ` ORDER BY c.name, p.name`;
        const result = await request.query(query);
        const priceListData = {
            storeName,
            effectiveDate: new Date(),
            products: result.recordset,
        };
        const pdfBuffer = await printing_service_1.printingService.generatePriceListPDF(priceListData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=price-list.pdf');
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Price list printing error:', error);
        res.status(500).json({ error: 'Failed to generate price list' });
    }
});
/**
 * POST /api/printing/export/sales
 * Xuất báo cáo bán hàng
 */
router.post('/export/sales', async (req, res) => {
    try {
        const { startDate, endDate, format = 'excel' } = req.body;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        const result = await pool.request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .input('startDate', mssql_1.default.DateTime, startDate)
            .input('endDate', mssql_1.default.DateTime, endDate)
            .query(`
        SELECT 
          s.saleNumber,
          s.saleDate,
          c.name as customerName,
          s.totalAmount,
          s.paymentMethod,
          s.status
        FROM Sales s
        LEFT JOIN Customers c ON s.customerId = c.id
        WHERE s.storeId = @storeId 
          AND s.saleDate >= @startDate 
          AND s.saleDate <= @endDate
          AND s.status != 'cancelled'
        ORDER BY s.saleDate DESC
      `);
        const buffer = await export_service_1.exportService.exportSalesReport(result.recordset, { format });
        const contentType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'csv' ? 'text/csv' : 'application/pdf';
        const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=sales-report.${extension}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Sales export error:', error);
        res.status(500).json({ error: 'Failed to export sales report' });
    }
});
/**
 * POST /api/printing/export/inventory
 * Xuất báo cáo tồn kho
 */
router.post('/export/inventory', async (req, res) => {
    try {
        const { format = 'excel' } = req.body;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        const result = await pool.request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          c.name as categoryName,
          ISNULL(pi.quantity, 0) as quantity,
          p.unit,
          ISNULL(pi.averageCost, 0) as averageCost
        FROM Products p
        LEFT JOIN Categories c ON p.categoryId = c.id
        LEFT JOIN ProductInventory pi ON p.id = pi.productId AND pi.storeId = @storeId
        WHERE p.storeId = @storeId AND p.status = 'active'
        ORDER BY c.name, p.name
      `);
        const buffer = await export_service_1.exportService.exportInventoryReport(result.recordset, { format });
        const contentType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'csv' ? 'text/csv' : 'application/pdf';
        const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=inventory-report.${extension}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Inventory export error:', error);
        res.status(500).json({ error: 'Failed to export inventory report' });
    }
});
/**
 * POST /api/printing/export/purchases
 * Xuất báo cáo nhập hàng
 */
router.post('/export/purchases', async (req, res) => {
    try {
        const { startDate, endDate, format = 'excel' } = req.body;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        const result = await pool.request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .input('startDate', mssql_1.default.DateTime, startDate)
            .input('endDate', mssql_1.default.DateTime, endDate)
            .query(`
        SELECT 
          po.orderNumber,
          po.orderDate,
          s.name as supplierName,
          po.totalAmount,
          po.paidAmount,
          po.status
        FROM PurchaseOrders po
        INNER JOIN Suppliers s ON po.supplierId = s.id
        WHERE po.storeId = @storeId 
          AND po.orderDate >= @startDate 
          AND po.orderDate <= @endDate
        ORDER BY po.orderDate DESC
      `);
        const buffer = await export_service_1.exportService.exportPurchaseReport(result.recordset, { format });
        const contentType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'csv' ? 'text/csv' : 'application/pdf';
        const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=purchase-report.${extension}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Purchase export error:', error);
        res.status(500).json({ error: 'Failed to export purchase report' });
    }
});
/**
 * POST /api/printing/export/products
 * Xuất danh sách sản phẩm
 */
router.post('/export/products', async (req, res) => {
    try {
        const { format = 'excel', categoryId } = req.body;
        const pool = await (0, db_1.getConnection)();
        const storeId = req.storeId;
        let query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        c.name as categoryName,
        ISNULL(pi.averageCost, 0) as averageCost,
        p.sellingPrice,
        ISNULL(pi.quantity, 0) as quantity,
        p.status
      FROM Products p
      LEFT JOIN Categories c ON p.categoryId = c.id
      LEFT JOIN ProductInventory pi ON p.id = pi.productId AND pi.storeId = @storeId
      WHERE p.storeId = @storeId
    `;
        const request = pool.request().input('storeId', mssql_1.default.UniqueIdentifier, storeId);
        if (categoryId) {
            query += ` AND p.categoryId = @categoryId`;
            request.input('categoryId', mssql_1.default.UniqueIdentifier, categoryId);
        }
        query += ` ORDER BY c.name, p.name`;
        const result = await request.query(query);
        const buffer = await export_service_1.exportService.exportProductList(result.recordset, { format });
        const contentType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'csv' ? 'text/csv' : 'application/pdf';
        const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=product-list.${extension}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Product export error:', error);
        res.status(500).json({ error: 'Failed to export product list' });
    }
});
exports.default = router;
//# sourceMappingURL=printing.js.map