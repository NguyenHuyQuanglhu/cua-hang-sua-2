"use strict";
/**
 * Service tích hợp thiết bị phần cứng cho POS
 * Hỗ trợ: máy in nhiệt, máy quẹt thẻ, cân điện tử, màn hình khách hàng
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceIntegrationService = exports.DeviceIntegrationService = void 0;
class DeviceIntegrationService {
    printerConfig = null;
    cardReaderConfig = null;
    scaleConfig = null;
    displayConfig = null;
    /**
     * Cấu hình máy in nhiệt
     */
    configureThermalPrinter(config) {
        this.printerConfig = config;
        console.log('Thermal printer configured:', config);
    }
    /**
     * In hóa đơn nhiệt (80mm)
     */
    async printThermalReceipt(receipt) {
        if (!this.printerConfig) {
            throw new Error('Printer not configured');
        }
        // ESC/POS commands cho máy in nhiệt
        const commands = [];
        // Initialize printer
        commands.push('\x1B\x40'); // ESC @
        // Center align
        commands.push('\x1B\x61\x01'); // ESC a 1
        // Bold on
        commands.push('\x1B\x45\x01'); // ESC E 1
        // Store name (double size)
        commands.push('\x1D\x21\x11'); // GS ! 17
        commands.push(receipt.storeName + '\n');
        // Normal size
        commands.push('\x1D\x21\x00'); // GS ! 0
        // Bold off
        commands.push('\x1B\x45\x00'); // ESC E 0
        // Store address
        commands.push(receipt.storeAddress + '\n');
        // Left align
        commands.push('\x1B\x61\x00'); // ESC a 0
        // Separator
        commands.push('--------------------------------\n');
        // Receipt info
        commands.push(`Hóa đơn: ${receipt.receiptNumber}\n`);
        commands.push(`Ngày: ${receipt.date.toLocaleString('vi-VN')}\n`);
        commands.push('--------------------------------\n');
        // Items
        receipt.items.forEach((item) => {
            const itemLine = this.formatReceiptLine(item.name, `${item.quantity}x${item.price.toLocaleString('vi-VN')}`);
            commands.push(itemLine + '\n');
            const totalLine = this.formatReceiptLine('', item.total.toLocaleString('vi-VN') + 'đ');
            commands.push(totalLine + '\n');
        });
        commands.push('--------------------------------\n');
        // Totals
        commands.push(this.formatReceiptLine('Tạm tính:', receipt.subtotal.toLocaleString('vi-VN') + 'đ') + '\n');
        if (receipt.discount > 0) {
            commands.push(this.formatReceiptLine('Giảm giá:', '-' + receipt.discount.toLocaleString('vi-VN') + 'đ') + '\n');
        }
        if (receipt.tax > 0) {
            commands.push(this.formatReceiptLine('Thuế:', receipt.tax.toLocaleString('vi-VN') + 'đ') + '\n');
        }
        // Bold on for total
        commands.push('\x1B\x45\x01'); // ESC E 1
        commands.push('\x1D\x21\x11'); // GS ! 17 (double size)
        commands.push(this.formatReceiptLine('TỔNG CỘNG:', receipt.total.toLocaleString('vi-VN') + 'đ') + '\n');
        commands.push('\x1D\x21\x00'); // GS ! 0 (normal size)
        commands.push('\x1B\x45\x00'); // ESC E 0 (bold off)
        commands.push('--------------------------------\n');
        // Payment info
        commands.push(`Thanh toán: ${receipt.paymentMethod}\n`);
        commands.push(this.formatReceiptLine('Tiền khách đưa:', receipt.amountPaid.toLocaleString('vi-VN') + 'đ') + '\n');
        commands.push(this.formatReceiptLine('Tiền thừa:', receipt.change.toLocaleString('vi-VN') + 'đ') + '\n');
        // Center align
        commands.push('\x1B\x61\x01'); // ESC a 1
        commands.push('\n');
        commands.push('Cảm ơn quý khách!\n');
        commands.push('Hẹn gặp lại!\n');
        // Cut paper
        commands.push('\x1D\x56\x00'); // GS V 0
        // Trong thực tế, gửi commands đến máy in qua serial port hoặc network
        console.log('Printing thermal receipt:', commands.join(''));
        return true;
    }
    /**
     * Format dòng in cho hóa đơn (căn 2 bên)
     */
    formatReceiptLine(left, right, width = 32) {
        const spaces = width - left.length - right.length;
        return left + ' '.repeat(Math.max(0, spaces)) + right;
    }
    /**
     * Cấu hình máy quẹt thẻ
     */
    configureCardReader(config) {
        this.cardReaderConfig = config;
        console.log('Card reader configured:', config);
    }
    /**
     * Đọc thẻ từ
     */
    async readMagneticCard() {
        if (!this.cardReaderConfig) {
            throw new Error('Card reader not configured');
        }
        // Trong thực tế, đọc dữ liệu từ card reader
        // Track 1 và Track 2 data
        console.log('Reading magnetic card...');
        // Giả lập dữ liệu
        return {
            cardNumber: '4111111111111111',
            cardHolder: 'NGUYEN VAN A',
            expiryDate: '12/25',
        };
    }
    /**
     * Đọc thẻ chip (EMV)
     */
    async readChipCard() {
        if (!this.cardReaderConfig) {
            throw new Error('Card reader not configured');
        }
        console.log('Reading chip card...');
        // Trong thực tế, giao tiếp với chip card qua EMV protocol
        return {
            cardNumber: '5500000000000004',
            cardHolder: 'TRAN THI B',
            expiryDate: '06/26',
        };
    }
    /**
     * Đọc thẻ không tiếp xúc (NFC/RFID)
     */
    async readContactlessCard() {
        if (!this.cardReaderConfig) {
            throw new Error('Card reader not configured');
        }
        console.log('Reading contactless card...');
        return {
            cardNumber: '6011000000000012',
            cardType: 'credit',
        };
    }
    /**
     * Cấu hình cân điện tử
     */
    configureScale(config) {
        this.scaleConfig = config;
        console.log('Scale configured:', config);
    }
    /**
     * Đọc trọng lượng từ cân
     */
    async readWeight() {
        if (!this.scaleConfig) {
            throw new Error('Scale not configured');
        }
        // Trong thực tế, đọc dữ liệu từ cân qua serial port
        // Protocol phổ biến: Toledo, Mettler, CAS
        console.log('Reading weight from scale...');
        // Giả lập dữ liệu
        return {
            weight: 1.25,
            unit: this.scaleConfig.unit,
            stable: true, // Trọng lượng đã ổn định
        };
    }
    /**
     * Tare (đặt về 0) cân
     */
    async tareScale() {
        if (!this.scaleConfig) {
            throw new Error('Scale not configured');
        }
        console.log('Taring scale...');
        return true;
    }
    /**
     * Cấu hình màn hình khách hàng
     */
    configureCustomerDisplay(config) {
        this.displayConfig = config;
        console.log('Customer display configured:', config);
    }
    /**
     * Hiển thị thông tin lên màn hình khách hàng
     */
    async displayToCustomer(line1, line2) {
        if (!this.displayConfig) {
            throw new Error('Customer display not configured');
        }
        // Cắt chuỗi theo số ký tự của màn hình
        const displayLine1 = line1.substring(0, this.displayConfig.columns).padEnd(this.displayConfig.columns);
        const displayLine2 = line2.substring(0, this.displayConfig.columns).padEnd(this.displayConfig.columns);
        // ESC/POS commands cho màn hình khách hàng
        const commands = [];
        // Clear display
        commands.push('\x0C'); // Form feed
        // Line 1
        commands.push(displayLine1);
        // Line 2
        commands.push('\n' + displayLine2);
        console.log('Customer display:', { line1: displayLine1, line2: displayLine2 });
        return true;
    }
    /**
     * Hiển thị giá sản phẩm
     */
    async displayPrice(productName, price) {
        const line1 = productName;
        const line2 = `Gia: ${price.toLocaleString('vi-VN')}d`;
        return this.displayToCustomer(line1, line2);
    }
    /**
     * Hiển thị tổng tiền
     */
    async displayTotal(total) {
        const line1 = 'TONG CONG';
        const line2 = `${total.toLocaleString('vi-VN')}d`;
        return this.displayToCustomer(line1, line2);
    }
    /**
     * Hiển thị thông báo chào mừng
     */
    async displayWelcome() {
        const line1 = 'Xin chao!';
        const line2 = 'Chuc ban vui ve!';
        return this.displayToCustomer(line1, line2);
    }
    /**
     * Xóa màn hình
     */
    async clearDisplay() {
        if (!this.displayConfig) {
            throw new Error('Customer display not configured');
        }
        console.log('Clearing customer display');
        return this.displayToCustomer('', '');
    }
    /**
     * Phát âm thanh thông báo
     */
    async playBeep(duration = 100) {
        // Gửi lệnh beep đến loa
        console.log(`Playing beep for ${duration}ms`);
        return true;
    }
    /**
     * Phát thông báo giọng nói
     */
    async playVoiceAnnouncement(message) {
        // Sử dụng text-to-speech để phát thông báo
        console.log(`Voice announcement: ${message}`);
        return true;
    }
    /**
     * Kiểm tra kết nối thiết bị
     */
    async checkDeviceConnection(deviceType) {
        switch (deviceType) {
            case 'printer':
                return this.printerConfig !== null;
            case 'cardReader':
                return this.cardReaderConfig !== null;
            case 'scale':
                return this.scaleConfig !== null;
            case 'display':
                return this.displayConfig !== null;
            default:
                return false;
        }
    }
    /**
     * Lấy trạng thái tất cả thiết bị
     */
    getDeviceStatus() {
        return {
            printer: this.printerConfig !== null,
            cardReader: this.cardReaderConfig !== null,
            scale: this.scaleConfig !== null,
            display: this.displayConfig !== null,
        };
    }
}
exports.DeviceIntegrationService = DeviceIntegrationService;
exports.deviceIntegrationService = new DeviceIntegrationService();
//# sourceMappingURL=device-integration-service.js.map