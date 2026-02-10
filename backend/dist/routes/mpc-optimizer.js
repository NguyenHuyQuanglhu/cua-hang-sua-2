"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const mpc_inventory_optimizer_1 = require("../services/mpc-inventory-optimizer");
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
/**
 * POST /api/mpc/optimize
 * Tối ưu hóa quyết định nhập hàng cho một sản phẩm
 */
router.post('/optimize', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { productId, customParams } = req.body;
        if (!productId) {
            res.status(400).json({ error: 'Product ID is required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        // Lấy thông tin sản phẩm và tồn kho hiện tại
        const productResult = await pool.request()
            .input('productId', mssql_1.default.UniqueIdentifier, productId)
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          p.id,
          p.name,
          p.sellingPrice,
          p.lowStockThreshold,
          ISNULL(pi.quantity, 0) as currentStock,
          ISNULL(pi.averageCost, 0) as averageCost
        FROM Products p
        LEFT JOIN ProductInventory pi ON p.id = pi.productId AND pi.storeId = @storeId
        WHERE p.id = @productId AND p.storeId = @storeId
      `);
        if (productResult.recordset.length === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const product = productResult.recordset[0];
        // Lấy lịch sử bán hàng 30 ngày gần nhất
        const salesResult = await pool.request()
            .input('productId', mssql_1.default.UniqueIdentifier, productId)
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          CAST(s.saleDate AS DATE) as saleDate,
          SUM(si.quantity) as totalQuantity
        FROM Sales s
        INNER JOIN SalesItems si ON s.id = si.saleId
        WHERE si.productId = @productId 
          AND s.storeId = @storeId
          AND s.saleDate >= DATEADD(day, -30, GETDATE())
          AND s.status != 'cancelled'
        GROUP BY CAST(s.saleDate AS DATE)
        ORDER BY saleDate DESC
      `);
        const historicalSales = salesResult.recordset.map((r) => r.totalQuantity);
        // Dự báo nhu cầu
        const demandForecast = mpc_inventory_optimizer_1.mpcOptimizer.forecastDemand(historicalSales, customParams?.predictionHorizon);
        // Tối ưu hóa quyết định
        const optimalDecision = mpc_inventory_optimizer_1.mpcOptimizer.optimize({
            productId: product.id,
            currentStock: product.currentStock,
            averageCost: product.averageCost,
            sellingPrice: product.sellingPrice,
            lowStockThreshold: product.lowStockThreshold || 10,
        }, demandForecast);
        // Tính toán các chỉ số bổ sung
        const avgDailyDemand = historicalSales.reduce((a, b) => a + b, 0) / historicalSales.length;
        const variance = historicalSales.reduce((sum, val) => sum + Math.pow(val - avgDailyDemand, 2), 0) / historicalSales.length;
        const demandStdDev = Math.sqrt(variance);
        const reorderPoint = mpc_inventory_optimizer_1.mpcOptimizer.calculateReorderPoint(avgDailyDemand, demandStdDev);
        const eoq = mpc_inventory_optimizer_1.mpcOptimizer.calculateEOQ(avgDailyDemand * 365, product.averageCost);
        res.json({
            product: {
                id: product.id,
                name: product.name,
                currentStock: product.currentStock,
                averageCost: product.averageCost,
                sellingPrice: product.sellingPrice,
            },
            analytics: {
                avgDailyDemand,
                demandStdDev,
                reorderPoint,
                economicOrderQuantity: eoq,
            },
            forecast: demandForecast,
            recommendation: optimalDecision,
        });
    }
    catch (error) {
        console.error('MPC optimization error:', error);
        res.status(500).json({ error: 'Failed to optimize', code: 'INTERNAL_ERROR' });
    }
});
/**
 * POST /api/mpc/batch-optimize
 * Tối ưu hóa cho nhiều sản phẩm cùng lúc
 */
router.post('/batch-optimize', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { productIds, limit } = req.body;
        const pool = await (0, db_1.getConnection)();
        // Nếu không có productIds, lấy top sản phẩm cần nhập hàng
        let query = `
      SELECT TOP ${limit || 20}
        p.id,
        p.name,
        p.sellingPrice,
        p.lowStockThreshold,
        ISNULL(pi.quantity, 0) as currentStock,
        ISNULL(pi.averageCost, 0) as averageCost
      FROM Products p
      LEFT JOIN ProductInventory pi ON p.id = pi.productId AND pi.storeId = @storeId
      WHERE p.storeId = @storeId AND p.status = 'active'
    `;
        if (productIds && productIds.length > 0) {
            query += ` AND p.id IN (${productIds.map((_, i) => `@productId${i}`).join(',')})`;
        }
        else {
            // Ưu tiên sản phẩm có tồn kho thấp
            query += ` ORDER BY (ISNULL(pi.quantity, 0) / NULLIF(p.lowStockThreshold, 0)) ASC`;
        }
        const request = pool.request().input('storeId', mssql_1.default.UniqueIdentifier, storeId);
        if (productIds && productIds.length > 0) {
            productIds.forEach((id, i) => {
                request.input(`productId${i}`, mssql_1.default.UniqueIdentifier, id);
            });
        }
        const productsResult = await request.query(query);
        const products = productsResult.recordset;
        const recommendations = [];
        for (const product of products) {
            // Lấy lịch sử bán hàng
            const salesResult = await pool.request()
                .input('productId', mssql_1.default.UniqueIdentifier, product.id)
                .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
                .query(`
          SELECT 
            CAST(s.saleDate AS DATE) as saleDate,
            SUM(si.quantity) as totalQuantity
          FROM Sales s
          INNER JOIN SalesItems si ON s.id = si.saleId
          WHERE si.productId = @productId 
            AND s.storeId = @storeId
            AND s.saleDate >= DATEADD(day, -30, GETDATE())
            AND s.status != 'cancelled'
          GROUP BY CAST(s.saleDate AS DATE)
          ORDER BY saleDate DESC
        `);
            const historicalSales = salesResult.recordset.map((r) => r.totalQuantity);
            if (historicalSales.length === 0) {
                continue; // Bỏ qua sản phẩm không có lịch sử bán
            }
            const demandForecast = mpc_inventory_optimizer_1.mpcOptimizer.forecastDemand(historicalSales);
            const optimalDecision = mpc_inventory_optimizer_1.mpcOptimizer.optimize({
                productId: product.id,
                currentStock: product.currentStock,
                averageCost: product.averageCost,
                sellingPrice: product.sellingPrice,
                lowStockThreshold: product.lowStockThreshold || 10,
            }, demandForecast);
            recommendations.push({
                productId: product.id,
                productName: product.name,
                currentStock: product.currentStock,
                recommendation: optimalDecision,
            });
        }
        // Sắp xếp theo mức độ ưu tiên (rủi ro cao trước)
        recommendations.sort((a, b) => {
            const riskOrder = { high: 0, medium: 1, low: 2 };
            return riskOrder[a.recommendation.riskLevel] - riskOrder[b.recommendation.riskLevel];
        });
        res.json({
            total: recommendations.length,
            recommendations,
        });
    }
    catch (error) {
        console.error('Batch MPC optimization error:', error);
        res.status(500).json({ error: 'Failed to batch optimize', code: 'INTERNAL_ERROR' });
    }
});
/**
 * GET /api/mpc/abc-analysis
 * Phân tích ABC cho sản phẩm
 */
router.get('/abc-analysis', async (req, res) => {
    try {
        const storeId = req.storeId;
        const pool = await (0, db_1.getConnection)();
        // Tính doanh thu 90 ngày gần nhất cho mỗi sản phẩm
        const result = await pool.request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .query(`
        SELECT 
          p.id,
          p.name,
          SUM(si.quantity * si.price) as revenue,
          SUM(si.quantity) as totalSold
        FROM Products p
        LEFT JOIN SalesItems si ON p.id = si.productId
        LEFT JOIN Sales s ON si.saleId = s.id
        WHERE p.storeId = @storeId 
          AND p.status = 'active'
          AND (s.saleDate IS NULL OR s.saleDate >= DATEADD(day, -90, GETDATE()))
          AND (s.status IS NULL OR s.status != 'cancelled')
        GROUP BY p.id, p.name
        HAVING SUM(si.quantity * si.price) > 0
        ORDER BY revenue DESC
      `);
        const products = result.recordset.map((r) => ({
            id: r.id,
            name: r.name,
            revenue: r.revenue,
            totalSold: r.totalSold,
        }));
        const classification = mpc_inventory_optimizer_1.mpcOptimizer.classifyABC(products);
        const classified = products.map((p) => ({
            ...p,
            class: classification.get(p.id) || 'C',
        }));
        const summary = {
            A: classified.filter((p) => p.class === 'A').length,
            B: classified.filter((p) => p.class === 'B').length,
            C: classified.filter((p) => p.class === 'C').length,
        };
        res.json({
            summary,
            products: classified,
        });
    }
    catch (error) {
        console.error('ABC analysis error:', error);
        res.status(500).json({ error: 'Failed to perform ABC analysis', code: 'INTERNAL_ERROR' });
    }
});
exports.default = router;
//# sourceMappingURL=mpc-optimizer.js.map