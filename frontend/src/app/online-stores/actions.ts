'use client';

import { apiClient } from '@/lib/api-client';

export interface OnlineStore {
  id: string;
  storeId: string;
  physicalStoreName?: string;
  physicalStoreStatus?: 'active' | 'inactive';
  slug: string;
  customDomain?: string;
  isActive: boolean;
  storeName: string;
  logo?: string;
  favicon?: string;
  description?: string;
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  orderCount?: number;
}

/**
 * Fetch all online stores
 */
export async function getOnlineStores(): Promise<{
  success: boolean;
  data?: OnlineStore[];
  error?: string;
}> {
  try {
    const stores = await apiClient.getOnlineStores();
    return { success: true, data: stores as unknown as OnlineStore[] };
  } catch (error: unknown) {
    console.error('Error fetching online stores:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách cửa hàng online' 
    };
  }
}

/**
 * Get a single online store by ID
 */
export async function getOnlineStore(storeId: string): Promise<{
  success: boolean;
  data?: OnlineStore;
  error?: string;
}> {
  try {
    const store = await apiClient.getOnlineStore(storeId);
    return { success: true, data: store as unknown as OnlineStore };
  } catch (error: unknown) {
    console.error('Error fetching online store:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin cửa hàng online' 
    };
  }
}

/**
 * Create a new online store
 */
export async function createOnlineStore(store: Record<string, unknown>): Promise<{ 
  success: boolean; 
  store?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createOnlineStore(store);
    return { success: true, store: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating online store:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo cửa hàng online' 
    };
  }
}

/**
 * Update an online store
 */
export async function updateOnlineStore(storeId: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateOnlineStore(storeId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating online store:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật cửa hàng online' 
    };
  }
}

/**
 * Delete an online store (soft delete)
 */
export async function deleteOnlineStore(storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateOnlineStore(storeId, { isActive: false });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting online store:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa cửa hàng online' 
    };
  }
}

/**
 * Permanently delete an online store
 */
export async function permanentDeleteOnlineStore(storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteOnlineStore(storeId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error permanently deleting online store:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa vĩnh viễn cửa hàng online' 
    };
  }
}


/**
 * Sync products from main store to online store
 */
export async function syncOnlineStoreProducts(
  onlineStoreId: string,
  categoryId?: string,
  physicalStoreId?: string
): Promise<{
  success: boolean;
  message?: string;
  synced?: number;
  skipped?: number;
  total?: number;
  error?: string;
}> {
  try {
    // Temporarily set the physical store ID if provided
    const originalStoreId = apiClient.getStoreId();
    if (physicalStoreId) {
      apiClient.setStoreId(physicalStoreId);
    }
    
    try {
      const result = await apiClient.request<{
        success: boolean;
        message: string;
        synced: number;
        skipped: number;
        total: number;
      }>(`/online-stores/${onlineStoreId}/sync`, { 
        method: 'POST',
        body: categoryId && categoryId !== 'all' ? { categoryId } : undefined,
      });
      
      return {
        success: true,
        message: result.message,
        synced: result.synced,
        skipped: result.skipped,
        total: result.total,
      };
    } finally {
      // Restore original store ID
      if (physicalStoreId && originalStoreId) {
        apiClient.setStoreId(originalStoreId);
      }
    }
  } catch (error: unknown) {
    console.error('Error syncing products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể đồng bộ sản phẩm',
    };
  }
}


/**
 * Online Product interface
 */
export interface OnlineProduct {
  id: string;
  onlineStoreId: string;
  productId: string;
  isPublished: boolean;
  onlinePrice?: number;
  onlineDescription?: string;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoSlug: string;
  images?: string;
  createdAt?: string;
  updatedAt?: string;
  // Extended fields from product details
  productName?: string;
  productBarcode?: string;
  sellingPrice?: number;
  currentStock?: number;
  categoryName?: string;
}

/**
 * Get all online products for an online store
 */
export async function getOnlineProducts(onlineStoreId: string): Promise<{
  success: boolean;
  data?: OnlineProduct[];
  error?: string;
}> {
  try {
    const products = await apiClient.request<OnlineProduct[]>(
      `/online-stores/${onlineStoreId}/products`
    );
    return { success: true, data: products };
  } catch (error: unknown) {
    console.error('Error fetching online products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải danh sách sản phẩm online',
    };
  }
}

/**
 * Update an online product
 */
export async function updateOnlineProduct(
  onlineStoreId: string,
  productId: string,
  data: Partial<OnlineProduct>
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(`/online-stores/${onlineStoreId}/products/${productId}`, {
      method: 'PUT',
      body: data,
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating online product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm',
    };
  }
}

/**
 * Delete an online product
 */
export async function deleteOnlineProduct(
  onlineStoreId: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(`/online-stores/${onlineStoreId}/products/${productId}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting online product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa sản phẩm',
    };
  }
}

/**
 * Add a product to online store
 */
export async function addOnlineProduct(
  onlineStoreId: string,
  data: {
    productId: string;
    isPublished?: boolean;
    onlinePrice?: number;
    onlineDescription?: string;
    seoSlug?: string;
    seoTitle?: string;
    seoDescription?: string;
  }
): Promise<{ success: boolean; data?: OnlineProduct; error?: string }> {
  try {
    const result = await apiClient.request<OnlineProduct>(
      `/online-stores/${onlineStoreId}/products`,
      {
        method: 'POST',
        body: data,
      }
    );
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error('Error adding online product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể thêm sản phẩm',
    };
  }
}


// Order types
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OnlineOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  onlineStoreId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  shippingFee: number;
  discount: number;
  discountAmount?: number;
  total: number;
  customerNote?: string;
  note?: string;
  internalNote?: string;
  items: OnlineOrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all orders for an online store
 */
export async function getOnlineOrders(
  onlineStoreId: string,
  params?: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  success: boolean;
  data?: OnlineOrder[];
  statistics?: {
    statusCounts: Record<string, number>;
    total: number;
  };
  error?: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);

    const query = queryParams.toString();
    const path = `/online-stores/${onlineStoreId}/orders${query ? `?${query}` : ''}`;

    const result = await apiClient.request<{
      success?: boolean;
      data?: OnlineOrder[];
      orders?: OnlineOrder[];
      statistics?: {
        statusCounts: Record<string, number>;
        total: number;
      };
      total?: number;
    }>(path);

    const data = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.orders)
        ? result.orders
        : [];

    const statistics = result?.statistics || {
      statusCounts: {},
      total: Number(result?.total || data.length),
    };

    return { success: true, data, statistics };
  } catch (error: unknown) {
    console.error('Error fetching online orders:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách đơn hàng',
    };
  }
}

/**
 * Update order status
 */
export async function updateOnlineOrderStatus(
  onlineStoreId: string,
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(
      `/online-stores/${onlineStoreId}/orders/${orderId}/status`,
      {
        method: 'PUT',
        body: { status },
      }
    );
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái đơn hàng',
    };
  }
}

// Shipping zone types
export interface ShippingZone {
  id: string;
  onlineStoreId: string;
  name: string;
  provinces: string[];
  shippingFee: number;
  flatRate?: number;
  freeShippingThreshold?: number;
  estimatedDays: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get shipping zones for an online store
 */
export async function getShippingZones(onlineStoreId: string): Promise<{
  success: boolean;
  data?: ShippingZone[];
  error?: string;
}> {
  try {
    const zones = await apiClient.request<ShippingZone[]>(
      `/online-stores/${onlineStoreId}/shipping-zones`
    );
    return { success: true, data: zones };
  } catch (error: unknown) {
    console.error('Error fetching shipping zones:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách vùng vận chuyển',
    };
  }
}

/**
 * Create a shipping zone
 */
export async function createShippingZone(
  onlineStoreId: string,
  data: {
    name: string;
    provinces: string[];
    isActive: boolean;
    flatRate?: number;
    shippingFee?: number;
    freeShippingThreshold?: number;
    estimatedDays?: string;
  }
): Promise<{ success: boolean; data?: ShippingZone; error?: string }> {
  try {
    const payload = {
      ...data,
      shippingFee: Number(data.shippingFee ?? data.flatRate ?? 0),
      estimatedDays: data.estimatedDays || '1-3 ngày',
    };

    const zone = await apiClient.request<ShippingZone>(
      `/online-stores/${onlineStoreId}/shipping-zones`,
      {
        method: 'POST',
        body: payload,
      }
    );
    return { success: true, data: zone };
  } catch (error: unknown) {
    console.error('Error creating shipping zone:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể tạo vùng vận chuyển',
    };
  }
}

/**
 * Update a shipping zone
 */
export async function updateShippingZone(
  onlineStoreId: string,
  zoneId: string,
  data: Partial<ShippingZone>
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(
      `/online-stores/${onlineStoreId}/shipping-zones/${zoneId}`,
      {
        method: 'PUT',
        body: data,
      }
    );
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating shipping zone:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật vùng vận chuyển',
    };
  }
}

/**
 * Delete a shipping zone
 */
export async function deleteShippingZone(
  onlineStoreId: string,
  zoneId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(
      `/online-stores/${onlineStoreId}/shipping-zones/${zoneId}`,
      {
        method: 'DELETE',
      }
    );
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting shipping zone:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể xóa vùng vận chuyển',
    };
  }
}
