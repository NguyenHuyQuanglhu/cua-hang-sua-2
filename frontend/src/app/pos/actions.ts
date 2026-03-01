'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Get products for POS
 */
export async function getPOSProducts(): Promise<{
  success: boolean;
  products?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getProducts();
    const products = (response as any).data || response || [];
    return { success: true, products };
  } catch (error: unknown) {
    console.error('Error fetching POS products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách sản phẩm'
    };
  }
}

/**
 * Get customers for POS
 */
export async function getPOSCustomers(): Promise<{
  success: boolean;
  customers?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getCustomers();
    const customers = (response as any).data || response || [];
    return { success: true, customers };
  } catch (error: unknown) {
    console.error('Error fetching POS customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách khách hàng'
    };
  }
}

/**
 * Create a sale from POS
 */
export async function createPOSSale(sale: Record<string, unknown>): Promise<{
  success: boolean;
  sale?: Record<string, unknown>;
  error?: string
}> {
  try {
    const result = await apiClient.createSale(sale);
    return { success: true, sale: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating POS sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo đơn hàng'
    };
  }
}

/**
 * Get active shift for POS
 */
export async function getPOSActiveShift(): Promise<{
  success: boolean;
  shift?: Record<string, unknown> | null;
  error?: string;
}> {
  try {
    const shift = await apiClient.getActiveShift();
    return { success: true, shift };
  } catch (error: unknown) {
    console.error('Error fetching active shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy ca làm việc'
    };
  }
}


/**
 * Get products for POS (alias)
 */
export async function getProducts(params?: { pageSize?: number }): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  const result = await getPOSProducts();
  return { success: result.success, data: result.products, error: result.error };
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<{
  success: boolean;
  product?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const response = await apiClient.getProducts();
    const products = ((response as any).data || response || []) as Array<Record<string, unknown>>;
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      return { success: true, product };
    }
    return { success: false, error: 'Không tìm thấy sản phẩm với mã vạch này' };
  } catch (error: unknown) {
    console.error('Error fetching product by barcode:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tìm sản phẩm'
    };
  }
}

/**
 * Get customers for POS (alias)
 */
export async function getCustomers(params?: { pageSize?: number }): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  const result = await getPOSCustomers();
  return { success: result.success, data: result.customers, error: result.error };
}

/**
 * Get units
 */
export async function getUnits(): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getUnits();
    const units = (response as any).data || response || [];
    return { success: true, data: units };
  } catch (error: unknown) {
    console.error('Error fetching units:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách đơn vị'
    };
  }
}

/**
 * Get store settings
 */
export async function getStoreSettings(): Promise<{
  success: boolean;
  settings?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const settings = await apiClient.getSettings();
    return { success: true, settings };
  } catch (error: unknown) {
    console.error('Error fetching store settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy cài đặt cửa hàng'
    };
  }
}

/**
 * Get active shift (alias)
 */
export async function getActiveShift(): Promise<{
  success: boolean;
  shift?: Record<string, unknown> | null;
  error?: string;
}> {
  return getPOSActiveShift();
}

/**
 * Start a new shift
 */
export async function startShift(data: { startingCash: number }): Promise<{
  success: boolean;
  shift?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const shift = await apiClient.startShift(data);
    return { success: true, shift: shift as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error starting shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể mở ca làm việc'
    };
  }
}

/**
 * Close a shift
 */
export async function closeShift(shiftId: string, data: { endingCash: number }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await apiClient.closeShift(shiftId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error closing shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể đóng ca làm việc'
    };
  }
}

/**
 * ProductUnit type for POS
 */
export interface ProductUnitInfo {
  id: string;
  name: string;
  isBase: boolean;
  conversionFactor: number;
}

/**
 * Get available units for a product
 */
export async function getProductUnits(productId: string): Promise<{
  success: boolean;
  baseUnit?: ProductUnitInfo;
  availableUnits?: ProductUnitInfo[];
  error?: string;
}> {
  try {
    const response = await apiClient.getAvailableProductUnits(productId) as unknown as {
      success?: boolean;
      baseUnit?: ProductUnitInfo;
      availableUnits?: ProductUnitInfo[];
    };
    return {
      success: true,
      baseUnit: response.baseUnit,
      availableUnits: response.availableUnits
    };
  } catch (error: unknown) {
    console.error('Error fetching product units:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể lấy danh sách đơn vị sản phẩm'
    };
  }
}
