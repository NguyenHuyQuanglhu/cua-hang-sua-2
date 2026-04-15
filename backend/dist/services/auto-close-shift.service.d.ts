/**
 * Service tự động đóng ca làm việc khi hết thời gian
 */
export declare class AutoCloseShiftService {
    private cronJob;
    private isRunning;
    /**
     * Khởi động service - chạy mỗi phút để kiểm tra
     */
    start(): void;
    /**
     * Dừng service
     */
    stop(): void;
    /**
     * Kiểm tra và đóng các ca đã hết thời gian
     */
    private checkAndCloseExpiredShifts;
    /**
     * Tự động đóng ca
     */
    private autoCloseShift;
}
export declare const autoCloseShiftService: AutoCloseShiftService;
//# sourceMappingURL=auto-close-shift.service.d.ts.map