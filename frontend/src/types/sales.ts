/**
 * Types for the POS Sales UI Improvements feature
 * Feature: pos-sales-ui-improvements
 */

/**
 * Order status type - simplified to two states
 * - pending: Order is created but not yet processed (draft, printed)
 * - processed: Order is completed or cancelled
 */
export type OrderStatus = 'pending' | 'processed';

/**
 * Legacy order status type (for reference and migration purposes)
 * @deprecated Use OrderStatus instead
 */
export type LegacyOrderStatus = 'draft' | 'printed' | 'completed' | 'cancelled';

/**
 * Order item interface
 */
export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal?: number;
  product_name?: string;
  unit?: string;
}

/**
 * Sale entity interface
 */
export interface Sale {
  id: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  customer_id?: string;
  customer_name?: string;
  payment_method?: string;
  notes?: string;
  store_id?: string;
  user_id?: string;
  shift_id?: string;
}

/**
 * Print preference interface (stored in localStorage)
 */
export interface PrintPreference {
  enabled: boolean;
  lastUpdated: string;
}
