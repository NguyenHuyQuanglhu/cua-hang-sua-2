"use strict";
/**
 * MPC (Model Predictive Control) Inventory Optimizer
 *
 * Mô hình dự đoán và tối ưu hóa tồn kho sử dụng MPC
 * - Dự đoán nhu cầu trong tương lai
 * - Tối ưu hóa quyết định nhập hàng
 * - Cân bằng giữa chi phí lưu kho và nguy cơ hết hàng
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpcOptimizer = exports.MPCInventoryOptimizer = void 0;
class MPCInventoryOptimizer {
    params;
    constructor(params) {
        this.params = {
            predictionHorizon: params?.predictionHorizon || 14, // 2 tuần
            controlHorizon: params?.controlHorizon || 7, // 1 tuần
            holdingCostRate: params?.holdingCostRate || 0.001, // 0.1%/ngày
            stockoutCostRate: params?.stockoutCostRate || 0.5, // 50% giá bán
            orderingCost: params?.orderingCost || 50000, // 50k VND
            leadTime: params?.leadTime || 3, // 3 ngày
            safetyStockFactor: params?.safetyStockFactor || 1.5,
        };
    }
    /**
     * Dự báo nhu cầu dựa trên lịch sử bán hàng
     * Sử dụng phương pháp Moving Average với xu hướng
     */
    forecastDemand(historicalSales, periods = this.params.predictionHorizon) {
        if (historicalSales.length < 3) {
            // Không đủ dữ liệu, dùng trung bình đơn giản
            const avgDemand = historicalSales.reduce((a, b) => a + b, 0) / historicalSales.length;
            return Array(periods).fill(null).map((_, i) => ({
                period: i + 1,
                predictedDemand: avgDemand,
                confidence: 0.5,
            }));
        }
        // Tính Moving Average và xu hướng
        const windowSize = Math.min(7, historicalSales.length);
        const recentSales = historicalSales.slice(-windowSize);
        const avgDemand = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
        // Tính xu hướng (trend)
        let trend = 0;
        if (historicalSales.length >= 7) {
            const oldAvg = historicalSales.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
            const newAvg = recentSales.reduce((a, b) => a + b, 0) / 7;
            trend = (newAvg - oldAvg) / 7; // Xu hướng trung bình mỗi ngày
        }
        // Tính độ biến động (volatility)
        const variance = recentSales.reduce((sum, val) => sum + Math.pow(val - avgDemand, 2), 0) / recentSales.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / avgDemand; // Coefficient of Variation
        // Độ tin cậy giảm dần theo thời gian
        const baseConfidence = Math.max(0.3, 1 - cv);
        return Array(periods).fill(null).map((_, i) => {
            const period = i + 1;
            const predictedDemand = Math.max(0, avgDemand + trend * period);
            const confidence = baseConfidence * Math.exp(-0.05 * period); // Giảm 5% mỗi kỳ
            return {
                period,
                predictedDemand,
                confidence,
            };
        });
    }
    /**
     * Tính toán quyết định tối ưu sử dụng MPC
     * Tối ưu hóa: min J = Σ(holding_cost + stockout_cost + ordering_cost)
     */
    optimize(state, demandForecast) {
        const { controlHorizon } = this.params;
        let bestDecision = null;
        let minCost = Infinity;
        // Thử các kịch bản đặt hàng khác nhau
        const maxOrderQty = Math.max(...demandForecast.map(f => f.predictedDemand)) * controlHorizon * 2;
        // Tìm kiếm lưới (Grid Search) để tìm số lượng đặt hàng tối ưu
        for (let orderQty = 0; orderQty <= maxOrderQty; orderQty += Math.max(1, Math.floor(maxOrderQty / 20))) {
            const decision = this.simulateDecision(state, demandForecast, orderQty);
            if (decision.totalCost < minCost) {
                minCost = decision.totalCost;
                bestDecision = decision;
            }
        }
        return bestDecision || this.getDefaultDecision(state, demandForecast);
    }
    /**
     * Mô phỏng kết quả của một quyết định đặt hàng
     */
    simulateDecision(state, demandForecast, orderQuantity) {
        const { predictionHorizon, leadTime, holdingCostRate, stockoutCostRate, orderingCost } = this.params;
        let currentStock = state.currentStock;
        const expectedStock = [];
        let totalCost = 0;
        let stockoutDays = 0;
        // Chi phí đặt hàng (nếu có đặt hàng)
        if (orderQuantity > 0) {
            totalCost += orderingCost;
        }
        for (let period = 0; period < predictionHorizon; period++) {
            // Hàng đến sau leadTime
            if (period === leadTime && orderQuantity > 0) {
                currentStock += orderQuantity;
            }
            // Nhu cầu trong kỳ
            const demand = demandForecast[period]?.predictedDemand || 0;
            // Bán hàng (không thể bán quá tồn kho)
            const actualSales = Math.min(currentStock, demand);
            const stockout = demand - actualSales;
            currentStock -= actualSales;
            // Chi phí lưu kho
            const holdingCost = currentStock * state.averageCost * holdingCostRate;
            totalCost += holdingCost;
            // Chi phí hết hàng
            if (stockout > 0) {
                const stockoutCost = stockout * state.sellingPrice * stockoutCostRate;
                totalCost += stockoutCost;
                stockoutDays++;
            }
            expectedStock.push(currentStock);
        }
        // Đánh giá mức độ rủi ro
        const riskLevel = this.assessRisk(stockoutDays, predictionHorizon, currentStock, state.lowStockThreshold);
        return {
            orderQuantity,
            orderDate: new Date(),
            expectedStock,
            totalCost,
            riskLevel,
        };
    }
    /**
     * Đánh giá mức độ rủi ro
     */
    assessRisk(stockoutDays, totalDays, finalStock, threshold) {
        const stockoutRate = stockoutDays / totalDays;
        if (stockoutRate > 0.3 || finalStock < threshold * 0.5) {
            return 'high';
        }
        else if (stockoutRate > 0.1 || finalStock < threshold) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    /**
     * Quyết định mặc định khi không tìm được giải pháp tối ưu
     */
    getDefaultDecision(state, demandForecast) {
        const avgDemand = demandForecast.reduce((sum, f) => sum + f.predictedDemand, 0) / demandForecast.length;
        const orderQuantity = Math.max(0, avgDemand * this.params.controlHorizon - state.currentStock);
        return {
            orderQuantity: Math.ceil(orderQuantity),
            orderDate: new Date(),
            expectedStock: [],
            totalCost: 0,
            riskLevel: 'medium',
        };
    }
    /**
     * Tính toán điểm đặt hàng lại (Reorder Point)
     * ROP = (Nhu cầu trung bình × Lead time) + Safety Stock
     */
    calculateReorderPoint(avgDailyDemand, demandStdDev) {
        const { leadTime, safetyStockFactor } = this.params;
        // Safety Stock = Z × σ × √(Lead Time)
        const safetyStock = safetyStockFactor * demandStdDev * Math.sqrt(leadTime);
        const reorderPoint = avgDailyDemand * leadTime + safetyStock;
        return Math.ceil(reorderPoint);
    }
    /**
     * Tính toán số lượng đặt hàng kinh tế (EOQ - Economic Order Quantity)
     * EOQ = √(2 × D × S / H)
     * D = Nhu cầu hàng năm
     * S = Chi phí đặt hàng
     * H = Chi phí lưu kho
     */
    calculateEOQ(annualDemand, unitCost) {
        const { orderingCost, holdingCostRate } = this.params;
        const annualHoldingCost = unitCost * holdingCostRate * 365;
        const eoq = Math.sqrt((2 * annualDemand * orderingCost) / annualHoldingCost);
        return Math.ceil(eoq);
    }
    /**
     * Phân tích ABC để phân loại sản phẩm
     * A: 20% sản phẩm, 80% doanh thu
     * B: 30% sản phẩm, 15% doanh thu
     * C: 50% sản phẩm, 5% doanh thu
     */
    classifyABC(products) {
        const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);
        const classification = new Map();
        let cumulativeRevenue = 0;
        let cumulativePercentage = 0;
        for (const product of sorted) {
            cumulativeRevenue += product.revenue;
            cumulativePercentage = cumulativeRevenue / totalRevenue;
            if (cumulativePercentage <= 0.8) {
                classification.set(product.id, 'A');
            }
            else if (cumulativePercentage <= 0.95) {
                classification.set(product.id, 'B');
            }
            else {
                classification.set(product.id, 'C');
            }
        }
        return classification;
    }
}
exports.MPCInventoryOptimizer = MPCInventoryOptimizer;
// Export singleton instance
exports.mpcOptimizer = new MPCInventoryOptimizer();
//# sourceMappingURL=mpc-inventory-optimizer.js.map