"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables FIRST before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const units_1 = __importDefault(require("./routes/units"));
const products_1 = __importDefault(require("./routes/products"));
const customers_1 = __importDefault(require("./routes/customers"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const sales_1 = __importDefault(require("./routes/sales"));
const purchases_1 = __importDefault(require("./routes/purchases"));
const shifts_1 = __importDefault(require("./routes/shifts"));
const cash_flow_1 = __importDefault(require("./routes/cash-flow"));
const settings_1 = __importDefault(require("./routes/settings"));
const users_1 = __importDefault(require("./routes/users"));
const stores_1 = __importDefault(require("./routes/stores"));
const reports_1 = __importDefault(require("./routes/reports"));
const supplier_payments_1 = __importDefault(require("./routes/supplier-payments"));
const customer_payments_1 = __importDefault(require("./routes/customer-payments"));
const online_stores_1 = __importDefault(require("./routes/online-stores"));
const storefront_1 = __importDefault(require("./routes/storefront"));
const tenants_1 = __importDefault(require("./routes/tenants"));
const sync_data_1 = __importDefault(require("./routes/sync-data"));
const loyalty_points_1 = __importDefault(require("./routes/loyalty-points"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const unit_conversion_1 = __importDefault(require("./routes/unit-conversion"));
const upload_1 = __importDefault(require("./routes/upload"));
const bulk_import_1 = __importDefault(require("./routes/bulk-import"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const in_app_notifications_1 = __importDefault(require("./routes/in-app-notifications"));
const shipping_1 = __importDefault(require("./routes/shipping"));
const mpc_optimizer_1 = __importDefault(require("./routes/mpc-optimizer"));
const promotions_1 = __importDefault(require("./routes/promotions"));
const vouchers_1 = __importDefault(require("./routes/vouchers"));
const printing_1 = __importDefault(require("./routes/printing"));
const devices_1 = __importDefault(require("./routes/devices"));
// Import auto-close shift service
const auto_close_shift_service_1 = require("./services/auto-close-shift.service");
const notification_generator_service_1 = require("./services/notification-generator.service");
// Import error handling middleware
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Log database config for debugging
console.log('Database config:', {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
});
// Middleware
// More permissive CORS for development
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Id'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Static files - serve uploaded images
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Debug: Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', {
        authorization: req.headers.authorization ? 'Bearer ***' : 'none',
        'x-store-id': req.headers['x-store-id'] || 'none',
    });
    next();
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/units', units_1.default);
app.use('/api/products', products_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/sales', sales_1.default);
app.use('/api/purchases', purchases_1.default);
app.use('/api/shifts', shifts_1.default);
app.use('/api/cash-flow', cash_flow_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/users', users_1.default);
app.use('/api/stores', stores_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/supplier-payments', supplier_payments_1.default);
app.use('/api/customer-payments', customer_payments_1.default);
app.use('/api/payments', customer_payments_1.default); // Alias for customer payments
app.use('/api/online-stores', online_stores_1.default);
app.use('/api/storefront', storefront_1.default);
app.use('/api/tenants', tenants_1.default);
app.use('/api/sync-data', sync_data_1.default);
app.use('/api/loyalty-points', loyalty_points_1.default);
app.use('/api/subscription', subscription_1.default);
app.use('/api', unit_conversion_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/bulk', bulk_import_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/in-app-notifications', in_app_notifications_1.default);
app.use('/api/shipping', shipping_1.default);
app.use('/api/mpc', mpc_optimizer_1.default);
app.use('/api/promotions', promotions_1.default);
app.use('/api/vouchers', vouchers_1.default);
app.use('/api/printing', printing_1.default);
app.use('/api/devices', devices_1.default);
// 404 handler - must be before error handler
app.use(errorHandler_1.notFoundHandler);
// Error handling middleware - must be last
app.use((0, errorHandler_1.errorHandler)({
    includeStackTrace: process.env.NODE_ENV === 'development',
    logErrors: true,
    sendAdminAlerts: process.env.NODE_ENV === 'production',
}));
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    // Khởi động service tự động đóng ca
    auto_close_shift_service_1.autoCloseShiftService.start();
    // Khởi động service tạo thông báo tự động
    notification_generator_service_1.notificationGeneratorService.start();
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    auto_close_shift_service_1.autoCloseShiftService.stop();
    notification_generator_service_1.notificationGeneratorService.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    auto_close_shift_service_1.autoCloseShiftService.stop();
    notification_generator_service_1.notificationGeneratorService.stop();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=index.js.map