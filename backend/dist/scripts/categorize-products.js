"use strict";
/**
 * Script để tạo categories phù hợp và gắn vào sản phẩm
 * Chạy: npx ts-node src/scripts/categorize-products.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../db/connection");
const uuid_1 = require("uuid");
// Định nghĩa các loại sản phẩm dựa trên từ khóa
const CATEGORY_RULES = [
    {
        name: 'Thắt lưng',
        keywords: ['driver', 'belt', 'dx driver', 'cso driver', 'desire driver'],
        description: 'Thắt lưng biến hình Kamen Rider'
    },
    {
        name: 'Vũ khí',
        keywords: ['weapon', 'sword', 'gun', 'blade', 'gashat', 'progrise key', 'eyecon', 'gaia memory', 'rider key'],
        description: 'Vũ khí và phụ kiện chiến đấu'
    },
    {
        name: 'Figure',
        keywords: ['figure', 'figuarts', 'shf', 'rkf', 'sofubi', 'vinyl', 'statue'],
        description: 'Mô hình Figure'
    },
    {
        name: 'Phụ kiện',
        keywords: ['holder', 'case', 'buckle', 'strap', 'accessory'],
        description: 'Phụ kiện và đồ trang trí'
    },
    {
        name: 'Đồ chơi',
        keywords: ['toy', 'playset', 'dx', 'premium'],
        description: 'Đồ chơi các loại'
    },
    {
        name: 'Sưu tầm',
        keywords: ['csm', 'complete selection', 'memorial', 'anniversary', 'limited'],
        description: 'Sản phẩm sưu tầm cao cấp'
    },
    {
        name: 'Khác',
        keywords: [],
        description: 'Các sản phẩm khác'
    }
];
async function main() {
    const pool = await (0, connection_1.getPool)();
    try {
        // 1. Lấy storeId đầu tiên để tạo categories
        const storeResult = await pool.request().query('SELECT TOP 1 id FROM Stores');
        if (storeResult.recordset.length === 0) {
            console.error('Không tìm thấy store nào!');
            return;
        }
        const storeId = storeResult.recordset[0].id;
        console.log('Store ID:', storeId);
        // 2. Lấy danh sách categories hiện có
        const existingCategoriesResult = await pool.request()
            .input('storeId', storeId)
            .query('SELECT id, name FROM Categories WHERE store_id = @storeId');
        const existingCategories = new Map();
        for (const cat of existingCategoriesResult.recordset) {
            existingCategories.set(cat.name.toLowerCase(), cat.id);
        }
        console.log('Existing categories:', Array.from(existingCategories.keys()));
        // 3. Tạo categories mới nếu chưa có
        const categoryIdMap = new Map();
        for (const rule of CATEGORY_RULES) {
            const existingId = existingCategories.get(rule.name.toLowerCase());
            if (existingId) {
                categoryIdMap.set(rule.name, existingId);
                console.log(`Category "${rule.name}" đã tồn tại với ID: ${existingId}`);
            }
            else {
                const newId = (0, uuid_1.v4)();
                await pool.request()
                    .input('id', newId)
                    .input('storeId', storeId)
                    .input('name', rule.name)
                    .input('description', rule.description)
                    .query(`
            INSERT INTO Categories (id, store_id, name, description, created_at, updated_at)
            VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())
          `);
                categoryIdMap.set(rule.name, newId);
                console.log(`Đã tạo category "${rule.name}" với ID: ${newId}`);
            }
        }
        // 4. Lấy danh sách sản phẩm
        const productsResult = await pool.request()
            .input('storeId', storeId)
            .query('SELECT id, name, category_id FROM Products WHERE store_id = @storeId');
        console.log(`\nTìm thấy ${productsResult.recordset.length} sản phẩm`);
        // 5. Phân loại và cập nhật categoryId cho từng sản phẩm
        let updatedCount = 0;
        for (const product of productsResult.recordset) {
            const productNameLower = product.name.toLowerCase();
            let matchedCategory = 'Khác'; // Default category
            // Tìm category phù hợp dựa trên keywords
            for (const rule of CATEGORY_RULES) {
                if (rule.keywords.length === 0)
                    continue; // Skip "Khác"
                for (const keyword of rule.keywords) {
                    if (productNameLower.includes(keyword.toLowerCase())) {
                        matchedCategory = rule.name;
                        break;
                    }
                }
                if (matchedCategory !== 'Khác')
                    break;
            }
            const newCategoryId = categoryIdMap.get(matchedCategory);
            // Chỉ cập nhật nếu categoryId khác
            if (newCategoryId && product.category_id !== newCategoryId) {
                await pool.request()
                    .input('id', product.id)
                    .input('categoryId', newCategoryId)
                    .query('UPDATE Products SET category_id = @categoryId, updated_at = GETDATE() WHERE id = @id');
                console.log(`  "${product.name}" -> ${matchedCategory}`);
                updatedCount++;
            }
        }
        console.log(`\nĐã cập nhật ${updatedCount} sản phẩm`);
        console.log('Hoàn thành!');
    }
    catch (error) {
        console.error('Lỗi:', error);
    }
    finally {
        await pool.close();
    }
}
main();
//# sourceMappingURL=categorize-products.js.map