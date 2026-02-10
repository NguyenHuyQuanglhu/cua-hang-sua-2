"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProductsExcel = parseProductsExcel;
exports.importProducts = importProducts;
exports.exportProducts = exportProducts;
exports.generateImportTemplate = generateImportTemplate;
const XLSX = __importStar(require("xlsx"));
const db_1 = require("../db");
// Parse Excel file buffer and return products data
function parseProductsExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
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
async function importProducts(products, storeId, tenantId) {
    const result = {
        success: true,
        totalRows: products.length,
        imported: 0,
        failed: 0,
        errors: [],
    };
    // Get categories and units for lookup
    const categoriesResult = await (0, db_1.executeQuery)(`SELECT CategoryID, CategoryName FROM Categories WHERE TenantID = @tenantId`, { tenantId });
    const unitsResult = await (0, db_1.executeQuery)(`SELECT UnitID, UnitName FROM Units WHERE TenantID = @tenantId`, { tenantId });
    const categoryMap = new Map();
    const unitMap = new Map();
    (categoriesResult.recordset || []).forEach((c) => {
        categoryMap.set(c.CategoryName.toLowerCase(), c.CategoryID);
    });
    (unitsResult.recordset || []).forEach((u) => {
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
            let categoryId = null;
            let unitId = null;
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
                const existingResult = await (0, db_1.executeQuery)(`SELECT ProductID FROM Products WHERE Barcode = @barcode AND TenantID = @tenantId`, { barcode: product.barcode, tenantId });
                if (existingResult.recordset && existingResult.recordset.length > 0) {
                    // Update existing product
                    await (0, db_1.executeQuery)(`UPDATE Products SET
              ProductName = @name,
              CategoryID = @categoryId,
              UnitID = @unitId,
              CostPrice = @costPrice,
              SellingPrice = @sellingPrice,
              MinStockLevel = @minStock,
              Description = @description,
              UpdatedAt = GETDATE()
            WHERE Barcode = @barcode AND TenantID = @tenantId`, {
                        name: product.name,
                        categoryId,
                        unitId,
                        costPrice: product.costPrice,
                        sellingPrice: product.sellingPrice,
                        minStock: product.minStock || 0,
                        description: product.description || null,
                        barcode: product.barcode,
                        tenantId,
                    });
                    result.imported++;
                    continue;
                }
            }
            // Insert new product
            await (0, db_1.executeQuery)(`INSERT INTO Products (
          TenantID, StoreID, Barcode, ProductName, CategoryID, UnitID,
          CostPrice, SellingPrice, MinStockLevel, Description, IsActive, CreatedAt
        ) VALUES (
          @tenantId, @storeId, @barcode, @name, @categoryId, @unitId,
          @costPrice, @sellingPrice, @minStock, @description, 1, GETDATE()
        )`, {
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
            });
            result.imported++;
        }
        catch (error) {
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
async function exportProducts(options) {
    const { storeId, tenantId, includeInventory = true } = options;
    let query = `
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
        query += `,
      ISNULL(pi.Quantity, 0) AS [Tồn kho]
    `;
    }
    query += `
    FROM Products p
    LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
    LEFT JOIN Units u ON p.UnitID = u.UnitID
  `;
    if (includeInventory) {
        query += `
    LEFT JOIN ProductInventory pi ON p.ProductID = pi.ProductID AND pi.StoreID = @storeId
    `;
    }
    query += `
    WHERE p.TenantID = @tenantId AND p.IsActive = 1
    ORDER BY p.ProductName
  `;
    const result = await (0, db_1.executeQuery)(query, { storeId, tenantId });
    const products = result.recordset || [];
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
function generateImportTemplate() {
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
//# sourceMappingURL=bulk-import-service.js.map