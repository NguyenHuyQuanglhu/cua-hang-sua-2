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

async function addSampleDataAllStores() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('═'.repeat(80));
    console.log('🏪 THÊM DỮ LIỆU MẪU CHO TẤT CẢ CỬA HÀNG');
    console.log('═'.repeat(80));
    console.log();

    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Get all stores
    const storesResult = await pool.request().query(`
      SELECT id, name FROM Stores ORDER BY name
    `);

    if (storesResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng nào');
      return;
    }

    console.log(`✓ Tìm thấy ${storesResult.recordset.length} cửa hàng:\n`);
    storesResult.recordset.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.name}`);
    });
    console.log();

    // Get all suppliers
    const suppliersResult = await pool.request().query(`
      SELECT id, name FROM Suppliers ORDER BY name
    `);

    console.log(`✓ Tìm thấy ${suppliersResult.recordset.length} nhà cung cấp\n`);

    // Process each store
    for (const store of storesResult.recordset) {
      console.log('━'.repeat(80));
      console.log(`🏪 ${store.name}`);
      console.log('━'.repeat(80));

      // Get products for this store
      const productsResult = await pool.request()
        .input('storeId', sql.NVarChar, store.id)
        .query(`
          SELECT p.id, p.name, p.unit_id, p.cost_price,
                 ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), 0) as currentStock
          FROM Products p
          WHERE p.store_id = @storeId AND p.status = 'active'
          ORDER BY p.name
        `);

      if (productsResult.recordset.length === 0) {
        console.log('  ⚠ Không có sản phẩm nào\n');
        continue;
      }

      console.log(`  ✓ Có ${productsResult.recordset.length} sản phẩm`);

      // Check if products already have stock
      const productsWithStock = productsResult.recordset.filter((p: any) => p.currentStock > 0);
      const productsWithoutStock = productsResult.recordset.filter((p: any) => p.currentStock === 0);

      console.log(`    - Đã có tồn kho: ${productsWithStock.length}`);
      console.log(`    - Chưa có tồn kho: ${productsWithoutStock.length}`);

      if (productsWithoutStock.length === 0) {
        console.log('  ✓ Tất cả sản phẩm đã có tồn kho\n');
        continue;
      }

      // Group products by brand for supplier matching
      const thProducts = productsWithoutStock.filter((p: any) => p.name.includes('TH True'));
      const vinamilkProducts = productsWithoutStock.filter((p: any) => p.name.includes('Vinamilk'));
      const dalatProducts = productsWithoutStock.filter((p: any) => p.name.includes('Dalat'));
      const anchorProducts = productsWithoutStock.filter((p: any) => p.name.includes('Anchor'));
      const otherProducts = productsWithoutStock.filter((p: any) => 
        !p.name.includes('TH True') && 
        !p.name.includes('Vinamilk') && 
        !p.name.includes('Dalat') &&
        !p.name.includes('Anchor')
      );

      console.log(`\n  📦 Phân loại sản phẩm cần nhập:`);
      if (thProducts.length > 0) console.log(`    - TH True: ${thProducts.length}`);
      if (vinamilkProducts.length > 0) console.log(`    - Vinamilk: ${vinamilkProducts.length}`);
      if (dalatProducts.length > 0) console.log(`    - Dalat: ${dalatProducts.length}`);
      if (anchorProducts.length > 0) console.log(`    - Anchor: ${anchorProducts.length}`);
      if (otherProducts.length > 0) console.log(`    - Khác: ${otherProducts.length}`);

      // Find appropriate suppliers
      const thSupplier = suppliersResult.recordset.find((s: any) => s.name.includes('TH True'));
      const vinamilkSupplier = suppliersResult.recordset.find((s: any) => s.name.includes('Vinamilk'));
      const fonterra = suppliersResult.recordset.find((s: any) => s.name.includes('Fonterra'));
      const defaultSupplier = suppliersResult.recordset[0]; // Fallback

      console.log(`\n  📝 Tạo đơn nhập hàng...`);

      let orderCount = 0;

      // Create purchase order for TH products
      if (thProducts.length > 0 && thSupplier) {
        await createPurchaseOrder(pool, store.id, thSupplier.id, thSupplier.name, thProducts);
        orderCount++;
      }

      // Create purchase order for Vinamilk products
      if (vinamilkProducts.length > 0 && vinamilkSupplier) {
        await createPurchaseOrder(pool, store.id, vinamilkSupplier.id, vinamilkSupplier.name, vinamilkProducts);
        orderCount++;
      }

      // Create purchase order for Anchor/Dalat products
      const anchorDalatProducts = [...anchorProducts, ...dalatProducts];
      if (anchorDalatProducts.length > 0 && fonterra) {
        await createPurchaseOrder(pool, store.id, fonterra.id, fonterra.name, anchorDalatProducts);
        orderCount++;
      }

      // Create purchase order for other products
      if (otherProducts.length > 0 && defaultSupplier) {
        await createPurchaseOrder(pool, store.id, defaultSupplier.id, defaultSupplier.name, otherProducts);
        orderCount++;
      }

      console.log(`  ✓ Đã tạo ${orderCount} đơn nhập hàng\n`);
    }

    console.log('═'.repeat(80));
    console.log('✓ HOÀN THÀNH!');
    console.log('  - Đã thêm dữ liệu mẫu cho tất cả cửa hàng');
    console.log('  - Tất cả sản phẩm đã có tồn kho');
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

async function createPurchaseOrder(
  pool: sql.ConnectionPool,
  storeId: string,
  supplierId: string,
  supplierName: string,
  products: any[]
) {
  const poId = uuidv4();
  const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // Create purchase order
  await pool.request()
    .input('id', sql.NVarChar, poId)
    .input('storeId', sql.NVarChar, storeId)
    .input('supplierId', sql.NVarChar, supplierId)
    .input('orderNumber', sql.NVarChar, orderNumber)
    .input('importDate', sql.DateTime, new Date())
    .input('totalAmount', sql.Decimal(18, 2), 0)
    .input('remainingDebt', sql.Decimal(18, 2), 0)
    .input('notes', sql.NVarChar, `Đơn nhập hàng mẫu - ${supplierName}`)
    .query(`
      INSERT INTO PurchaseOrders (id, store_id, supplier_id, order_number, import_date, total_amount, remaining_debt, notes, created_at, updated_at)
      VALUES (@id, @storeId, @supplierId, @orderNumber, @importDate, @totalAmount, @remainingDebt, @notes, GETDATE(), GETDATE())
    `);

  let totalAmount = 0;

  // Add items
  for (const product of products) {
    const itemId = uuidv4();
    const quantity = 50; // Default quantity
    const cost = product.cost_price || 10000;
    const subtotal = quantity * cost;
    totalAmount += subtotal;

    await pool.request()
      .input('id', sql.NVarChar, itemId)
      .input('purchaseOrderId', sql.NVarChar, poId)
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
  }

  // Update total amount
  await pool.request()
    .input('id', sql.NVarChar, poId)
    .input('totalAmount', sql.Decimal(18, 2), totalAmount)
    .query(`UPDATE PurchaseOrders SET total_amount = @totalAmount WHERE id = @id`);

  console.log(`    ✓ ${supplierName}: ${products.length} sản phẩm - ${totalAmount.toLocaleString('vi-VN')}đ`);
}

addSampleDataAllStores();
