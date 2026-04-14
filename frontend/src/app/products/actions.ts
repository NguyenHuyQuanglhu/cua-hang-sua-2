'use client';

import { apiClient } from '@/lib/api-client';

interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

interface ProductWithStock {
  id: string;
  storeId: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  unitId: string;
  sellingPrice?: number;
  status: 'active' | 'draft' | 'archived';
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
  avgCostByUnit?: Array<{
    unitId: string;
    unitName: string;
    avgCost: number;
    totalQty: number;
  }>;
}

/**
 * Fetch all products for the current store
 */
export async function getProducts(params?: GetProductsParams): Promise<{
  success: boolean;
  data?: ProductWithStock[];
  total?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    const response = await apiClient.getProducts();
    const rawProducts = ((response as any).data || response || []) as Array<{
      id: string;
      storeId: string;
      name: string;
      sku?: string;
      description?: string;
      categoryId: string;
      categoryName?: string;
      price?: number;
      costPrice?: number;
      stockQuantity?: number;
      images?: string;
      status: 'active' | 'draft' | 'archived';
      createdAt: string;
      updatedAt: string;
    }>;
    
    // Debug: log first product to check avgCostByUnit
    if (rawProducts.length > 0) {
      console.log('First product from API:', rawProducts[0]);
      console.log('avgCostByUnit:', (rawProducts[0] as any).avgCostByUnit);
    }
    
    // Map API response to ProductWithStock format
    // Backend already returns products sorted by updated_at DESC, created_at DESC
    const products: ProductWithStock[] = rawProducts.map(p => ({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      barcode: p.sku,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      unitId: (p as any).unitId || '',
      sellingPrice: p.price || 0,
      status: p.status,
      lowStockThreshold: 10,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      currentStock: p.stockQuantity || 0,
      averageCost: p.costPrice || 0,
      avgCostByUnit: (p as any).avgCostByUnit || [],
    }));
    
    // Apply client-side filtering - preserve order from backend
    let filtered = products;
    
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower))
      );
    }
    
    if (params?.categoryId) {
      const categoryIds = params.categoryId.split(',').filter(id => id.trim());
      if (categoryIds.length > 0) {
        filtered = filtered.filter(p => categoryIds.includes(p.categoryId));
      }
    }
    
    if (params?.status) {
      filtered = filtered.filter(p => p.status === params.status);
    }
    
    const total = filtered.length;
    const pageSize = params?.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize);
    const page = params?.page || 1;
    
    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    
    return { 
      success: true, 
      data: paginatedData,
      total,
      totalPages
    };
  } catch (error: unknown) {
    console.error('Error fetching products:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách sản phẩm' 
    };
  }
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<{
  success: boolean;
  product?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const product = await apiClient.getProduct(productId);
    return { success: true, product };
  } catch (error: unknown) {
    console.error('Error fetching product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy thông tin sản phẩm' 
    };
  }
}

/**
 * Create or update a product
 */
export async function upsertProduct(product: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const id = product.id as string | undefined;
    const rawLots = Array.isArray(product.purchaseLots) ? product.purchaseLots : [];
    const purchaseLots = rawLots
      .map((lot) => {
        const record = lot as Record<string, unknown>;
        return {
          id: typeof record.id === 'string' ? record.id : undefined,
          importDate: record.importDate,
          quantity: Number(record.quantity ?? 0),
          cost: Number(record.cost ?? 0),
          unitId: record.unitId,
          supplierId: record.supplierId,
        };
      })
      .filter((lot) => !!lot.importDate && !!lot.unitId && !!lot.supplierId && lot.quantity > 0);
    
    // Map frontend field names to backend field names
    const productData = {
      name: product.name,
      barcode: product.barcode,
      description: product.description,
      categoryId: product.categoryId,
      unitId: product.unitId, // Keep unitId
      price: product.sellingPrice, // Map sellingPrice -> price
      costPrice: product.costPrice,
      status: product.status,
      lowStockThreshold: product.lowStockThreshold,
      images: product.images,
      purchaseLots,
    };
    
    console.log('[upsertProduct] Input:', { id, product });
    console.log('[upsertProduct] Mapped data:', productData);
    
    if (id) {
      console.log('[upsertProduct] Updating product:', id);
      const result = await apiClient.updateProduct(id, productData);
      console.log('[upsertProduct] Update result:', result);
    } else {
      console.log('[upsertProduct] Creating product');
      const result = await apiClient.createProduct(productData);
      console.log('[upsertProduct] Create result:', result);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('[upsertProduct] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể tạo hoặc cập nhật sản phẩm' 
    };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.deleteProduct(productId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể xóa sản phẩm' 
    };
  }
}

/**
 * Update product status
 */
export async function updateProductStatus(
  productId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.updateProduct(productId, { status });
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating product status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái sản phẩm',
    };
  }
}

/**
 * Import products from file
 */
export async function importProducts(
  data: string | Array<Record<string, unknown>>
): Promise<{ success: boolean; imported?: number; createdCount?: number; error?: string }> {
  try {
    // If data is a string (base64), parse it first
    let products: Array<Record<string, unknown>>;
    if (typeof data === 'string') {
      // In real implementation, this would decode base64 and parse Excel/CSV
      // For now, return mock success
      return { success: true, imported: 0, createdCount: 0 };
    } else {
      products = data;
    }

    let imported = 0;
    for (const product of products) {
      await apiClient.createProduct(product);
      imported++;
    }
    return { success: true, imported, createdCount: imported };
  } catch (error: unknown) {
    console.error('Error importing products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể import sản phẩm',
    };
  }
}

/**
 * Generate product template for import
 */
export async function generateProductTemplate(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    // Create CSV template with BOM for UTF-8
    const headers = [
      'Tên sản phẩm',
      'Mã SKU',
      'Giá bán',
      'Giá vốn',
      'Số lượng tồn kho',
      'Đơn vị',
      'Danh mục',
      'Mô tả',
      'Trạng thái'
    ];

    const instructions = [
      '=== HƯỚNG DẪN SỬ DỤNG ===',
      '',
      '1. Điền thông tin sản phẩm vào các dòng bên dưới phần VÍ DỤ',
      '2. Không xóa dòng tiêu đề (dòng đầu tiên)',
      '3. Các trường bắt buộc: Tên sản phẩm, Giá bán',
      '4. Giá bán và Giá vốn: nhập số tiền (VNĐ)',
      '5. Số lượng tồn kho: nhập số nguyên',
      '6. Đơn vị: tên đơn vị (ví dụ: Cái, Hộp, Kg)',
      '7. Danh mục: tên danh mục sản phẩm',
      '8. Trạng thái: active (đang bán) hoặc inactive (ngừng bán)',
      '9. Lưu file dưới dạng CSV (UTF-8) trước khi nhập',
      '',
      '=== VÍ DỤ ===',
    ];

    const examples = [
      ['Sữa tươi Vinamilk 1L', 'MILK001', '25000', '20000', '100', 'Hộp', 'Sữa tươi', 'Sữa tươi không đường 1 lít', 'active'],
      ['Sữa chua uống TH True Milk', 'YOGURT001', '8000', '6000', '200', 'Chai', 'Sữa chua', 'Sữa chua uống vị dâu 180ml', 'active'],
      ['Phô mai Con Bò Cười', 'CHEESE001', '45000', '38000', '50', 'Hộp', 'Phô mai', 'Phô mai lát 200g', 'active'],
      ['Sữa đặc Ông Thọ', 'COND001', '18000', '15000', '150', 'Lon', 'Sữa đặc', 'Sữa đặc có đường 380g', 'active'],
      ['Bơ Anchor', 'BUTTER001', '95000', '80000', '30', 'Hộp', 'Bơ', 'Bơ lạt 227g', 'active'],
    ];

    const emptyRows = [
      '',
      '=== ĐIỀN THÔNG TIN SẢN PHẨM BÊN DƯỚI ===',
      '',
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
    ];

    // Build CSV content
    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // Add instructions
    instructions.forEach(line => {
      csvContent += line + '\n';
    });
    
    // Add headers
    csvContent += headers.join(',') + '\n';
    
    // Add examples
    examples.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Add empty rows
    emptyRows.forEach(row => {
      if (typeof row === 'string') {
        csvContent += row + '\n';
      } else {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      }
    });

    // Convert to base64
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));

    return {
      success: true,
      data: base64,
    };
  } catch (error) {
    console.error('Error generating product template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo template sản phẩm',
    };
  }
}
