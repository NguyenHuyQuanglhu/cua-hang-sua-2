'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Fetch all users
 */
export async function getUsers(): Promise<{
  success: boolean;
  users?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const users = await apiClient.getUsers();
    return { success: true, users };
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách người dùng' 
    };
  }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<{
  success: boolean;
  user?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const user = await apiClient.getUser(userId);
    return { success: true, user };
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin người dùng' 
    };
  }
}

/**
 * Create a new user
 */
export async function createUser(user: Record<string, unknown>): Promise<{ 
  success: boolean; 
  user?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const result = await apiClient.createUser(user);
    return { success: true, user: result as Record<string, unknown> };
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo người dùng' 
    };
  }
}

/**
 * Update a user
 */
export async function updateUser(userId: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateUser(userId, data);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật người dùng' 
    };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Calling deleteUser API for userId:', userId);
    await apiClient.deleteUser(userId);
    console.log('deleteUser API call successful');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa người dùng' 
    };
  }
}

/**
 * Update user status (activate/deactivate)
 */
export async function updateUserStatus(userId: string, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateUser(userId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating user status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái người dùng' 
    };
  }
}


/**
 * Upsert user (create or update)
 */
export async function upsertUser(user: Record<string, unknown>): Promise<{ 
  success: boolean; 
  user?: Record<string, unknown>;
  error?: string 
}> {
  try {
    const id = user.id as string | undefined;
    if (id) {
      await apiClient.updateUser(id, user);
      return { success: true, user };
    } else {
      const result = await apiClient.createUser(user);
      return { success: true, user: result as Record<string, unknown> };
    }
  } catch (error: unknown) {
    console.error('Error upserting user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật người dùng' 
    };
  }
}
