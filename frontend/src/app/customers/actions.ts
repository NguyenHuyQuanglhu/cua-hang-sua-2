'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all customers for the current store
 */
export async function getCustomers(
  _params?:
    | boolean
    | {
        page?: number;
        pageSize?: number;
        search?: string;
        customerType?: string;
      }
): Promise<{
  success: boolean;
  customers?: CustomerWithDebt[];
  error?: string;
}> {
  try {
    const response = await apiClient.getCustomers();
    const customers = (response as any).data || response || [];
    return { success: true, customers: customers as unknown as CustomerWithDebt[] };
  } catch (error: unknown) {
    console.error('Error fetching customers:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy danh sách khách hàng',
    };
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(
  customerId: string,
  _options?: { includeDebt?: boolean; includeLoyalty?: boolean }
): Promise<{
  success: boolean;
  customer?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
    return { success: true, customer };
  } catch (error: unknown) {
    console.error('Error fetching customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin khách hàng' 
    };
  }
}

/**
 * Create or update a customer
 */
export async function upsertCustomer(customer: Record<string, unknown>): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const id = customer.id as string | undefined;
    if (id) {
      await apiClient.updateCustomer(id, customer);
      return { success: true, customerId: id };
    } else {
      const result = await apiClient.createCustomer(customer) as { id: string };
      return { success: true, customerId: result.id };
    }
  } catch (error: unknown) {
    console.error('Error upserting customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật khách hàng' 
    };
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteCustomer(customerId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting customer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa khách hàng' 
    };
  }
}


/**
 * Update customer status
 */
export async function updateCustomerStatus(
  customerId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateCustomer(customerId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating customer status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái khách hàng',
    };
  }
}

/**
 * Generate customer template for import
 */
export async function generateCustomerTemplate(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    // Escape commas and quotes in CSV
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    // Create a professional CSV template with instructions
    const lines = [
      '=== HƯỚNG DẪN SỬ DỤNG FILE MẪU KHÁCH HÀNG ===',
      '',
      '1. Điền thông tin khách hàng vào các dòng bên dưới phần "DỮ LIỆU"',
      '2. Không xóa hoặc sửa dòng tiêu đề (header)',
      '3. Các trường bắt buộc: Tên khách hàng, Số điện thoại',
      '4. Loại khách hàng: personal (cá nhân) hoặc business (doanh nghiệp)',
      '5. Giới tính: male (nam), female (nữ), other (khác)',
      '6. Ngày sinh: định dạng YYYY-MM-DD (ví dụ: 1990-01-15)',
      '7. Hạn mức tín dụng: nhập số tiền (VNĐ), để trống nếu không có',
      '8. Sau khi điền xong, lưu file và import vào hệ thống',
      '',
      '=== DỮ LIỆU ===',
      'Tên khách hàng,Email,Số điện thoại,Địa chỉ,Loại khách hàng,Nhóm khách hàng,Giới tính,Ngày sinh,Zalo,Tên ngân hàng,Số tài khoản,Chi nhánh ngân hàng,Hạn mức tín dụng,Ghi chú',
      '',
      '--- VÍ DỤ (Có thể xóa các dòng ví dụ này) ---',
      [
        'Nguyễn Văn A',
        'nguyenvana@example.com',
        '0901234567',
        '123 Đường ABC, Quận 1, TP.HCM',
        'personal',
        'VIP',
        'male',
        '1990-01-15',
        '0901234567',
        'Vietcombank',
        '1234567890',
        'Chi nhánh TP.HCM',
        '50000000',
        'Khách hàng thân thiết'
      ].map(escapeCSV).join(','),
      [
        'Trần Thị B',
        'tranthib@example.com',
        '0912345678',
        '456 Đường XYZ, Quận 3, TP.HCM',
        'personal',
        'Thường',
        'female',
        '1985-05-20',
        '0912345678',
        'Techcombank',
        '9876543210',
        'Chi nhánh Quận 3',
        '30000000',
        'Khách hàng mới'
      ].map(escapeCSV).join(','),
      [
        'Công ty TNHH ABC',
        'contact@abc.com',
        '0283456789',
        '789 Đường DEF, Quận 5, TP.HCM',
        'business',
        'Doanh nghiệp',
        '',
        '',
        '',
        'ACB',
        '1122334455',
        'Chi nhánh Quận 5',
        '100000000',
        'Khách hàng doanh nghiệp'
      ].map(escapeCSV).join(','),
      '',
      '--- ĐIỀN THÔNG TIN CỦA BẠN TỪ ĐÂY ---',
      Array(14).fill('').join(','),
      Array(14).fill('').join(','),
      Array(14).fill('').join(','),
    ];
    
    const csvContent = lines.join('\n');
    
    // Add BOM for UTF-8 to fix Vietnamese characters in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Convert to base64
    const base64 = btoa(unescape(encodeURIComponent(csvWithBOM)));
    
    return {
      success: true,
      data: base64,
    };
  } catch (error: unknown) {
    console.error('Error generating customer template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo file mẫu',
    };
  }
}

/**
 * Get customer debt information
 */
export async function getCustomerDebt(
  customerId: string,
  includeHistory?: boolean
): Promise<{
  success: boolean;
  debt?: number;
  debtInfo?: CustomerDebtInfo;
  history?: CustomerDebtHistory[];
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
    const customerData = customer as {
      debt?: number;
      currentDebt?: number;
      totalSales?: number;
      totalPayments?: number;
      creditLimit?: number;
    };

    const currentDebt = customerData.currentDebt || customerData.debt || 0;
    const creditLimit = customerData.creditLimit || 0;

    // Fetch debt history if requested
    let history: CustomerDebtHistory[] = [];
    if (includeHistory) {
      try {
        const historyResponse = await apiClient.getCustomerDebtHistory(customerId);
        if (historyResponse.success && historyResponse.history) {
          history = historyResponse.history;
        }
      } catch (historyError) {
        console.warn('Could not fetch debt history:', historyError);
      }
    }

    const debtInfo: CustomerDebtInfo = {
      totalDebt: customerData.debt || customerData.currentDebt || 0,
      currentDebt: currentDebt,
      totalSales: customerData.totalSales || 0,
      totalPayments: customerData.totalPayments || 0,
      isOverLimit: creditLimit > 0 && currentDebt > creditLimit,
      availableCredit: creditLimit > 0 ? Math.max(0, creditLimit - currentDebt) : 0,
      history: history,
    };

    return {
      success: true,
      debt: debtInfo.totalDebt,
      debtInfo,
      history,
    };
  } catch (error: unknown) {
    console.error('Error fetching customer debt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy công nợ khách hàng'
    };
  }
}


/**
 * Import customers from file
 */
export async function importCustomers(
  data: string | Array<Record<string, unknown>>
): Promise<{ success: boolean; imported?: number; createdCount?: number; error?: string }> {
  try {
    // If data is a string (base64), parse it first
    let customers: Array<Record<string, unknown>>;
    if (typeof data === 'string') {
      // In real implementation, this would decode base64 and parse Excel/CSV
      // For now, return mock success
      return { success: true, imported: 0, createdCount: 0 };
    } else {
      customers = data;
    }

    let imported = 0;
    for (const customer of customers) {
      await apiClient.createCustomer(customer);
      imported++;
    }
    return { success: true, imported, createdCount: imported };
  } catch (error: unknown) {
    console.error('Error importing customers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import khách hàng',
    };
  }
}


// Types
export interface CustomerDebtHistory {
  id: string;
  customerId: string;
  amount: number;
  type: 'sale' | 'payment';
  date: string;
  description: string;
  runningBalance: number;
}

export interface CustomerWithDebt {
  id: string;
  storeId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: 'personal' | 'business';
  customerGroup?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  zalo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  currentDebt: number;
  loyaltyPoints: number;
  lifetimePoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  totalSales: number;
  totalPayments: number;
  calculatedDebt: number;
}

export interface CustomerDebtInfo {
  totalDebt: number;
  currentDebt?: number;
  totalSales: number;
  totalPayments: number;
  isOverLimit?: boolean;
  availableCredit?: number;
  history: CustomerDebtHistory[];
}

/**
 * Get customer debt with history
 */
export async function getCustomerDebtWithHistory(
  customerId: string,
  includeHistory: boolean = true
): Promise<{
  success: boolean;
  debtInfo?: CustomerDebtInfo;
  history?: CustomerDebtHistory[];
  error?: string;
}> {
  try {
    const customer = await apiClient.getCustomer(customerId);
    const customerData = customer as {
      debt?: number;
      currentDebt?: number;
      totalSales?: number;
      totalPayments?: number;
    };

    // Fetch debt history if requested
    let history: CustomerDebtHistory[] = [];
    if (includeHistory) {
      try {
        const historyResponse = await apiClient.getCustomerDebtHistory(customerId);
        if (historyResponse.success && historyResponse.history) {
          history = historyResponse.history;
        }
      } catch (historyError) {
        console.warn('Could not fetch debt history:', historyError);
      }
    }

    const debtInfo: CustomerDebtInfo = {
      totalDebt: customerData.debt || customerData.currentDebt || 0,
      totalSales: customerData.totalSales || 0,
      totalPayments: customerData.totalPayments || 0,
      history: history,
    };

    return {
      success: true,
      debtInfo,
      history,
    };
  } catch (error: unknown) {
    console.error('Error fetching customer debt with history:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi lấy công nợ khách hàng',
    };
  }
}

/**
 * Sync all customer accounts - recalculate total_spent, total_paid, total_debt from Sales data
 */
export interface SyncCustomerAccountsResult {
  totalCustomers: number;
  updatedCustomers: number;
  details: Array<{
    customerId: string;
    customerName: string;
    oldValues: { totalSpent: number; totalPaid: number; totalDebt: number };
    newValues: { totalSpent: number; totalPaid: number; totalDebt: number };
  }>;
}

export async function syncCustomerAccounts(): Promise<{
  success: boolean;
  message?: string;
  result?: SyncCustomerAccountsResult;
  error?: string;
}> {
  try {
    const response = await apiClient.request<{
      success: boolean;
      message: string;
      totalCustomers: number;
      updatedCustomers: number;
      details: SyncCustomerAccountsResult['details'];
    }>('/sync-data/customers', { method: 'POST' });
    
    return {
      success: true,
      message: response.message,
      result: {
        totalCustomers: response.totalCustomers,
        updatedCustomers: response.updatedCustomers,
        details: response.details,
      },
    };
  } catch (error: unknown) {
    console.error('Error syncing customer accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể đồng bộ tài khoản khách hàng',
    };
  }
}
