'use client';

import { apiClient } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryWithProductCount extends Category {
  productCount?: number;
}

/**
 * Fetch all categories for the current store
 */
export async function getCategories(): Promise<{ 
  success: boolean; 
  categories?: CategoryWithProductCount[]; 
  error?: string 
}> {
  try {
    const categories = await apiClient.getCategories();
    return { success: true, categories };
  } catch (error: unknown) {
    console.error('Error fetching categories:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách danh mục' 
    };
  }
}

/**
 * Create or update a category
 */
export async function upsertCategory(category: Partial<Category>): Promise<{ success: boolean; error?: string }> {
  try {
    if (category.id) {
      await apiClient.updateCategory(category.id, {
        name: category.name,
        description: category.description,
      });
    } else {
      await apiClient.createCategory({
        name: category.name!,
        description: category.description,
      });
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting category:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật danh mục' 
    };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteCategory(categoryId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa danh mục' 
    };
  }
}

/**
 * Generate category template for import
 */
export async function generateCategoryTemplate(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    // Create a professional CSV template with instructions
    const lines = [
      '=== HƯỚNG DẪN SỬ DỤNG FILE MẪU DANH MỤC ===',
      '',
      '1. Điền thông tin danh mục vào các dòng bên dưới phần "DỮ LIỆU"',
      '2. Không xóa hoặc sửa dòng tiêu đề (header)',
      '3. Tên danh mục là bắt buộc, mô tả là tùy chọn',
      '4. Sau khi điền xong, lưu file và import vào hệ thống',
      '',
      '=== DỮ LIỆU ===',
      'Tên danh mục,Mô tả',
      '',
      '--- VÍ DỤ (Có thể xóa các dòng ví dụ này) ---',
      'Sữa tươi,Các loại sữa tươi thanh trùng và tiệt trùng',
      'Sữa chua,Sữa chua các loại vị',
      'Sữa bột,Sữa bột cho trẻ em và người lớn',
      'Phô mai,Phô mai lát, que, hộp các loại',
      'Bơ sữa,Bơ thực vật và bơ động vật',
      '',
      '--- ĐIỀN THÔNG TIN CỦA BẠN TỪ ĐÂY ---',
      ',',
      ',',
      ',',
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
    console.error('Error generating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo file mẫu',
    };
  }
}
