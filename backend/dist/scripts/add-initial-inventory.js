"use strict";
/**
 * Script để thêm tồn kho ban đầu cho tất cả sản phẩm
 * Chạy: npx tsx src/scripts/add-initial-inventory.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const connection_1 = require("../db/connection");
const uuid_1 = require("uuid");
// Số lượng tồn kho mặc định cho mỗi sản phẩm
const DEFAULT_QUANTITY = 100;
async function main() {
    const pool = await (0, connection_1.getConnection)();
    try {
        // 1. Lấy tất cả sản phẩm (Products = snake_case, Units = PascalCase)
        const productsResult = await pool.request().query(`
      SELECT p.id, p.name, p.unit_id, p.store_id, u.Name as UnitName
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.Id
      WHERE p.status = 'active'
    `);
        console.log(`Tìm thấy ${productsResult.recordset.length} sản phẩm active`);
        if (productsResult.recordset.length === 0) {
            console.log('Không có sản phẩm nào để thêm tồn kho');
            return;
        }
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        for (const product of productsResult.recordset) {
            if (!product.unit_id) {
                console.log(`  [SKIP] "${product.name}" - Không có unit_id`);
                skippedCount++;
                continue;
            }
            // Kiểm tra xem đã có tồn kho chưa (ProductInventory = PascalCase)
            const existingInventory = await pool.request()
                .input('productId', product.id)
                .input('storeId', product.store_id)
                .input('unitId', product.unit_id)
                .query(`
          SELECT Id, Quantity FROM ProductInventory
          WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
        `);
            if (existingInventory.recordset.length > 0) {
                const currentQty = existingInventory.recordset[0].Quantity;
                if (currentQty > 0) {
                    console.log(`  [EXISTS] "${product.name}" - Đã có ${currentQty} ${product.UnitName || ''}`);
                    continue;
                }
                // Cập nhật nếu Quantity = 0
                await pool.request()
                    .input('id', existingInventory.recordset[0].Id)
                    .input('quantity', DEFAULT_QUANTITY)
                    .query(`
            UPDATE ProductInventory
            SET Quantity = @quantity, UpdatedAt = GETDATE()
            WHERE Id = @id
          `);
                console.log(`  [UPDATED] "${product.name}" - Cập nhật lên ${DEFAULT_QUANTITY} ${product.UnitName || ''}`);
                updatedCount++;
            }
            else {
                // Thêm mới (ProductInventory = PascalCase)
                const newId = (0, uuid_1.v4)();
                await pool.request()
                    .input('id', newId)
                    .input('productId', product.id)
                    .input('storeId', product.store_id)
                    .input('unitId', product.unit_id)
                    .input('quantity', DEFAULT_QUANTITY)
                    .query(`
            INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
          `);
                console.log(`  [ADDED] "${product.name}" - Thêm ${DEFAULT_QUANTITY} ${product.UnitName || ''}`);
                addedCount++;
            }
        }
        console.log(`\n========================================`);
        console.log(`Kết quả:`);
        console.log(`  - Thêm mới: ${addedCount} sản phẩm`);
        console.log(`  - Cập nhật: ${updatedCount} sản phẩm`);
        console.log(`  - Bỏ qua: ${skippedCount} sản phẩm (không có unit_id)`);
        console.log(`  - Mỗi sản phẩm có ${DEFAULT_QUANTITY} đơn vị tồn kho`);
        console.log(`========================================`);
    }
    catch (error) {
        console.error('Lỗi:', error);
    }
    // Exit process since we're done
    process.exit(0);
}
main();
//# sourceMappingURL=add-initial-inventory.js.map