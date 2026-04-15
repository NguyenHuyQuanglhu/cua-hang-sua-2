import * as XLSX from 'xlsx';
import { query, insert } from '../db';

export interface ProductImportRow {
  barcode?: string;
  name: string;
  categoryName?: string;
  unitName?: string;
  costPrice: number;
  sellingPrice: number;
  minStock?: number;
  description?: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ExportOptions {
  storeId: string;
  tenantId: string;
  includeInventory?: boolean;
}

// Parse Excel file buffer and return products data
export function parseProductsExcel(buffer: Buffer): ProductImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  return data.map((row) => ({
    barcode: String(row['Barcode'] || row['barcode'] || row['Ma_vach'] || '').trim() || undefined,
    name: String(row['Name'] || row['name'] || row['Ten_san_pham'] || row['Tên sản phẩm'] || '').trim(),
    categoryName: String(row['Category'] || row['category'] || row['Danh_muc'] || row['Danh mục'] || '').trim() || undefined,
    unitName: String(row['Unit'] || row['unit'] || row['Don_vi'] || row['Đơn vị'] || '').trim() || undefined,
    costPrice: Number(row['CostPrice'] || row['cost_price'] || row['Gia_nhap'] || row['Giá nhập'] || 0),
    sellingPrice: Number(row['SellingPrice'] || row['selling_price'] || row['Gia_ban'] || row['Giá bán'] || 0),
    minStock: Number(row['MinStock'] || row['min_stock'] || row['Ton_kho_toi_thieu'] || 0) || undefined,
    description: String(row['Description'] || row['description'] || row['Mo_ta'] || row['Mô tả'] || '').trim() || undefined,
  }));
}

// Import products from parsed data
export async function importProducts(
  products: ProductImportRow[],
  storeId: string,
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: products.length,
    imported: 0,
    failed: 0,
    errors: [],
  };

  // Get categories and units for lookup
  const categoriesResult = await query(
    `SELECT CategoryID, CategoryName FROM Categories WHERE TenantID = @tenantId`,
    { tenantId }
  );
  const unitsResult = await query(
    `SELECT UnitID, UnitName FROM Units WHERE TenantID = @tenantId`,
    { tenantId }
  );

  const categoryMap = new Map<string, number>();
  const unitMap = new Map<string, number>();

  (categoriesResult || []).forEach((c: any) => {
    categoryMap.set(c.CategoryName.toLowerCase(), c.CategoryID);
  });
  (unitsResult || []).forEach((u: any) => {
    unitMap.set(u.UnitName.toLowerCase(), u.UnitID);
  });

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const rowNum = i + 2; // Excel rows start at 1, plus header row

    try {
      // Validate required fields
      if (!product.name) {
        throw new Error('Product name is required');
      }
      if (product.sellingPrice <= 0) {
        throw new Error('Selling price must be greater than 0');
      }

      // Lookup category and unit IDs
      let categoryId: number | null = null;
      let unitId: number | null = null;

      if (product.categoryName) {
        categoryId = categoryMap.get(product.categoryName.toLowerCase()) || null;
        if (!categoryId) {
          throw new Error(`Category "${product.categoryName}" not found`);
        }
      }

      if (product.unitName) {
        unitId = unitMap.get(product.unitName.toLowerCase()) || null;
        if (!unitId) {
          throw new Error(`Unit "${product.unitName}" not found`);
        }
      }

      // Check if product with barcode already exists
      if (product.barcode) {
        const existingResult = await query(
          `SELECT ProductID FROM Products WHERE Barcode = @barcode AND TenantID = @tenantId`,
          { barcode: product.barcode, tenantId }
        );

        if (existingResult && existingResult.length > 0) {
          // Update existing product
          await query(
            `UPDATE Products SET
              ProductName = @name,
              CategoryID = @categoryId,
              UnitID = @unitId,
              CostPrice = @costPrice,
              SellingPrice = @sellingPrice,
              MinStockLevel = @minStock,
              Description = @description,
              UpdatedAt = GETDATE()
            WHERE Barcode = @barcode AND TenantID = @tenantId`,
            {
              name: product.name,
              categoryId,
              unitId,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              minStock: product.minStock || 0,
              description: product.description || null,
              barcode: product.barcode,
              tenantId,
            }
          );
          result.imported++;
          continue;
        }
      }

      // Insert new product
      await query(
        `INSERT INTO Products (
          TenantID, StoreID, Barcode, ProductName, CategoryID, UnitID,
          CostPrice, SellingPrice, MinStockLevel, Description, IsActive, CreatedAt
        ) VALUES (
          @tenantId, @storeId, @barcode, @name, @categoryId, @unitId,
          @costPrice, @sellingPrice, @minStock, @description, 1, GETDATE()
        )`,
        {
          tenantId,
          storeId,
          barcode: product.barcode || null,
          name: product.name,
          categoryId,
          unitId,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          minStock: product.minStock || 0,
          description: product.description || null,
        }
      );
      result.imported++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.success = result.failed === 0;
  return result;
}

// Export products to Excel buffer
export async function exportProducts(options: ExportOptions): Promise<Buffer> {
  const { storeId, tenantId, includeInventory = true } = options;

  let sqlQuery = `
    SELECT
      p.Barcode,
      p.ProductName AS [Tên sản phẩm],
      c.CategoryName AS [Danh mục],
      u.UnitName AS [Đơn vị],
      p.CostPrice AS [Giá nhập],
      p.SellingPrice AS [Giá bán],
      p.MinStockLevel AS [Tồn kho tối thiểu],
      p.Description AS [Mô tả]
  `;

  if (includeInventory) {
    sqlQuery += `,
      ISNULL(pi.Quantity, 0) AS [Tồn kho]
    `;
  }

  sqlQuery += `
    FROM Products p
    LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
    LEFT JOIN Units u ON p.UnitID = u.UnitID
  `;

  if (includeInventory) {
    sqlQuery += `
    LEFT JOIN ProductInventory pi ON p.ProductID = pi.ProductID AND pi.StoreID = @storeId
    `;
  }

  sqlQuery += `
    WHERE p.TenantID = @tenantId AND p.IsActive = 1
    ORDER BY p.ProductName
  `;

  const result = await query(sqlQuery, { storeId, tenantId });
  const products = result || [];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(products);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Barcode
    { wch: 30 }, // Tên sản phẩm
    { wch: 15 }, // Danh mục
    { wch: 10 }, // Đơn vị
    { wch: 12 }, // Giá nhập
    { wch: 12 }, // Giá bán
    { wch: 15 }, // Tồn kho tối thiểu
    { wch: 30 }, // Mô tả
    { wch: 10 }, // Tồn kho
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

// Generate template Excel file
export function generateImportTemplate(): Buffer {
  const templateData = [
    {
      Barcode: '8934567890123',
      'Tên sản phẩm': 'Sữa tươi Vinamilk 1L',
      'Danh mục': 'Sữa tươi',
      'Đơn vị': 'Hộp',
      'Giá nhập': 25000,
      'Giá bán': 32000,
      'Tồn kho tối thiểu': 10,
      'Mô tả': 'Sữa tươi tiệt trùng',
    },
    {
      Barcode: '8934567890124',
      'Tên sản phẩm': 'Sữa đặc Ông Thọ 380g',
      'Danh mục': 'Sữa đặc',
      'Đơn vị': 'Lon',
      'Giá nhập': 18000,
      'Giá bán': 22000,
      'Tồn kho tối thiểu': 20,
      'Mô tả': 'Sữa đặc có đường',
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}


// ===== CUSTOMERS IMPORT/EXPORT =====

export interface CustomerImportRow {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  birthday?: string;
  notes?: string;
}

// Parse Excel file buffer and return customers data
export function parseCustomersExcel(buffer: Buffer): CustomerImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  return data.map((row) => ({
    name: String(row['Name'] || row['name'] || row['Ten'] || row['Tên'] || row['Họ tên'] || '').trim(),
    phone: String(row['Phone'] || row['phone'] || row['SDT'] || row['Số điện thoại'] || '').trim() || undefined,
    email: String(row['Email'] || row['email'] || '').trim() || undefined,
    address: String(row['Address'] || row['address'] || row['Dia_chi'] || row['Địa chỉ'] || '').trim() || undefined,
    gender: String(row['Gender'] || row['gender'] || row['Gioi_tinh'] || row['Giới tính'] || '').trim().toLowerCase() || undefined,
    birthday: String(row['Birthday'] || row['birthday'] || row['Ngay_sinh'] || row['Ngày sinh'] || '').trim() || undefined,
    notes: String(row['Notes'] || row['notes'] || row['Ghi_chu'] || row['Ghi chú'] || '').trim() || undefined,
  }));
}

// Import customers from parsed data
export async function importCustomers(
  customers: CustomerImportRow[],
  storeId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: customers.length,
    imported: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const rowNum = i + 2; // Excel rows start at 1, plus header row

    try {
      // Validate required fields
      if (!customer.name) {
        throw new Error('Customer name is required');
      }

      // Validate gender if provided
      let gender: string | null = null;
      if (customer.gender) {
        const genderLower = customer.gender.toLowerCase();
        if (['male', 'nam', 'male'].includes(genderLower)) {
          gender = 'male';
        } else if (['female', 'nữ', 'nu', 'female'].includes(genderLower)) {
          gender = 'female';
        } else if (['other', 'khác', 'khac'].includes(genderLower)) {
          gender = 'other';
        }
      }

      // Parse birthday if provided
      let birthday: Date | null = null;
      if (customer.birthday) {
        const parsed = new Date(customer.birthday);
        if (!isNaN(parsed.getTime())) {
          birthday = parsed;
        }
      }

      // Check if customer with same phone already exists
      if (customer.phone) {
        const existing = await query(
          `SELECT id FROM Customers WHERE phone = @phone AND store_id = @storeId`,
          { phone: customer.phone, storeId }
        );

        if (existing.length > 0) {
          // Update existing customer
          await query(
            `UPDATE Customers 
             SET full_name = @name,
                 email = @email,
                 address = @address,
                 gender = @gender,
                 birthday = @birthday,
                 notes = @notes,
                 updated_at = GETDATE()
             WHERE phone = @phone AND store_id = @storeId`,
            {
              name: customer.name,
              phone: customer.phone,
              email: customer.email || null,
              address: customer.address || null,
              gender: gender,
              birthday: birthday,
              notes: customer.notes || null,
              storeId,
            }
          );
        } else {
          // Insert new customer
          await query(
            `INSERT INTO Customers (
              id, store_id, full_name, phone, email, address, gender, birthday, notes,
              status, customer_type, total_debt, total_paid, created_at, updated_at
             ) VALUES (
              NEWID(), @storeId, @name, @phone, @email, @address, @gender, @birthday, @notes,
              'active', 'personal', 0, 0, GETDATE(), GETDATE()
             )`,
            {
              storeId,
              name: customer.name,
              phone: customer.phone || null,
              email: customer.email || null,
              address: customer.address || null,
              gender: gender,
              birthday: birthday,
              notes: customer.notes || null,
            }
          );
        }
      } else {
        // No phone number, just insert
        await query(
          `INSERT INTO Customers (
            id, store_id, full_name, phone, email, address, gender, birthday, notes,
            status, customer_type, total_debt, total_paid, created_at, updated_at
           ) VALUES (
            NEWID(), @storeId, @name, @phone, @email, @address, @gender, @birthday, @notes,
            'active', 'personal', 0, 0, GETDATE(), GETDATE()
           )`,
          {
            storeId,
            name: customer.name,
            phone: customer.phone || null,
            email: customer.email || null,
            address: customer.address || null,
            gender: gender,
            birthday: birthday,
            notes: customer.notes || null,
          }
        );
      }

      result.imported++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.success = result.failed === 0;
  return result;
}

// Generate customer import template
export function generateCustomerImportTemplate(): Buffer {
  const templateData = [
    {
      'Tên': 'Nguyễn Văn A',
      'Số điện thoại': '0901234567',
      'Email': 'nguyenvana@example.com',
      'Địa chỉ': '123 Đường ABC, Quận 1, TP.HCM',
      'Giới tính': 'Nam',
      'Ngày sinh': '1990-01-15',
      'Ghi chú': 'Khách hàng VIP',
    },
    {
      'Tên': 'Trần Thị B',
      'Số điện thoại': '0907654321',
      'Email': 'tranthib@example.com',
      'Địa chỉ': '456 Đường XYZ, Quận 2, TP.HCM',
      'Giới tính': 'Nữ',
      'Ngày sinh': '1995-05-20',
      'Ghi chú': '',
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  worksheet['!cols'] = [
    { wch: 20 }, // Tên
    { wch: 15 }, // Số điện thoại
    { wch: 25 }, // Email
    { wch: 40 }, // Địa chỉ
    { wch: 10 }, // Giới tính
    { wch: 15 }, // Ngày sinh
    { wch: 30 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Export customers to Excel
export async function exportCustomers(storeId: string): Promise<Buffer> {
  const result = await query(
    `SELECT 
      full_name as 'Tên',
      phone as 'Số điện thoại',
      email as 'Email',
      address as 'Địa chỉ',
      CASE 
        WHEN gender = 'male' THEN N'Nam'
        WHEN gender = 'female' THEN N'Nữ'
        WHEN gender = 'other' THEN N'Khác'
        ELSE ''
      END as 'Giới tính',
      CONVERT(VARCHAR, birthday, 23) as 'Ngày sinh',
      total_debt as 'Công nợ',
      notes as 'Ghi chú'
     FROM Customers
     WHERE store_id = @storeId
     ORDER BY created_at DESC`,
    { storeId }
  );

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(result);

  worksheet['!cols'] = [
    { wch: 20 }, // Tên
    { wch: 15 }, // Số điện thoại
    { wch: 25 }, // Email
    { wch: 40 }, // Địa chỉ
    { wch: 10 }, // Giới tính
    { wch: 15 }, // Ngày sinh
    { wch: 15 }, // Công nợ
    { wch: 30 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
