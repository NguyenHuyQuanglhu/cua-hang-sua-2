/**
 * Service tích hợp thiết bị phần cứng cho POS
 * Hỗ trợ: máy in nhiệt, máy quẹt thẻ, cân điện tử, màn hình khách hàng
 */
interface PrinterConfig {
    type: 'thermal' | 'laser' | 'inkjet';
    port: string;
    baudRate?: number;
    paperWidth?: number;
}
interface CardReaderConfig {
    type: 'magnetic' | 'chip' | 'contactless';
    port: string;
}
interface ScaleConfig {
    type: 'serial' | 'usb';
    port: string;
    baudRate?: number;
    unit: 'kg' | 'g' | 'lb';
}
interface CustomerDisplayConfig {
    type: 'serial' | 'usb' | 'network';
    port: string;
    lines: number;
    columns: number;
}
export declare class DeviceIntegrationService {
    private printerConfig;
    private cardReaderConfig;
    private scaleConfig;
    private displayConfig;
    /**
     * Cấu hình máy in nhiệt
     */
    configureThermalPrinter(config: PrinterConfig): void;
    /**
     * In hóa đơn nhiệt (80mm)
     */
    printThermalReceipt(receipt: {
        storeName: string;
        storeAddress: string;
        receiptNumber: string;
        date: Date;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
            total: number;
        }>;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        paymentMethod: string;
        amountPaid: number;
        change: number;
    }): Promise<boolean>;
    /**
     * Format dòng in cho hóa đơn (căn 2 bên)
     */
    private formatReceiptLine;
    /**
     * Cấu hình máy quẹt thẻ
     */
    configureCardReader(config: CardReaderConfig): void;
    /**
     * Đọc thẻ từ
     */
    readMagneticCard(): Promise<{
        cardNumber: string;
        cardHolder: string;
        expiryDate: string;
    } | null>;
    /**
     * Đọc thẻ chip (EMV)
     */
    readChipCard(): Promise<{
        cardNumber: string;
        cardHolder: string;
        expiryDate: string;
        cvv?: string;
    } | null>;
    /**
     * Đọc thẻ không tiếp xúc (NFC/RFID)
     */
    readContactlessCard(): Promise<{
        cardNumber: string;
        cardType: 'credit' | 'debit' | 'loyalty';
    } | null>;
    /**
     * Cấu hình cân điện tử
     */
    configureScale(config: ScaleConfig): void;
    /**
     * Đọc trọng lượng từ cân
     */
    readWeight(): Promise<{
        weight: number;
        unit: string;
        stable: boolean;
    } | null>;
    /**
     * Tare (đặt về 0) cân
     */
    tareScale(): Promise<boolean>;
    /**
     * Cấu hình màn hình khách hàng
     */
    configureCustomerDisplay(config: CustomerDisplayConfig): void;
    /**
     * Hiển thị thông tin lên màn hình khách hàng
     */
    displayToCustomer(line1: string, line2: string): Promise<boolean>;
    /**
     * Hiển thị giá sản phẩm
     */
    displayPrice(productName: string, price: number): Promise<boolean>;
    /**
     * Hiển thị tổng tiền
     */
    displayTotal(total: number): Promise<boolean>;
    /**
     * Hiển thị thông báo chào mừng
     */
    displayWelcome(): Promise<boolean>;
    /**
     * Xóa màn hình
     */
    clearDisplay(): Promise<boolean>;
    /**
     * Phát âm thanh thông báo
     */
    playBeep(duration?: number): Promise<boolean>;
    /**
     * Phát thông báo giọng nói
     */
    playVoiceAnnouncement(message: string): Promise<boolean>;
    /**
     * Kiểm tra kết nối thiết bị
     */
    checkDeviceConnection(deviceType: 'printer' | 'cardReader' | 'scale' | 'display'): Promise<boolean>;
    /**
     * Lấy trạng thái tất cả thiết bị
     */
    getDeviceStatus(): {
        printer: boolean;
        cardReader: boolean;
        scale: boolean;
        display: boolean;
    };
}
export declare const deviceIntegrationService: DeviceIntegrationService;
export {};
//# sourceMappingURL=device-integration-service.d.ts.map