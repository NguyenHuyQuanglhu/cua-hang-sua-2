'use client';

import { apiClient } from '@/lib/api-client';

export interface SupplierWithDebt {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  totalPurchases: number;
  totalPayments: number;
  debt: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch all suppliers for the current store
 * @param withDebt - If true, includes debt calculation (totalPurchases, totalPayments, debt)
 */
export async function getSuppliers(withDebt: boolean = false): Promise<{
  success: boolean;
  suppliers?: SupplierWithDebt[];
  error?: string;
}> {
  try {
    const response = await apiClient.getSuppliers();

    // Extract data array from paginated response - backend returns { success, data: [...], total, page, pageSize, totalPages }
    const rawSuppliers = ((response as { data?: unknown[] }).data || (Array.isArray(response) ? response : [])) as unknown[];

    // Map backend fields to frontend expected fields
    const suppliers: SupplierWithDebt[] = rawSuppliers.map((row) => {
      const s = (row || {}) as Record<string, unknown>;
      return ({
      id: s.id as string,
      name: s.name as string,
      contactPerson: s.contactPerson as string | undefined,
      email: s.email as string | undefined,
      phone: s.phone as string | undefined,
      address: s.address as string | undefined,
      taxCode: s.taxCode as string | undefined,
      notes: s.notes as string | undefined,
      // Map backend totalPurchase/totalPaid/totalDebt to frontend totalPurchases/totalPayments/debt
      totalPurchases: (s.totalPurchase as number) || 0,
      totalPayments: (s.totalPaid as number) || 0,
      debt: (s.totalDebt as number) || 0,
      createdAt: s.createdAt as string | undefined,
      updatedAt: s.updatedAt as string | undefined,
      });
    });
    
    return { success: true, suppliers };
  } catch (error: unknown) {
    console.error('Error fetching suppliers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách nhà cung cấp' 
    };
  }
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(supplierId: string): Promise<{
  success: boolean;
  supplier?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const supplier = await apiClient.getSupplier(supplierId);
    return { success: true, supplier };
  } catch (error: unknown) {
    console.error('Error fetching supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin nhà cung cấp' 
    };
  }
}

/**
 * Create or update a supplier
 */
export async function upsertSupplier(supplier: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const id = supplier.id as string | undefined;
    if (id) {
      await apiClient.updateSupplier(id, supplier);
    } else {
      await apiClient.createSupplier(supplier);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật nhà cung cấp' 
    };
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteSupplier(supplierId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa nhà cung cấp' 
    };
  }
}


/**
 * Add supplier payment
 */
export async function addSupplierPayment(payment: Record<string, unknown>): Promise<{ 
  success: boolean; 
  payment?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createSupplierPayment(payment);
    return { success: true, payment: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error adding supplier payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể thêm thanh toán cho nhà cung cấp' 
    };
  }
}

/**
 * Get supplier payments
 */
export async function getSupplierPayments(): Promise<{
  success: boolean;
  payments?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getSupplierPayments() as unknown;
    const payments = Array.isArray(response)
      ? (response as Array<Record<string, unknown>>)
      : [];
    return { success: true, payments };
  } catch (error: unknown) {
    console.error('Error fetching supplier payments:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thanh toán' 
    };
  }
}
