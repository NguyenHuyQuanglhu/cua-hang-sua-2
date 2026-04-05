'use client';

import { apiClient } from '@/lib/api-client';

export interface ThemeSettings {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  accent: string;
  accentForeground: string;
  lowStockThreshold?: number;
  vatRate?: number;
  invoiceFormat?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}

/**
 * Fetch settings for the current store
 */
export async function getSettings(): Promise<{
  success: boolean;
  settings?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const response = await apiClient.getSettings();
    // Backend returns { settings: {...} }, extract the settings object
    const settings = (response as any)?.settings || response;
    return { success: true, settings };
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy cài đặt' 
    };
  }
}

/**
 * Get theme settings - returns null if not available (for SSR compatibility)
 */
export async function getThemeSettings(): Promise<ThemeSettings | null> {
  // Return null for server-side rendering - theme will be applied on client
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const result = await getSettings();
    if (result.success && result.settings) {
      return result.settings as unknown as ThemeSettings;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Update settings for the current store
 */
export async function updateSettings(settings: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateSettings(settings);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật cài đặt' 
    };
  }
}


/**
 * Upsert theme settings
 */
export async function upsertThemeSettings(settings: ThemeSettings): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateSettings(settings as unknown as Record<string, unknown>);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting theme settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật cài đặt giao diện' 
    };
  }
}

/**
 * Recalculate all loyalty tiers based on customer spending
 */
export async function recalculateAllLoyaltyPoints(): Promise<{ 
  success: boolean; 
  message?: string;
  totalCustomers?: number;
  updatedCount?: number;
  error?: string 
}> {
  try {
    const response = await apiClient.request<{
      success: boolean;
      message: string;
      totalCustomers: number;
      updatedCount: number;
    }>('/settings/recalculate-tiers', { method: 'POST' });
    
    return { 
      success: true, 
      message: response.message,
      totalCustomers: response.totalCustomers,
      updatedCount: response.updatedCount,
    };
  } catch (error: unknown) {
    console.error('Error recalculating loyalty tiers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tính lại hạng khách hàng' 
    };
  }
}

/**
 * Delete all transactional data
 */
export async function deleteAllTransactionalData(): Promise<{ success: boolean; error?: string }> {
  // This would typically call a backend endpoint to delete transactional data
  // For now, return success as placeholder
  console.warn('deleteAllTransactionalData: Not implemented');
  return { success: false, error: 'Chức năng này chưa được triển khai' };
}

/**
 * Backup all transactional data
 */
export async function backupAllTransactionalData(): Promise<{ 
  success: boolean; 
  data?: string;
  error?: string 
}> {
  // This would typically call a backend endpoint to backup data
  // For now, return success as placeholder
  console.warn('backupAllTransactionalData: Not implemented');
  return { success: false, error: 'Chức năng này chưa được triển khai' };
}

/**
 * Sync and seed sample data for suppliers, customers, and units
 */
export async function syncSampleData(): Promise<{ 
  success: boolean; 
  results?: {
    units: { added: number; existing: number };
    suppliers: { added: number; existing: number };
    customers: { added: number; existing: number };
    purchases: { added: number };
    sales: { added: number };
  };
  error?: string 
}> {
  try {
    const response = await apiClient.request<{
      success: boolean;
      message: string;
      results: {
        units: { added: number; existing: number };
        suppliers: { added: number; existing: number };
        customers: { added: number; existing: number };
        purchases: { added: number };
        sales: { added: number };
      };
    }>('/sync-data', { method: 'POST' });
    
    return { success: true, results: response.results };
  } catch (error: unknown) {
    console.error('Error syncing data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu' 
    };
  }
}
