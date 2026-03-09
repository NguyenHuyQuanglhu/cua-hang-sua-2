"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCustomer = authenticateCustomer;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const CUSTOMER_AUTH_COOKIE = 'customer_token';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
/**
 * Authenticate customer request from storefront
 */
async function authenticateCustomer(request) {
    // Get token from cookie or Authorization header
    const token = request.cookies?.[CUSTOMER_AUTH_COOKIE] ||
        request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return {
            success: false,
            error: 'Vui lòng đăng nhập để tiếp tục',
            status: 401,
        };
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return {
            success: true,
            customer: {
                customerId: payload.customerId,
                onlineStoreId: payload.onlineStoreId,
                email: payload.email,
            },
        };
    }
    catch {
        return {
            success: false,
            error: 'Phiên đăng nhập đã hết hạn',
            status: 401,
        };
    }
}
//# sourceMappingURL=customer-auth.js.map