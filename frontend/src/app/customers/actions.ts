'use client';

import { apiClient } from '@/lib/api-client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StoreCustomerSegment {
  segmentKey: string;
  segmentLabel: string;
  baseCustomerType: 'personal' | 'business';
  defaultDiscountRate: number;
  isActive: boolean;
  isSystem: boolean;
}

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

export async function getStoreCustomerSegments(): Promise<{
  success: boolean;
  data?: StoreCustomerSegment[];
  error?: string;
}> {
  try {
    const response = await apiClient.getCustomerSegments();
    return {
      success: true,
      data: Array.isArray(response.data) ? response.data : [],
    };
  } catch (error: unknown) {
    console.error('Error fetching customer segments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể lấy loại khách hàng của cửa hàng',
    };
  }
}

export async function createStoreCustomerSegment(input: {
  segmentLabel: string;
  segmentKey?: string;
  baseCustomerType?: 'personal' | 'business';
  defaultDiscountRate?: number;
}): Promise<{
  success: boolean;
  data?: StoreCustomerSegment;
  error?: string;
}> {
  try {
    const response = await apiClient.createCustomerSegment(input);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    console.error('Error creating customer segment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo loại khách hàng',
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

export interface CustomerDiscountItem {
  id: string;
  amount: number;
  description?: string | null;
  status: 'pending' | 'paid';
  paid_at?: string | null;
  paid_amount?: number | null;
  discount_rate?: number | null;
  discount_percent_of_invoice?: number | null;
  source_sale_id?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_total_amount?: number | null;
  invoice_final_amount?: number | null;
  payout_id?: string | null;
  payment_note?: string | null;
  created_at: string;
}

export interface CustomerDiscountPayoutItem {
  id: string;
  total_amount: number;
  transaction_count: number;
  payout_method: string;
  transfer_reference?: string | null;
  transfer_note?: string | null;
  transfer_account_name?: string | null;
  transfer_account_number?: string | null;
  transfer_bank_name?: string | null;
  customer_bank_name?: string | null;
  customer_bank_account_number?: string | null;
  customer_bank_branch?: string | null;
  paid_at: string;
  created_at: string;
  created_by?: string | null;
}

export async function getCustomerDiscounts(customerId: string): Promise<{
  success: boolean;
  items?: CustomerDiscountItem[];
  error?: string;
}> {
  try {
    const response = await apiClient.request<{ success: boolean; data: CustomerDiscountItem[] }>(`/customers/${customerId}/discounts`);
    return { success: true, items: response.data || [] };
  } catch (error: unknown) {
    console.error('Error fetching customer discounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể lấy chi tiết chiết khấu',
    };
  }
}

export async function getCustomerDiscountPayouts(customerId: string): Promise<{
  success: boolean;
  items?: CustomerDiscountPayoutItem[];
  error?: string;
}> {
  try {
    const response = await apiClient.request<{ success: boolean; data: CustomerDiscountPayoutItem[] }>(`/customers/${customerId}/discounts/payouts`);
    return { success: true, items: response.data || [] };
  } catch (error: unknown) {
    console.error('Error fetching customer discount payouts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể lấy lịch sử thanh toán chiết khấu',
    };
  }
}

export async function createCustomerDiscount(customerId: string, amount: number, description?: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(`/customers/${customerId}/discounts`, {
      method: 'POST',
      body: { amount, description },
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error creating customer discount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể thêm chiết khấu',
    };
  }
}

export async function updateCustomerDiscount(
  customerId: string,
  discountId: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(`/customers/${customerId}/discounts/${discountId}`, {
      method: 'PUT',
      body: { amount, description },
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating customer discount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật chiết khấu',
    };
  }
}

export async function deleteCustomerDiscount(customerId: string, discountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request(`/customers/${customerId}/discounts/${discountId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting customer discount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa chiết khấu',
    };
  }
}

export async function payCustomerDiscounts(
  customerId: string,
  paymentInput?:
    | string
    | {
        paymentNote?: string;
        payoutMethod?: string;
        transferReference?: string;
        transferAccountName?: string;
        transferAccountNumber?: string;
        transferBankName?: string;
      }
): Promise<{ success: boolean; paidAmount?: number; payoutId?: string; error?: string }> {
  try {
    const normalizedCustomerId = String(customerId || '').trim();
    if (!UUID_REGEX.test(normalizedCustomerId)) {
      return {
        success: false,
        error: 'ID khách hàng không hợp lệ (cần UUID).',
      };
    }

    const body =
      typeof paymentInput === 'string'
        ? { paymentNote: paymentInput }
        : {
            paymentNote: paymentInput?.paymentNote,
            payoutMethod: paymentInput?.payoutMethod,
            transferReference: paymentInput?.transferReference,
            transferAccountName: paymentInput?.transferAccountName,
            transferAccountNumber: paymentInput?.transferAccountNumber,
            transferBankName: paymentInput?.transferBankName,
          };

    const response = await apiClient.request<{ success: boolean; paidAmount: number; payoutId?: string }>(`/customers/${normalizedCustomerId}/discounts/pay`, {
      method: 'POST',
      body,
    });
    return {
      success: true,
      paidAmount: Number(response.paidAmount || 0),
      payoutId: response.payoutId,
    };
  } catch (error: unknown) {
    console.error('Error paying customer discounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể thanh toán chiết khấu',
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
          history = historyResponse.history as unknown as CustomerDebtHistory[];
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
  customerType: string;
  customerSegment?: string;
  customerSegmentLabel?: string;
  discountRate?: number;
  totalDiscountPending?: number;
  totalDiscountPaid?: number;
  totalDiscountAll?: number;
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
          history = historyResponse.history as unknown as CustomerDebtHistory[];
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
