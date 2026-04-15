'use client';

import { apiClient } from '@/lib/api-client';
import type { Contractor } from '@/lib/types';

export async function getContractors(): Promise<{
  success: boolean;
  contractors?: Contractor[];
  error?: string;
}> {
  try {
    const response = await apiClient.getContractors();
    const rawContractors = response.data || [];

    const contractors: Contractor[] = rawContractors.map((row) => {
      const contractor = (row || {}) as Record<string, unknown>;

      return {
        id: contractor.id as string,
        name: contractor.name as string,
        contactPerson: contractor.contactPerson as string | undefined,
        email: contractor.email as string | undefined,
        phone: contractor.phone as string | undefined,
        address: contractor.address as string | undefined,
        taxCode: contractor.taxCode as string | undefined,
        identityNumber: contractor.identityNumber as string | undefined,
        description: contractor.description as string | undefined,
        createdAt: (contractor.createdAt as string) || '',
        updatedAt: (contractor.updatedAt as string) || '',
      };
    });

    return { success: true, contractors };
  } catch (error: unknown) {
    console.error('Error fetching contractors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách nhà thầu',
    };
  }
}

export async function upsertContractor(contractor: Record<string, unknown>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const id = contractor.id as string | undefined;

    if (id) {
      await apiClient.updateContractor(id, contractor);
    } else {
      await apiClient.createContractor(contractor);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting contractor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật nhà thầu',
    };
  }
}

export async function deleteContractor(contractorId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await apiClient.deleteContractor(contractorId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting contractor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa nhà thầu',
    };
  }
}
