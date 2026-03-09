import sql from 'mssql';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'MilkStoreDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function addSamplePurchaseOrders() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Get store ID
    const storeResult = await pool.request().query(`
      SELECT TOP 1 id, name FROM Stores WHERE name LIKE N'%cửa hàng sữa%'
    `);

    if (storeResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    console.log(`✓ Cửa hàng: ${storeResult.recordset[0].name}\n`);

    // Get suppliers
    const thSupplierResult = await pool.request().query(`
      SELECT id, name FROM Suppliers WHERE name LIKE N'%TH True Milk%'
    `);
    
    const vinamilkSupplierResult = await pool.request().query(`
      SELECT id, name FROM Suppliers WHERE name LIKE N'%Vinamilk%'
    `);

    if (thSupplierResult.recordset.length === 0 || vinamilkSupplierResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy nhà cung cấp TH hoặc Vinamilk');
      return;
    }

    const thSupplierId = thSupplierResult.recordset[0].id;
    const vinamilkSupplierId = vinamilkSupplierResult.recordset[0].id;

    console.log(`✓ Nhà cung cấp TH: ${thSupplierResult.recordset[0].name}`);
    console.log(`✓ Nhà cung cấp Vinamilk: ${vinamilkSupplierResult.recordset[0].name}\n`);

    // Get products
    const productsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT id, name, unit_id, cost_price
        FROM Products
        WHERE store_id = @storeId
          AND name IN (
            N'TH True Milk Nguyên chất 180ml',
            N'TH True Milk Nguyên chất 1L',
            N'TH True Yogurt Dâu 100g',
            N'Vinamilk Ít đường 1L',
            N'Vinamilk Optimum Gold 900g',
            N'Vinamilk Probi Dâu 100ml'
          )
      `);

    if (productsResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy sản phẩm');
      return;
    }

    console.log(`✓ Tìm thấy ${productsResult.recordset.length} sản phẩm\n`);

    // Create purchase orders
    console.log('📦 Tạo đơn nhập hàng mẫu...\n');

    // Purchase order 1: TH products
    const thProducts = productsResult.recordset.filter((p: any) => 
      p.name.includes('TH True')
    );

    if (thProducts.length > 0) {
      const poId1 = uuidv4();
      const orderNumber1 = `PO-${Date.now()}-1`;
      
      await pool.request()
        .input('id', sql.NVarChar, poId1)
        .input('storeId', sql.NVarChar, storeId)
        .input('supplierId', sql.NVarChar, thSupplierId)
        .input('orderNumber', sql.NVarChar, orderNumber1)
        .input('importDate', sql.DateTime, new Date())
        .input('totalAmount', sql.Decimal(18, 2), 0)
        .input('remainingDebt', sql.Decimal(18, 2), 0)
        .input('notes', sql.NVarChar, 'Đơn nhập hàng mẫu - TH True Milk')
        .query(`
          INSERT INTO PurchaseOrders (id, store_id, supplier_id, order_number, import_date, total_amount, remaining_debt, notes, created_at, updated_at)
          VALUES (@id, @storeId, @supplierId, @orderNumber, @importDate, @totalAmount, @remainingDebt, @notes, GETDATE(), GETDATE())
        `);

      console.log(`✓ Tạo đơn nhập: ${orderNumber1}`);

      let totalAmount1 = 0;
      for (const product of thProducts) {
        const itemId = uuidv4();
        const quantity = 50; // 50 units
        const cost = product.cost_price || 10000;
        const subtotal = quantity * cost;
        totalAmount1 += subtotal;

        await pool.request()
          .input('id', sql.NVarChar, itemId)
          .input('purchaseOrderId', sql.NVarChar, poId1)
          .input('productId', sql.NVarChar, product.id)
          .input('quantity', sql.Decimal(18, 4), quantity)
          .input('cost', sql.Decimal(18, 2), cost)
          .input('unitId', sql.NVarChar, product.unit_id)
          .query(`
            INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, unit_id)
            VALUES (@id, @purchaseOrderId, @productId, @quantity, @cost, @unitId)
          `);

        // Update ProductInventory
        await pool.request()
          .input('productId', sql.NVarChar, product.id)
          .input('storeId', sql.NVarChar, storeId)
          .input('unitId', sql.NVarChar, product.unit_id)
          .input('quantity', sql.Decimal(18, 4), quantity)
          .query(`
            IF EXISTS (SELECT 1 FROM ProductInventory WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId)
            BEGIN
              UPDATE ProductInventory 
              SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE()
              WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
            END
            ELSE
            BEGIN
              INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
              VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
            END
          `);

        console.log(`  - ${product.name}: ${quantity} x ${cost.toLocaleString('vi-VN')}đ`);
      }

      // Update total amount
      await pool.request()
        .input('id', sql.NVarChar, poId1)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount1)
        .query(`UPDATE PurchaseOrders SET total_amount = @totalAmount WHERE id = @id`);

      console.log(`  Tổng: ${totalAmount1.toLocaleString('vi-VN')}đ\n`);
    }

    // Purchase order 2: Vinamilk products
    const vinamilkProducts = productsResult.recordset.filter((p: any) => 
      p.name.includes('Vinamilk')
    );

    if (vinamilkProducts.length > 0) {
      const poId2 = uuidv4();
      const orderNumber2 = `PO-${Date.now()}-2`;
      
      await pool.request()
        .input('id', sql.NVarChar, poId2)
        .input('storeId', sql.NVarChar, storeId)
        .input('supplierId', sql.NVarChar, vinamilkSupplierId)
        .input('orderNumber', sql.NVarChar, orderNumber2)
        .input('importDate', sql.DateTime, new Date())
        .input('totalAmount', sql.Decimal(18, 2), 0)
        .input('remainingDebt', sql.Decimal(18, 2), 0)
        .input('notes', sql.NVarChar, 'Đơn nhập hàng mẫu - Vinamilk')
        .query(`
          INSERT INTO PurchaseOrders (id, store_id, supplier_id, order_number, import_date, total_amount, remaining_debt, notes, created_at, updated_at)
          VALUES (@id, @storeId, @supplierId, @orderNumber, @importDate, @totalAmount, @remainingDebt, @notes, GETDATE(), GETDATE())
        `);

      console.log(`✓ Tạo đơn nhập: ${orderNumber2}`);

      let totalAmount2 = 0;
      for (const product of vinamilkProducts) {
        const itemId = uuidv4();
        const quantity = 50; // 50 units
        const cost = product.cost_price || 10000;
        const subtotal = quantity * cost;
        totalAmount2 += subtotal;

        await pool.request()
          .input('id', sql.NVarChar, itemId)
          .input('purchaseOrderId', sql.NVarChar, poId2)
          .input('productId', sql.NVarChar, product.id)
          .input('quantity', sql.Decimal(18, 4), quantity)
          .input('cost', sql.Decimal(18, 2), cost)
          .input('unitId', sql.NVarChar, product.unit_id)
          .query(`
            INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, unit_id)
            VALUES (@id, @purchaseOrderId, @productId, @quantity, @cost, @unitId)
          `);

        // Update ProductInventory
        await pool.request()
          .input('productId', sql.NVarChar, product.id)
          .input('storeId', sql.NVarChar, storeId)
          .input('unitId', sql.NVarChar, product.unit_id)
          .input('quantity', sql.Decimal(18, 4), quantity)
          .query(`
            IF EXISTS (SELECT 1 FROM ProductInventory WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId)
            BEGIN
              UPDATE ProductInventory 
              SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE()
              WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
            END
            ELSE
            BEGIN
              INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
              VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
            END
          `);

        console.log(`  - ${product.name}: ${quantity} x ${cost.toLocaleString('vi-VN')}đ`);
      }

      // Update total amount
      await pool.request()
        .input('id', sql.NVarChar, poId2)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount2)
        .query(`UPDATE PurchaseOrders SET total_amount = @totalAmount WHERE id = @id`);

      console.log(`  Tổng: ${totalAmount2.toLocaleString('vi-VN')}đ\n`);
    }

    console.log('═'.repeat(80));
    console.log('✓ HOÀN THÀNH!');
    console.log('  - Đã tạo đơn nhập hàng mẫu');
    console.log('  - Đã cập nhật tồn kho');
    console.log('  - Các sản phẩm đã có lịch sử với nhà cung cấp');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

addSamplePurchaseOrders();
