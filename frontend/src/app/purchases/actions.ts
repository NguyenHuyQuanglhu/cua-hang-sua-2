'use client';

import { apiClient } from '@/lib/api-client';
import { PurchaseOrderItem } from '@/lib/types';

/**
 * Fetch all purchase orders for the current store
 */
export async function getPurchases(): Promise<{
  success: boolean;
  purchases?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getPurchases();
    // Extract data array from paginated response - backend returns { data: [...], pagination: {...} }
    const purchases = (response as { data?: unknown[] }).data || (Array.isArray(response) ? response : []);
    return { success: true, purchases: purchases as Array<Record<string, unknown>> };
  } catch (error: unknown) {
    console.error('Error fetching purchases:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách nhập hàng' 
    };
  }
}

/**
 * Get a single purchase order by ID
 */
export async function getPurchase(purchaseId: string): Promise<{
  success: boolean;
  purchase?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const purchase = await apiClient.getPurchase(purchaseId);
    return { success: true, purchase };
  } catch (error: unknown) {
    console.error('Error fetching purchase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin phiếu nhập' 
    };
  }
}

/**
 * Create a new purchase order
 */
export async function createPurchase(purchase: Record<string, unknown>): Promise<{ 
  success: boolean; 
  purchase?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createPurchase(purchase);
    return { success: true, purchase: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating purchase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo phiếu nhập' 
    };
  }
}

/**
 * Create a new purchase order with items
 */
export async function createPurchaseOrder(
  orderData: {
    supplierId?: string;
    contractorId?: string;
    importDate: string;
    notes?: string;
    totalAmount: number;
  },
  items: PurchaseOrderItem[]
): Promise<{ success: boolean; purchase?: Record<string, unknown>; error?: string }> {
  try {
    const payload = {
      ...orderData,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
      })),
    };
    const result = await apiClient.createPurchase(payload);
    return { success: true, purchase: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating purchase order:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo đơn nhập hàng' 
    };
  }
}

/**
 * Update a purchase order
 */
export async function updatePurchase(purchaseId: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updatePurchase(purchaseId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating purchase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật phiếu nhập' 
    };
  }
}

/**
 * Update a purchase order with items
 */
export async function updatePurchaseOrder(
  purchaseId: string,
  orderData: {
    supplierId?: string;
    contractorId?: string;
    importDate: string;
    notes?: string;
    totalAmount: number;
  },
  items: PurchaseOrderItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...orderData,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
      })),
    };
    await apiClient.updatePurchase(purchaseId, payload);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating purchase order:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật đơn nhập hàng' 
    };
  }
}

/**
 * Delete a purchase order
 */
export async function deletePurchase(purchaseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deletePurchase(purchaseId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting purchase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa phiếu nhập' 
    };
  }
}


/**
 * Delete a purchase order (alias for deletePurchase)
 */
export async function deletePurchaseOrder(purchaseId: string): Promise<{ success: boolean; error?: string }> {
  return deletePurchase(purchaseId);
}

/**
 * Generate purchase orders Excel file
 */
export async function generatePurchaseOrdersExcel(
  purchases: Array<{
    id: string;
    orderNumber: string;
    importDate: string;
    supplierId?: string;
    supplierName?: string;
    contractorName?: string;
    itemCount?: number;
    totalAmount: number;
    notes?: string;
  }>,
  suppliers: Array<{ id: string; name: string }>
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    // Dynamic import xlsx library
    const XLSX = await import('xlsx');
    
    const suppliersMap = new Map(suppliers.map(s => [s.id, s.name]));
    
    // Prepare data for Excel
    const excelData = purchases.map((order, index) => ({
      'STT': index + 1,
      'Mã đơn': order.orderNumber,
      'Ngày nhập': new Date(order.importDate).toLocaleDateString('vi-VN'),
      'Nhà cung cấp': order.supplierName || suppliersMap.get(order.supplierId || '') || 'N/A',
      'Nhà thầu': order.contractorName || 'N/A',
      'Số SP': order.itemCount || 0,
      'Tổng tiền': order.totalAmount,
      'Ghi chú': order.notes || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // STT
      { wch: 15 },  // Mã đơn
      { wch: 12 },  // Ngày nhập
      { wch: 25 },  // Nhà cung cấp
      { wch: 25 },  // Nhà thầu
      { wch: 8 },   // Số SP
      { wch: 15 },  // Tổng tiền
      { wch: 30 },  // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Đơn nhập hàng');

    // Generate base64 string directly (browser-compatible)
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return { success: true, data: base64 };
  } catch (error: unknown) {
    console.error('Error generating Excel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xuất file Excel',
    };
  }
}
