import type { OnlineOrderWithItems, OrderStatus } from '../repositories/online-order-repository';
import type { OnlineStore } from '../repositories/online-store-repository';
/**
 * Email template data for order confirmation
 */
interface OrderConfirmationData {
    order: OnlineOrderWithItems;
    store: OnlineStore;
}
/**
 * Email template data for status update
 */
interface StatusUpdateData {
    order: OnlineOrderWithItems;
    store: OnlineStore;
    previousStatus: OrderStatus;
    newStatus: OrderStatus;
}
/**
 * Email template data for new order alert
 */
interface NewOrderAlertData {
    order: OnlineOrderWithItems;
    store: OnlineStore;
}
/**
 * Email Notification Service
 * Handles sending email notifications for online store orders
 */
export declare class EmailNotificationService {
    private transporter;
    private config;
    constructor();
    /**
     * Initialize the email transporter from environment variables
     */
    private initializeTransporter;
    /**
     * Check if email service is configured and available
     */
    isConfigured(): boolean;
    /**
     * Send an email (public method for custom emails)
     */
    sendEmail(options: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
    }): Promise<boolean>;
    /**
     * Send an email (private method for internal use)
     */
    private sendEmailInternal;
    /**
     * Generate order items HTML table
     */
    private generateOrderItemsTable;
    /**
     * Generate base email template
     */
    private generateEmailTemplate;
    /**
     * Send order confirmation email to customer
     */
    sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean>;
    /**
     * Send new order alert to store owner
     */
    sendNewOrderAlert(data: NewOrderAlertData): Promise<boolean>;
    /**
     * Send order status update notification to customer
     */
    sendStatusUpdateNotification(data: StatusUpdateData): Promise<boolean>;
}
export declare const emailNotificationService: EmailNotificationService;
export {};
//# sourceMappingURL=email-notification-service.d.ts.map