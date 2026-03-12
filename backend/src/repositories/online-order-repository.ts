import { query, queryOne, withTransaction } from '../db';

/**
 * Order status types
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cod' | 'bank_transfer';

/**
 * Shipping Address interface
 */
export interface ShippingAddress {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
}

/**
 * Online Order entity interface
 */
export interface OnlineOrder {
  id: string;
  orderNumber: string;
  onlineStoreId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  shippingFee: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  internalNote?: string;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

/**
 * Online Order Item entity interface
 */
export interface OnlineOrderItem {
  id: string;
  orderId: string;
  onlineProductId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt?: string;
}

/**
 * Online Order with items
 */
export interface OnlineOrderWithItems extends OnlineOrder {
  items: OnlineOrderItem[];
}


/**
 * Database record interfaces (snake_case)
 */
interface OnlineOrderRecord {
  id: string;
  order_number: string;
  online_store_id: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_method: string | null;
  shipping_fee: number;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery: Date | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_note: string | null;
  internal_note: string | null;
  created_at: Date;
  updated_at: Date;
  confirmed_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
}

interface OnlineOrderItemRecord {
  id: string;
  order_id: string;
  online_product_id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

/**
 * Create order input
 */
export interface CreateOnlineOrderInput {
  onlineStoreId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  shippingFee: number;
  subtotal: number;
  discountAmount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  items: CreateOnlineOrderItemInput[];
}

export interface CreateOnlineOrderItemInput {
  onlineProductId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Order filter options
 */
export interface OrderFilterOptions {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  searchTerm?: string;
}


/**
 * Online Order repository for managing online orders
 */
export class OnlineOrderRepository {
  /**
   * Map database record to OnlineOrder entity
   */
  private mapOrderToEntity(record: OnlineOrderRecord): OnlineOrder {
    let shippingAddress: ShippingAddress;
    try {
      shippingAddress = JSON.parse(record.shipping_address);
    } catch {
      shippingAddress = {
        fullName: '',
        phone: '',
        province: '',
        district: '',
        ward: '',
        addressLine: record.shipping_address,
      };
    }

    return {
      id: record.id,
      orderNumber: record.order_number,
      onlineStoreId: record.online_store_id,
      customerId: record.customer_id || undefined,
      customerEmail: record.customer_email,
      customerName: record.customer_name,
      customerPhone: record.customer_phone,
      shippingAddress,
      shippingMethod: record.shipping_method || undefined,
      shippingFee: record.shipping_fee,
      trackingNumber: record.tracking_number || undefined,
      carrier: record.carrier || undefined,
      estimatedDelivery: record.estimated_delivery instanceof Date
        ? record.estimated_delivery.toISOString()
        : record.estimated_delivery ? String(record.estimated_delivery) : undefined,
      subtotal: record.subtotal,
      discountAmount: record.discount_amount,
      total: record.total,
      status: record.status as OrderStatus,
      paymentStatus: record.payment_status as PaymentStatus,
      paymentMethod: record.payment_method as PaymentMethod,
      customerNote: record.customer_note || undefined,
      internalNote: record.internal_note || undefined,
      createdAt: record.created_at instanceof Date
        ? record.created_at.toISOString()
        : String(record.created_at),
      updatedAt: record.updated_at instanceof Date
        ? record.updated_at.toISOString()
        : String(record.updated_at),
      confirmedAt: record.confirmed_at instanceof Date
        ? record.confirmed_at.toISOString()
        : record.confirmed_at ? String(record.confirmed_at) : undefined,
      shippedAt: record.shipped_at instanceof Date
        ? record.shipped_at.toISOString()
        : record.shipped_at ? String(record.shipped_at) : undefined,
      deliveredAt: record.delivered_at instanceof Date
        ? record.delivered_at.toISOString()
        : record.delivered_at ? String(record.delivered_at) : undefined,
      cancelledAt: record.cancelled_at instanceof Date
        ? record.cancelled_at.toISOString()
        : record.cancelled_at ? String(record.cancelled_at) : undefined,
    };
  }

  /**
   * Map database record to OnlineOrderItem entity
   */
  private mapItemToEntity(record: OnlineOrderItemRecord): OnlineOrderItem {
    return {
      id: record.id,
      orderId: record.order_id,
      onlineProductId: record.online_product_id,
      productName: record.product_name,
      productSku: record.product_sku || undefined,
      quantity: record.quantity,
      unitPrice: record.unit_price,
      totalPrice: record.total_price,
      createdAt: record.created_at instanceof Date
        ? record.created_at.toISOString()
        : String(record.created_at),
    };
  }

  /**
   * Generate order number (format: ON{YYYYMMDD}{SEQ})
   */
  private async generateOrderNumber(onlineStoreId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ON${dateStr}`;

    // Get the count of orders today for this store
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM OnlineOrders 
       WHERE online_store_id = @onlineStoreId AND order_number LIKE @prefix`,
      { onlineStoreId, prefix: `${prefix}%` }
    );

    const seq = (result?.count ?? 0) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * Find order by ID
   */
  async findById(id: string, onlineStoreId: string): Promise<OnlineOrder | null> {
    const result = await queryOne<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE id = @id AND online_store_id = @onlineStoreId`,
      { id, onlineStoreId }
    );
    return result ? this.mapOrderToEntity(result) : null;
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string, onlineStoreId: string): Promise<OnlineOrder | null> {
    const result = await queryOne<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE order_number = @orderNumber AND online_store_id = @onlineStoreId`,
      { orderNumber, onlineStoreId }
    );
    return result ? this.mapOrderToEntity(result) : null;
  }

  /**
   * Find orders by store with filters
   */
  async findByStore(onlineStoreId: string, filters?: OrderFilterOptions): Promise<OnlineOrder[]> {
    let queryString = `SELECT * FROM OnlineOrders WHERE online_store_id = @onlineStoreId`;
    const params: Record<string, unknown> = { onlineStoreId };

    if (filters?.status) {
      queryString += ` AND status = @status`;
      params.status = filters.status;
    }

    if (filters?.paymentStatus) {
      queryString += ` AND payment_status = @paymentStatus`;
      params.paymentStatus = filters.paymentStatus;
    }

    if (filters?.customerId) {
      queryString += ` AND customer_id = @customerId`;
      params.customerId = filters.customerId;
    }

    if (filters?.startDate) {
      queryString += ` AND created_at >= @startDate`;
      params.startDate = filters.startDate;
    }

    if (filters?.endDate) {
      queryString += ` AND created_at <= @endDate`;
      params.endDate = filters.endDate;
    }

    if (filters?.searchTerm) {
      queryString += ` AND (order_number LIKE @searchTerm OR customer_name LIKE @searchTerm OR customer_email LIKE @searchTerm)`;
      params.searchTerm = `%${filters.searchTerm}%`;
    }

    queryString += ` ORDER BY created_at DESC`;

    const results = await query<OnlineOrderRecord>(queryString, params);
    return results.map((r) => this.mapOrderToEntity(r));
  }

  /**
   * Find orders by customer
   */
  async findByCustomer(customerId: string, onlineStoreId: string): Promise<OnlineOrder[]> {
    const results = await query<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE customer_id = @customerId AND online_store_id = @onlineStoreId ORDER BY created_at DESC`,
      { customerId, onlineStoreId }
    );
    return results.map((r) => this.mapOrderToEntity(r));
  }

  /**
   * Get order with items
   */
  async getOrderWithItems(orderId: string, onlineStoreId: string): Promise<OnlineOrderWithItems | null> {
    const order = await this.findById(orderId, onlineStoreId);
    if (!order) return null;

    const items = await this.getOrderItems(orderId);
    return { ...order, items };
  }

  /**
   * Get order items
   */
  async getOrderItems(orderId: string): Promise<OnlineOrderItem[]> {
    const results = await query<OnlineOrderItemRecord>(
      `SELECT * FROM OnlineOrderItems WHERE order_id = @orderId`,
      { orderId }
    );
    return results.map((r) => this.mapItemToEntity(r));
  }

  /**
   * Create order with items in transaction
   */
  async create(data: CreateOnlineOrderInput): Promise<OnlineOrderWithItems> {
    return withTransaction(async (transaction) => {
      const orderId = crypto.randomUUID();
      const orderNumber = await this.generateOrderNumber(data.onlineStoreId);

      // Create order
      const request = transaction.request();
      request.input('id', orderId);
      request.input('orderNumber', orderNumber);
      request.input('onlineStoreId', data.onlineStoreId);
      request.input('customerId', data.customerId || null);
      request.input('customerEmail', data.customerEmail);
      request.input('customerName', data.customerName);
      request.input('customerPhone', data.customerPhone);
      request.input('shippingAddress', JSON.stringify(data.shippingAddress));
      request.input('shippingMethod', data.shippingMethod || null);
      request.input('shippingFee', data.shippingFee);
      request.input('subtotal', data.subtotal);
      request.input('discountAmount', data.discountAmount ?? 0);
      request.input('total', data.total);
      request.input('paymentMethod', data.paymentMethod);
      request.input('customerNote', data.customerNote || null);

      await request.query(`
        INSERT INTO OnlineOrders (
          id, order_number, online_store_id, customer_id, customer_email, customer_name,
          customer_phone, shipping_address, shipping_method, shipping_fee, subtotal,
          discount_amount, total, status, payment_status, payment_method, customer_note,
          created_at, updated_at
        ) VALUES (
          @id, @orderNumber, @onlineStoreId, @customerId, @customerEmail, @customerName,
          @customerPhone, @shippingAddress, @shippingMethod, @shippingFee, @subtotal,
          @discountAmount, @total, 'pending', 'pending', @paymentMethod, @customerNote,
          GETDATE(), GETDATE()
        )
      `);

      // Create order items
      for (const item of data.items) {
        const itemId = crypto.randomUUID();
        const itemRequest = transaction.request();
        itemRequest.input('id', itemId);
        itemRequest.input('orderId', orderId);
        itemRequest.input('onlineProductId', item.onlineProductId);
        itemRequest.input('productName', item.productName);
        itemRequest.input('productSku', item.productSku || null);
        itemRequest.input('quantity', item.quantity);
        itemRequest.input('unitPrice', item.unitPrice);
        itemRequest.input('totalPrice', item.quantity * item.unitPrice);

        await itemRequest.query(`
          INSERT INTO OnlineOrderItems (
            id, order_id, online_product_id, product_name, product_sku,
            quantity, unit_price, total_price, created_at
          ) VALUES (
            @id, @orderId, @onlineProductId, @productName, @productSku,
            @quantity, @unitPrice, @totalPrice, GETDATE()
          )
        `);
      }

      // Fetch created order with items
      const order = await this.findById(orderId, data.onlineStoreId);
      if (!order) {
        throw new Error('Failed to create order');
      }

      const items = await this.getOrderItems(orderId);
      return { ...order, items };
    });
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: OrderStatus, onlineStoreId: string): Promise<OnlineOrder> {
    const existing = await this.findById(orderId, onlineStoreId);
    if (!existing) {
      throw new Error('Order not found');
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[existing.status].includes(status)) {
      throw new Error(`Invalid status transition from ${existing.status} to ${status}`);
    }

    // Build update query with timestamp
    let timestampField = '';
    switch (status) {
      case 'confirmed':
        timestampField = ', confirmed_at = GETDATE()';
        break;
      case 'shipped':
        timestampField = ', shipped_at = GETDATE()';
        break;
      case 'delivered':
        timestampField = ', delivered_at = GETDATE()';
        break;
      case 'cancelled':
        timestampField = ', cancelled_at = GETDATE()';
        break;
    }

    await query(
      `UPDATE OnlineOrders SET status = @status, updated_at = GETDATE()${timestampField} WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId, status }
    );

    const updated = await this.findById(orderId, onlineStoreId);
    if (!updated) {
      throw new Error('Failed to update order status');
    }
    return updated;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, onlineStoreId: string): Promise<OnlineOrder> {
    const existing = await this.findById(orderId, onlineStoreId);
    if (!existing) {
      throw new Error('Order not found');
    }

    await query(
      `UPDATE OnlineOrders SET payment_status = @paymentStatus, updated_at = GETDATE() WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId, paymentStatus }
    );

    const updated = await this.findById(orderId, onlineStoreId);
    if (!updated) {
      throw new Error('Failed to update payment status');
    }
    return updated;
  }

  /**
   * Update shipping info
   */
  async updateShippingInfo(
    orderId: string,
    onlineStoreId: string,
    trackingNumber?: string,
    carrier?: string,
    estimatedDelivery?: Date
  ): Promise<OnlineOrder> {
    const existing = await this.findById(orderId, onlineStoreId);
    if (!existing) {
      throw new Error('Order not found');
    }

    await query(
      `UPDATE OnlineOrders SET 
        tracking_number = @trackingNumber, 
        carrier = @carrier, 
        estimated_delivery = @estimatedDelivery,
        updated_at = GETDATE() 
       WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      {
        orderId,
        onlineStoreId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        estimatedDelivery: estimatedDelivery || null,
      }
    );

    const updated = await this.findById(orderId, onlineStoreId);
    if (!updated) {
      throw new Error('Failed to update shipping info');
    }
    return updated;
  }

  /**
   * Add internal note
   */
  async addInternalNote(orderId: string, note: string, onlineStoreId: string): Promise<OnlineOrder> {
    await query(
      `UPDATE OnlineOrders SET internal_note = @note, updated_at = GETDATE() WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId, note }
    );

    const updated = await this.findById(orderId, onlineStoreId);
    if (!updated) {
      throw new Error('Failed to add internal note');
    }
    return updated;
  }

  /**
   * Count orders by status
   */
  async countByStatus(onlineStoreId: string): Promise<Record<OrderStatus, number>> {
    const results = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM OnlineOrders WHERE online_store_id = @onlineStoreId GROUP BY status`,
      { onlineStoreId }
    );

    const counts: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    results.forEach((r) => {
      counts[r.status as OrderStatus] = r.count;
    });

    return counts;
  }

  /**
   * Get order statistics
   */
  async getStatistics(onlineStoreId: string, startDate?: Date, endDate?: Date): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    let queryString = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
      FROM OnlineOrders 
      WHERE online_store_id = @onlineStoreId AND status != 'cancelled'
    `;
    const params: Record<string, unknown> = { onlineStoreId };

    if (startDate) {
      queryString += ` AND created_at >= @startDate`;
      params.startDate = startDate;
    }

    if (endDate) {
      queryString += ` AND created_at <= @endDate`;
      params.endDate = endDate;
    }

    const result = await queryOne<{ total_orders: number; total_revenue: number }>(queryString, params);

    const totalOrders = result?.total_orders ?? 0;
    const totalRevenue = result?.total_revenue ?? 0;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }

  /**
   * Count total orders for an online store
   */
  async count(onlineStoreId: string): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM OnlineOrders WHERE online_store_id = @onlineStoreId`,
      { onlineStoreId }
    );
    return result?.total ?? 0;
  }
}

// Export singleton instance
export const onlineOrderRepository = new OnlineOrderRepository();
