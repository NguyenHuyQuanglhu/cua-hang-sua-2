'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all customer payments for the current store
 */
export async function getPayments(): Promise<{
  success: boolean;
  payments?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const response = await apiClient.getPayments() as unknown;
    const payments = Array.isArray(response)
      ? (response as Array<Record<string, unknown>>)
      : [];
    return { success: true, payments };
  } catch (error: unknown) {
    console.error('Error fetching payments:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thanh toán' 
    };
  }
}

/**
 * Create a new customer payment
 */
export async function createPayment(payment: Record<string, unknown>): Promise<{ 
  success: boolean; 
  payment?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createPayment(payment);
    return { success: true, payment: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo phiếu thanh toán' 
    };
  }
}

/**
 * Fetch all supplier payments for the current store
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
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách thanh toán NCC' 
    };
  }
}

/**
 * Create a new supplier payment
 */
export async function createSupplierPayment(payment: Record<string, unknown>): Promise<{ 
  success: boolean; 
  payment?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createSupplierPayment(payment);
    return { success: true, payment: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating supplier payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo phiếu thanh toán NCC' 
    };
  }
}


/**
 * Add payment (alias for createPayment)
 */
export async function addPayment(payment: Record<string, unknown>): Promise<{ 
  success: boolean; 
  payment?: Record<string, unknown>;
  error?: string 
}> {
  return createPayment(payment);
}
