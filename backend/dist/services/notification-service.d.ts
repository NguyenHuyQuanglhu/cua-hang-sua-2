/**
 * Notification Service
 *
 * Handles email and SMS notifications for the system.
 * Supports templates for common notifications.
 */
export type NotificationType = 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'low_stock_alert' | 'payment_received' | 'refund_processed' | 'welcome_customer' | 'password_reset';
export declare function sendEmailNotification(to: string, type: NotificationType, data: any): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function checkAndSendLowStockAlerts(storeId: string, tenantId: string, alertEmail: string): Promise<{
    sent: boolean;
    productCount: number;
}>;
//# sourceMappingURL=notification-service.d.ts.map