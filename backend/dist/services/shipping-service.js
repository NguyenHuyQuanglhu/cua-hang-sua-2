"use strict";
/**
 * Shipping Service
 *
 * Integrates with Vietnamese shipping providers:
 * - GHN (Giao Hang Nhanh)
 * - GHTK (Giao Hang Tiet Kiem)
 *
 * Supports shipping fee calculation, order creation, and tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableProviders = getAvailableProviders;
exports.calculateGHNFee = calculateGHNFee;
exports.createGHNOrder = createGHNOrder;
exports.trackGHNOrder = trackGHNOrder;
exports.calculateGHTKFee = calculateGHTKFee;
exports.createGHTKOrder = createGHTKOrder;
exports.trackGHTKOrder = trackGHTKOrder;
exports.updateShippingStatus = updateShippingStatus;
const db_1 = require("../db");
// Get GHN configuration
function getGHNConfig() {
    const token = process.env.GHN_TOKEN;
    const shopId = process.env.GHN_SHOP_ID;
    if (!token || !shopId) {
        return null;
    }
    return {
        token,
        shopId,
        apiUrl: process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
    };
}
// Get GHTK configuration
function getGHTKConfig() {
    const token = process.env.GHTK_TOKEN;
    if (!token) {
        return null;
    }
    return {
        token,
        apiUrl: process.env.GHTK_API_URL || 'https://services.giaohangtietkiem.vn',
    };
}
// Get available shipping providers
function getAvailableProviders() {
    const providers = [];
    if (getGHNConfig())
        providers.push('ghn');
    if (getGHTKConfig())
        providers.push('ghtk');
    return providers;
}
// Calculate GHN shipping fee
async function calculateGHNFee(request) {
    const config = getGHNConfig();
    if (!config) {
        return { success: false, error: 'GHN not configured' };
    }
    try {
        const response = await fetch(`${config.apiUrl}/v2/shipping-order/fee`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Token: config.token,
                ShopId: config.shopId,
            },
            body: JSON.stringify({
                service_type_id: 2, // Standard delivery
                from_district_id: request.sender.districtId,
                to_district_id: request.receiver.districtId,
                to_ward_code: request.receiver.wardCode,
                weight: request.totalWeight,
                insurance_value: request.codAmount || 0,
                coupon: null,
            }),
        });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            return {
                success: true,
                fee: data.data.total,
                expectedDays: data.data.expected_delivery_time ? 2 : 3,
            };
        }
        return { success: false, error: data.message || 'Failed to calculate fee' };
    }
    catch (error) {
        console.error('GHN fee calculation error:', error);
        return { success: false, error: 'Failed to calculate shipping fee' };
    }
}
// Create GHN shipping order
async function createGHNOrder(request) {
    const config = getGHNConfig();
    if (!config) {
        return { success: false, error: 'GHN not configured' };
    }
    try {
        const items = request.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            weight: item.weight,
            price: item.price,
        }));
        const response = await fetch(`${config.apiUrl}/v2/shipping-order/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Token: config.token,
                ShopId: config.shopId,
            },
            body: JSON.stringify({
                payment_type_id: request.codAmount ? 2 : 1, // 1: Seller pays, 2: Buyer pays (COD)
                note: request.note || '',
                required_note: 'KHONGCHOXEMHANG',
                client_order_code: request.orderId,
                to_name: request.receiver.name,
                to_phone: request.receiver.phone,
                to_address: request.receiver.address,
                to_ward_code: request.receiver.wardCode,
                to_district_id: request.receiver.districtId,
                cod_amount: request.codAmount || 0,
                weight: request.totalWeight,
                service_type_id: 2,
                items,
            }),
        });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            // Log shipping order
            await logShippingOrder({
                orderId: request.orderId,
                provider: 'ghn',
                trackingCode: data.data.order_code,
                shippingOrderId: data.data.order_code,
                fee: data.data.total_fee,
                status: 'created',
            });
            return {
                success: true,
                trackingCode: data.data.order_code,
                shippingOrderId: data.data.order_code,
                fee: data.data.total_fee,
                expectedDelivery: data.data.expected_delivery_time,
            };
        }
        return { success: false, error: data.message || 'Failed to create shipping order' };
    }
    catch (error) {
        console.error('GHN create order error:', error);
        return { success: false, error: 'Failed to create shipping order' };
    }
}
// Track GHN order
async function trackGHNOrder(trackingCode) {
    const config = getGHNConfig();
    if (!config) {
        return { success: false, error: 'GHN not configured' };
    }
    try {
        const response = await fetch(`${config.apiUrl}/v2/shipping-order/detail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Token: config.token,
            },
            body: JSON.stringify({
                order_code: trackingCode,
            }),
        });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            const statusMap = {
                ready_to_pick: 'Cho lay hang',
                picking: 'Dang lay hang',
                picked: 'Da lay hang',
                storing: 'Dang luu kho',
                transporting: 'Dang van chuyen',
                sorting: 'Dang phan loai',
                delivering: 'Dang giao hang',
                delivered: 'Da giao hang',
                delivery_fail: 'Giao hang that bai',
                return: 'Dang hoan',
                returned: 'Da hoan',
                cancel: 'Da huy',
            };
            return {
                success: true,
                status: data.data.status,
                statusText: statusMap[data.data.status] || data.data.status,
                updatedAt: data.data.updated_date,
                history: data.data.log?.map((log) => ({
                    status: log.status,
                    description: statusMap[log.status] || log.status,
                    time: log.updated_date,
                })) || [],
            };
        }
        return { success: false, error: data.message || 'Failed to track order' };
    }
    catch (error) {
        console.error('GHN tracking error:', error);
        return { success: false, error: 'Failed to track order' };
    }
}
// Calculate GHTK shipping fee
async function calculateGHTKFee(request) {
    const config = getGHTKConfig();
    if (!config) {
        return { success: false, error: 'GHTK not configured' };
    }
    try {
        const totalValue = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const response = await fetch(`${config.apiUrl}/services/shipment/fee`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Token: config.token,
            },
            body: JSON.stringify({
                pick_province: request.sender.provinceName,
                pick_district: request.sender.districtName,
                province: request.receiver.provinceName,
                district: request.receiver.districtName,
                ward: request.receiver.wardName,
                weight: request.totalWeight,
                value: totalValue,
                transport: 'road',
            }),
        });
        const data = await response.json();
        if (data.success && data.fee) {
            return {
                success: true,
                fee: data.fee.fee,
                expectedDays: data.fee.delivery ? 2 : 3,
            };
        }
        return { success: false, error: data.message || 'Failed to calculate fee' };
    }
    catch (error) {
        console.error('GHTK fee calculation error:', error);
        return { success: false, error: 'Failed to calculate shipping fee' };
    }
}
// Create GHTK shipping order
async function createGHTKOrder(request) {
    const config = getGHTKConfig();
    if (!config) {
        return { success: false, error: 'GHTK not configured' };
    }
    try {
        const totalValue = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const products = request.items.map(item => ({
            name: item.name,
            weight: item.weight / 1000, // GHTK uses kg
            quantity: item.quantity,
            product_code: '',
        }));
        const response = await fetch(`${config.apiUrl}/services/shipment/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Token: config.token,
            },
            body: JSON.stringify({
                order: {
                    id: request.orderId,
                    pick_name: request.sender.name,
                    pick_address: request.sender.address,
                    pick_province: request.sender.provinceName,
                    pick_district: request.sender.districtName,
                    pick_ward: request.sender.wardName,
                    pick_tel: request.sender.phone,
                    name: request.receiver.name,
                    address: request.receiver.address,
                    province: request.receiver.provinceName,
                    district: request.receiver.districtName,
                    ward: request.receiver.wardName,
                    tel: request.receiver.phone,
                    note: request.note || '',
                    email: '',
                    is_freeship: request.codAmount ? 0 : 1,
                    pick_money: request.codAmount || 0,
                    value: totalValue,
                    transport: 'road',
                },
                products,
            }),
        });
        const data = await response.json();
        if (data.success && data.order) {
            await logShippingOrder({
                orderId: request.orderId,
                provider: 'ghtk',
                trackingCode: data.order.label,
                shippingOrderId: data.order.partner_id,
                fee: data.order.fee,
                status: 'created',
            });
            return {
                success: true,
                trackingCode: data.order.label,
                shippingOrderId: data.order.partner_id,
                fee: data.order.fee,
                expectedDelivery: data.order.estimated_deliver_time,
            };
        }
        return { success: false, error: data.message || 'Failed to create shipping order' };
    }
    catch (error) {
        console.error('GHTK create order error:', error);
        return { success: false, error: 'Failed to create shipping order' };
    }
}
// Track GHTK order
async function trackGHTKOrder(trackingCode) {
    const config = getGHTKConfig();
    if (!config) {
        return { success: false, error: 'GHTK not configured' };
    }
    try {
        const response = await fetch(`${config.apiUrl}/services/shipment/v2/${trackingCode}`, {
            method: 'GET',
            headers: {
                Token: config.token,
            },
        });
        const data = await response.json();
        if (data.success && data.order) {
            const statusMap = {
                1: 'Chua lay hang',
                2: 'Da lay hang',
                3: 'Dang giao hang',
                4: 'Da giao hang',
                5: 'Da doi soat',
                6: 'Dang hoan',
                7: 'Khong giao duoc',
                8: 'Delay',
                9: 'Khong lay duoc',
                10: 'Da huy',
                20: 'Da tra hang cho nguoi gui',
                21: 'Da tra hang mot phan',
            };
            return {
                success: true,
                status: String(data.order.status),
                statusText: statusMap[data.order.status] || `Status ${data.order.status}`,
                updatedAt: data.order.modified,
            };
        }
        return { success: false, error: data.message || 'Failed to track order' };
    }
    catch (error) {
        console.error('GHTK tracking error:', error);
        return { success: false, error: 'Failed to track order' };
    }
}
// Log shipping order to database
async function logShippingOrder(data) {
    try {
        await (0, db_1.executeQuery)(`INSERT INTO ShippingOrders (OrderID, Provider, TrackingCode, ShippingOrderID, Fee, Status, CreatedAt)
       VALUES (@orderId, @provider, @trackingCode, @shippingOrderId, @fee, @status, GETDATE())`, data);
    }
    catch (error) {
        console.error('Failed to log shipping order:', error);
    }
}
// Update shipping order status
async function updateShippingStatus(trackingCode, status) {
    try {
        await (0, db_1.executeQuery)(`UPDATE ShippingOrders SET Status = @status, UpdatedAt = GETDATE() WHERE TrackingCode = @trackingCode`, { trackingCode, status });
    }
    catch (error) {
        console.error('Failed to update shipping status:', error);
    }
}
//# sourceMappingURL=shipping-service.js.map