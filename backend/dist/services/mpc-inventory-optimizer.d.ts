/**
 * MPC (Model Predictive Control) Inventory Optimizer
 *
 * Mô hình dự đoán và tối ưu hóa tồn kho sử dụng MPC
 * - Dự đoán nhu cầu trong tương lai
 * - Tối ưu hóa quyết định nhập hàng
 * - Cân bằng giữa chi phí lưu kho và nguy cơ hết hàng
 */
interface InventoryState {
    productId: string;
    currentStock: number;
    averageCost: number;
    sellingPrice: number;
    lowStockThreshold: number;
}
interface DemandForecast {
    period: number;
    predictedDemand: number;
    confidence: number;
}
interface MPCParameters {
    predictionHorizon: number;
    controlHorizon: number;
    holdingCostRate: number;
    stockoutCostRate: number;
    orderingCost: number;
    leadTime: number;
    safetyStockFactor: number;
}
interface OptimalDecision {
    orderQuantity: number;
    orderDate: Date;
    expectedStock: number[];
    totalCost: number;
    riskLevel: 'low' | 'medium' | 'high';
}
export declare class MPCInventoryOptimizer {
    private params;
    constructor(params?: Partial<MPCParameters>);
    /**
     * Dự báo nhu cầu dựa trên lịch sử bán hàng
     * Sử dụng phương pháp Moving Average với xu hướng
     */
    forecastDemand(historicalSales: number[], periods?: number): DemandForecast[];
    /**
     * Tính toán quyết định tối ưu sử dụng MPC
     * Tối ưu hóa: min J = Σ(holding_cost + stockout_cost + ordering_cost)
     */
    optimize(state: InventoryState, demandForecast: DemandForecast[]): OptimalDecision;
    /**
     * Mô phỏng kết quả của một quyết định đặt hàng
     */
    private simulateDecision;
    /**
     * Đánh giá mức độ rủi ro
     */
    private assessRisk;
    /**
     * Quyết định mặc định khi không tìm được giải pháp tối ưu
     */
    private getDefaultDecision;
    /**
     * Tính toán điểm đặt hàng lại (Reorder Point)
     * ROP = (Nhu cầu trung bình × Lead time) + Safety Stock
     */
    calculateReorderPoint(avgDailyDemand: number, demandStdDev: number): number;
    /**
     * Tính toán số lượng đặt hàng kinh tế (EOQ - Economic Order Quantity)
     * EOQ = √(2 × D × S / H)
     * D = Nhu cầu hàng năm
     * S = Chi phí đặt hàng
     * H = Chi phí lưu kho
     */
    calculateEOQ(annualDemand: number, unitCost: number): number;
    /**
     * Phân tích ABC để phân loại sản phẩm
     * A: 20% sản phẩm, 80% doanh thu
     * B: 30% sản phẩm, 15% doanh thu
     * C: 50% sản phẩm, 5% doanh thu
     */
    classifyABC(products: Array<{
        id: string;
        revenue: number;
    }>): Map<string, 'A' | 'B' | 'C'>;
}
export declare const mpcOptimizer: MPCInventoryOptimizer;
export {};
//# sourceMappingURL=mpc-inventory-optimizer.d.ts.map