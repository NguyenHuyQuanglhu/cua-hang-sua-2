"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const device_integration_service_1 = require("../services/device-integration-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
/**
 * POST /api/devices/printer/configure
 * Cấu hình máy in nhiệt
 */
router.post('/printer/configure', async (req, res) => {
    try {
        const { type, port, baudRate, paperWidth } = req.body;
        device_integration_service_1.deviceIntegrationService.configureThermalPrinter({
            type,
            port,
            baudRate,
            paperWidth,
        });
        res.json({ success: true, message: 'Printer configured successfully' });
    }
    catch (error) {
        console.error('Printer configuration error:', error);
        res.status(500).json({ error: 'Failed to configure printer' });
    }
});
/**
 * POST /api/devices/printer/print-receipt
 * In hóa đơn nhiệt
 */
router.post('/printer/print-receipt', async (req, res) => {
    try {
        const receipt = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.printThermalReceipt(receipt);
        res.json({ success, message: success ? 'Receipt printed' : 'Print failed' });
    }
    catch (error) {
        console.error('Print receipt error:', error);
        res.status(500).json({ error: 'Failed to print receipt' });
    }
});
/**
 * POST /api/devices/card-reader/configure
 * Cấu hình máy quẹt thẻ
 */
router.post('/card-reader/configure', async (req, res) => {
    try {
        const { type, port } = req.body;
        device_integration_service_1.deviceIntegrationService.configureCardReader({ type, port });
        res.json({ success: true, message: 'Card reader configured successfully' });
    }
    catch (error) {
        console.error('Card reader configuration error:', error);
        res.status(500).json({ error: 'Failed to configure card reader' });
    }
});
/**
 * POST /api/devices/card-reader/read
 * Đọc thẻ
 */
router.post('/card-reader/read', async (req, res) => {
    try {
        const { type } = req.body;
        let cardData = null;
        switch (type) {
            case 'magnetic':
                cardData = await device_integration_service_1.deviceIntegrationService.readMagneticCard();
                break;
            case 'chip':
                cardData = await device_integration_service_1.deviceIntegrationService.readChipCard();
                break;
            case 'contactless':
                cardData = await device_integration_service_1.deviceIntegrationService.readContactlessCard();
                break;
            default:
                res.status(400).json({ error: 'Invalid card type' });
                return;
        }
        if (cardData) {
            res.json({ success: true, data: cardData });
        }
        else {
            res.json({ success: false, message: 'No card detected' });
        }
    }
    catch (error) {
        console.error('Card read error:', error);
        res.status(500).json({ error: 'Failed to read card' });
    }
});
/**
 * POST /api/devices/scale/configure
 * Cấu hình cân điện tử
 */
router.post('/scale/configure', async (req, res) => {
    try {
        const { type, port, baudRate, unit } = req.body;
        device_integration_service_1.deviceIntegrationService.configureScale({
            type,
            port,
            baudRate,
            unit,
        });
        res.json({ success: true, message: 'Scale configured successfully' });
    }
    catch (error) {
        console.error('Scale configuration error:', error);
        res.status(500).json({ error: 'Failed to configure scale' });
    }
});
/**
 * GET /api/devices/scale/read
 * Đọc trọng lượng từ cân
 */
router.get('/scale/read', async (req, res) => {
    try {
        const weightData = await device_integration_service_1.deviceIntegrationService.readWeight();
        if (weightData) {
            res.json({ success: true, data: weightData });
        }
        else {
            res.json({ success: false, message: 'Failed to read weight' });
        }
    }
    catch (error) {
        console.error('Scale read error:', error);
        res.status(500).json({ error: 'Failed to read scale' });
    }
});
/**
 * POST /api/devices/scale/tare
 * Đặt cân về 0
 */
router.post('/scale/tare', async (req, res) => {
    try {
        const success = await device_integration_service_1.deviceIntegrationService.tareScale();
        res.json({ success, message: success ? 'Scale tared' : 'Tare failed' });
    }
    catch (error) {
        console.error('Scale tare error:', error);
        res.status(500).json({ error: 'Failed to tare scale' });
    }
});
/**
 * POST /api/devices/display/configure
 * Cấu hình màn hình khách hàng
 */
router.post('/display/configure', async (req, res) => {
    try {
        const { type, port, lines, columns } = req.body;
        device_integration_service_1.deviceIntegrationService.configureCustomerDisplay({
            type,
            port,
            lines,
            columns,
        });
        res.json({ success: true, message: 'Display configured successfully' });
    }
    catch (error) {
        console.error('Display configuration error:', error);
        res.status(500).json({ error: 'Failed to configure display' });
    }
});
/**
 * POST /api/devices/display/show
 * Hiển thị thông tin lên màn hình khách hàng
 */
router.post('/display/show', async (req, res) => {
    try {
        const { line1, line2 } = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.displayToCustomer(line1, line2);
        res.json({ success, message: success ? 'Display updated' : 'Display failed' });
    }
    catch (error) {
        console.error('Display show error:', error);
        res.status(500).json({ error: 'Failed to update display' });
    }
});
/**
 * POST /api/devices/display/price
 * Hiển thị giá sản phẩm
 */
router.post('/display/price', async (req, res) => {
    try {
        const { productName, price } = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.displayPrice(productName, price);
        res.json({ success });
    }
    catch (error) {
        console.error('Display price error:', error);
        res.status(500).json({ error: 'Failed to display price' });
    }
});
/**
 * POST /api/devices/display/total
 * Hiển thị tổng tiền
 */
router.post('/display/total', async (req, res) => {
    try {
        const { total } = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.displayTotal(total);
        res.json({ success });
    }
    catch (error) {
        console.error('Display total error:', error);
        res.status(500).json({ error: 'Failed to display total' });
    }
});
/**
 * POST /api/devices/display/welcome
 * Hiển thị thông báo chào mừng
 */
router.post('/display/welcome', async (req, res) => {
    try {
        const success = await device_integration_service_1.deviceIntegrationService.displayWelcome();
        res.json({ success });
    }
    catch (error) {
        console.error('Display welcome error:', error);
        res.status(500).json({ error: 'Failed to display welcome' });
    }
});
/**
 * POST /api/devices/display/clear
 * Xóa màn hình
 */
router.post('/display/clear', async (req, res) => {
    try {
        const success = await device_integration_service_1.deviceIntegrationService.clearDisplay();
        res.json({ success });
    }
    catch (error) {
        console.error('Display clear error:', error);
        res.status(500).json({ error: 'Failed to clear display' });
    }
});
/**
 * POST /api/devices/sound/beep
 * Phát âm thanh beep
 */
router.post('/sound/beep', async (req, res) => {
    try {
        const { duration = 100 } = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.playBeep(duration);
        res.json({ success });
    }
    catch (error) {
        console.error('Beep error:', error);
        res.status(500).json({ error: 'Failed to play beep' });
    }
});
/**
 * POST /api/devices/sound/announce
 * Phát thông báo giọng nói
 */
router.post('/sound/announce', async (req, res) => {
    try {
        const { message } = req.body;
        const success = await device_integration_service_1.deviceIntegrationService.playVoiceAnnouncement(message);
        res.json({ success });
    }
    catch (error) {
        console.error('Voice announcement error:', error);
        res.status(500).json({ error: 'Failed to play announcement' });
    }
});
/**
 * GET /api/devices/status
 * Lấy trạng thái tất cả thiết bị
 */
router.get('/status', async (req, res) => {
    try {
        const status = device_integration_service_1.deviceIntegrationService.getDeviceStatus();
        res.json({ success: true, data: status });
    }
    catch (error) {
        console.error('Device status error:', error);
        res.status(500).json({ error: 'Failed to get device status' });
    }
});
/**
 * GET /api/devices/check/:deviceType
 * Kiểm tra kết nối thiết bị
 */
router.get('/check/:deviceType', async (req, res) => {
    try {
        const { deviceType } = req.params;
        if (!['printer', 'cardReader', 'scale', 'display'].includes(deviceType)) {
            res.status(400).json({ error: 'Invalid device type' });
            return;
        }
        const connected = await device_integration_service_1.deviceIntegrationService.checkDeviceConnection(deviceType);
        res.json({ success: true, connected });
    }
    catch (error) {
        console.error('Device check error:', error);
        res.status(500).json({ error: 'Failed to check device' });
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map