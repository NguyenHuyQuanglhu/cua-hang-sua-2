'use client';

import { apiClient } from '@/lib/api-client';

// Types
export interface CashTransaction {
  id: string;
  type: 'thu' | 'chi';
  amount: number;
  category: string;
  reason?: string;
  description?: string;
  date: string;
  transactionDate?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown; // Allow indexing by string
}

export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory?: Record<string, number>;
  expenseByCategory?: Record<string, number>;
}

/**
 * Fetch all cash transactions for the current store
 */
export async function getCashFlow(): Promise<{
  success: boolean;
  transactions?: CashTransaction[];
  summary?: CashFlowSummary | null;
  error?: string;
}> {
  try {
    const result = await apiClient.getCashFlow({ includeSummary: true, pageSize: 1000 }) as {
      data?: Array<Record<string, unknown>>;
      summary?: Record<string, unknown>;
    };
    // API returns { data: [...], summary: {...} }
    return { 
      success: true, 
      transactions: (result.data || []) as CashTransaction[],
      summary: (result.summary as unknown as CashFlowSummary) || null
    };
  } catch (error: unknown) {
    console.error('Error fetching cash flow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thu chi' 
    };
  }
}

/**
 * Create a new cash transaction
 */
export async function createCashTransaction(transaction: Record<string, unknown>): Promise<{ 
  success: boolean; 
  transaction?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createCashTransaction(transaction);
    return { success: true, transaction: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating cash transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo phiếu thu chi' 
    };
  }
}


/**
 * Get cash transactions (alias for getCashFlow)
 */
export async function getCashTransactions(params?: {
  pageSize?: number;
  includeSummary?: boolean;
  type?: 'thu' | 'chi';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  success: boolean;
  transactions?: CashTransaction[];
  summary?: CashFlowSummary | null;
  error?: string;
}> {
  try {
    const result = await apiClient.getCashFlow({ 
      includeSummary: params?.includeSummary ?? true, 
      pageSize: params?.pageSize ?? 1000,
      type: params?.type,
      category: params?.category,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    }) as {
      data?: Array<Record<string, unknown>>;
      summary?: Record<string, unknown>;
    };
    return { 
      success: true, 
      transactions: (result.data || []) as CashTransaction[],
      summary: (result.summary as unknown as CashFlowSummary) || null
    };
  } catch (error: unknown) {
    console.error('Error fetching cash transactions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thu chi' 
    };
  }
}

/**
 * Upsert cash transaction (create or update)
 */
export async function upsertCashTransaction(transaction: Record<string, unknown>): Promise<{ 
  success: boolean; 
  transaction?: Record<string, unknown>;
  error?: string 
}> {
  // Cash transactions typically don't have update - just create new ones
  return createCashTransaction(transaction);
}

/**
 * Delete a cash transaction
 */
export async function deleteCashTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.request<{ success: boolean }>(`/cash-flow/${transactionId}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting cash transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa phiếu thu chi',
    };
  }
}

/**
 * Generate cash transactions Excel/CSV
 */
export async function generateCashTransactionsExcel(
  transactions?: Array<Record<string, unknown>>
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    if (!transactions || transactions.length === 0) {
      return {
        success: false,
        error: 'Không có dữ liệu để xuất',
      };
    }

    // Create CSV content with BOM for UTF-8
    const headers = [
      'Ngày',
      'Loại',
      'Danh mục',
      'Số tiền',
      'Lý do',
      'Mô tả',
    ];

    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // Add title
    csvContent += 'SỔ QUỸ\n';
    csvContent += `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n`;
    csvContent += '\n';
    
    // Add headers
    csvContent += headers.join(',') + '\n';
    
    // Add data rows
    transactions.forEach((transaction: any) => {
      const date = transaction.transactionDate || transaction.date || transaction.createdAt;
      const formattedDate = date ? new Date(date).toLocaleDateString('vi-VN') : '';
      const type = transaction.type === 'thu' ? 'Thu' : 'Chi';
      const category = transaction.category || '';
      const amount = transaction.amount || 0;
      const reason = transaction.reason || '';
      const description = transaction.description || '';
      
      const row = [
        formattedDate,
        type,
        category,
        amount.toLocaleString('vi-VN'),
        reason,
        description,
      ];
      
      // Escape and quote fields
      csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Add summary
    csvContent += '\n';
    csvContent += 'TỔNG KẾT\n';
    
    const totalIncome = transactions
      .filter((t: any) => t.type === 'thu')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    
    const totalExpense = transactions
      .filter((t: any) => t.type === 'chi')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    
    const balance = totalIncome - totalExpense;
    
    csvContent += `"Tổng thu","","","${totalIncome.toLocaleString('vi-VN')}","",""\n`;
    csvContent += `"Tổng chi","","","${totalExpense.toLocaleString('vi-VN')}","",""\n`;
    csvContent += `"Số dư","","","${balance.toLocaleString('vi-VN')}","",""\n`;

    // Convert to base64
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));

    return {
      success: true,
      data: base64,
    };
  } catch (error) {
    console.error('Error generating cash transactions file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo file sổ quỹ',
    };
  }
}
