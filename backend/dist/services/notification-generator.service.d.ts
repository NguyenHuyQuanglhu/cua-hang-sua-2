declare class NotificationGeneratorService {
    private cronJob;
    start(): void;
    stop(): void;
    private checkLowStock;
    private checkDebtReminders;
    private checkShiftEnding;
    /**
     * Create notification when customer tier is upgraded
     */
    createTierUpgradeNotification(customerId: string, customerName: string, storeId: string, oldTier: string, newTier: string, lifetimePoints: number): Promise<void>;
}
export declare const notificationGeneratorService: NotificationGeneratorService;
export {};
//# sourceMappingURL=notification-generator.service.d.ts.map