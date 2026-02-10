import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

const config: sql.config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Map product names to suppliers
const productSupplierMap: Record<string, string> = {
  'Bơ Président': 'Công ty TNHH Lactalis Việt Nam',
  'Sữa tươi Vinamilk': 'Công ty TNHH Sữa Việt Nam (Vinamilk)',
  'Sữa TH True Milk': 'Công ty Cổ phần Sữa TH (TH True Milk)',
  'Sữa Dutch Lady': 'Công ty TNHH Friesland Campina Việt Nam',
  'Sữa Milo': 'Công ty TNHH Nestlé Việt Nam',
  'Sữa Ensure': 'Công ty TNHH Abbott Việt Nam',
  'Phô mai Con Bò Cười': 'Công ty TNHH Bel Việt Nam',
  'Sữa Enfamil': 'Công ty TNHH Mead Johnson Nutrition Việt Nam',
  'Sữa Anchor': 'Công ty TNHH Fonterra Việt Nam',
  'Sữa Nuti': 'Công ty TNHH Nutifood',
};

async function createPurchaseOrdersFromProducts() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Get store ID
    const storeResult = await pool.request()
      .query(`SELECT TOP 1 id, name FROM Stores ORDER BY created_at DESC`);
    
    if (storeResult.recordset.length === 0) {
      console.error('No store found!');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    const storeName = storeResult.recordset[0].name;
    console.log(`\nStore: ${storeName} (${storeId})`);

    // Get all products
    const productsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT p.id, p.name, p.cost_price, p.unit_id, u.name as unit_name
        FROM Products p
        LEFT JOIN Units u ON p.unit_id = u.id
        WHERE p.store_id = @storeId
        ORDER BY p.name
      `);

    console.log(`\nFound ${productsResult.recordset.length} products`);

    if (productsResult.recordset.length === 0) {
      console.log('No products found. Please add products first.');
      return;
    }

    // Get all suppliers
    const suppliersResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`SELECT id, name FROM Suppliers WHERE store_id = @storeId`);

    const suppliersMap = new Map<string, string>();
    suppliersResult.recordset.forEach((s: any) => {
      suppliersMap.set(s.name, s.id);
    });

    console.log(`\nFound ${suppliersMap.size} suppliers`);

    // Group products by supplier
    const productsBySupplier = new Map<string, any[]>();

    for (const product of productsResult.recordset) {
      let supplierName = null;
      
      // Find matching supplier based on product name
      for (const [keyword, supplier] of Object.entries(productSupplierMap)) {
        if (product.name.includes(keyword)) {
          supplierName = supplier;
          break;
        }
      }

      // If no specific match, assign to Vinamilk as default for milk products
      if (!supplierName && (product.name.includes('Sữa') || product.name.includes('sữa'))) {
        supplierName = 'Công ty TNHH Sữa Việt Nam (Vinamilk)';
      }

      // If still no match, assign to Lactalis for cheese/butter products
      if (!supplierName && (product.name.includes('Bơ') || product.name.includes('Phô mai'))) {
        supplierName = 'Công ty TNHH Lactalis Việt Nam';
      }

      if (supplierName && suppliersMap.has(supplierName)) {
        if (!productsBySupplier.has(supplierName)) {
          productsBySupplier.set(supplierName, []);
        }
        productsBySupplier.get(supplierName)!.push(product);
      }
    }

    console.log(`\nGrouped products into ${productsBySupplier.size} suppliers`);

    // Create purchase orders
    let orderCount = 0;
    const importDate = new Date();
    importDate.setDate(importDate.getDate() - 7); // 7 days ago

    for (const [supplierName, products] of productsBySupplier.entries()) {
      const supplierId = suppliersMap.get(supplierName);
      if (!supplierId) continue;

      console.log(`\n📦 Creating purchase order for: ${supplierName}`);
      console.log(`   Products: ${products.length}`);

      // Calculate total amount
      let totalAmount = 0;
      const items: any[] = [];

      for (const product of products) {
        // Skip products without unit_id
        if (!product.unit_id) {
          console.log(`   ⏭️  Skipped ${product.name} (no unit)`);
          continue;
        }

        const quantity = Math.floor(Math.random() * 50) + 10; // Random quantity 10-60
        const cost = product.cost_price || 10000; // Use cost_price or default
        const lineTotal = quantity * cost;
        totalAmount += lineTotal;

        items.push({
          productId: product.id,
          productName: product.name,
          quantity,
          cost,
          unitId: product.unit_id,
          unitName: product.unit_name,
        });

        console.log(`   - ${product.name}: ${quantity} ${product.unit_name || 'đơn vị'} x ${cost.toLocaleString('vi-VN')}đ = ${lineTotal.toLocaleString('vi-VN')}đ`);
      }

      // Skip if no valid items
      if (items.length === 0) {
        console.log(`   ⏭️  No valid products with units, skipping order`);
        continue;
      }

      // Generate order number
      const orderNumber = `PN${Date.now().toString().slice(-8)}`;

      // Create purchase order
      const purchaseOrderId = uuidv4();
      await pool.request()
        .input('id', sql.NVarChar, purchaseOrderId)
        .input('storeId', sql.NVarChar, storeId)
        .input('orderNumber', sql.NVarChar, orderNumber)
        .input('supplierId', sql.NVarChar, supplierId)
        .input('importDate', sql.DateTime, importDate)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('notes', sql.NVarChar, `Đơn nhập hàng từ ${supplierName}`)
        .query(`
          INSERT INTO PurchaseOrders (id, store_id, order_number, supplier_id, import_date, total_amount, notes, created_at)
          VALUES (@id, @storeId, @orderNumber, @supplierId, @importDate, @totalAmount, @notes, GETDATE())
        `);

      // Create purchase order items and lots
      for (const item of items) {
        const itemId = uuidv4();
        const lotId = uuidv4();

        // Insert purchase order item
        await pool.request()
          .input('id', sql.NVarChar, itemId)
          .input('purchaseOrderId', sql.NVarChar, purchaseOrderId)
          .input('productId', sql.NVarChar, item.productId)
          .input('quantity', sql.Decimal(18, 2), item.quantity)
          .input('cost', sql.Decimal(18, 2), item.cost)
          .input('unitId', sql.NVarChar, item.unitId)
          .query(`
            INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, unit_id, base_quantity, base_cost, base_unit_id)
            VALUES (@id, @purchaseOrderId, @productId, @quantity, @cost, @unitId, @quantity, @cost, @unitId)
          `);

        // Insert purchase lot
        await pool.request()
          .input('id', sql.NVarChar, lotId)
          .input('productId', sql.NVarChar, item.productId)
          .input('storeId', sql.NVarChar, storeId)
          .input('importDate', sql.DateTime, importDate)
          .input('quantity', sql.Decimal(18, 2), item.quantity)
          .input('cost', sql.Decimal(18, 2), item.cost)
          .input('unitId', sql.NVarChar, item.unitId)
          .input('purchaseOrderId', sql.NVarChar, purchaseOrderId)
          .query(`
            INSERT INTO PurchaseLots (id, product_id, store_id, import_date, quantity, remaining_quantity, cost, unit_id, purchase_order_id)
            VALUES (@id, @productId, @storeId, @importDate, @quantity, @quantity, @cost, @unitId, @purchaseOrderId)
          `);
      }

      console.log(`   ✅ Created order ${orderNumber} - Total: ${totalAmount.toLocaleString('vi-VN')}đ`);
      orderCount++;
    }

    console.log(`\n✅ Successfully created ${orderCount} purchase orders!`);

    // Show summary
    const summaryResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          s.name as supplier_name,
          COUNT(po.id) as order_count,
          SUM(po.total_amount) as total_amount
        FROM PurchaseOrders po
        JOIN Suppliers s ON po.supplier_id = s.id
        WHERE po.store_id = @storeId
        GROUP BY s.name
        ORDER BY total_amount DESC
      `);

    console.log('\n📊 Purchase Orders Summary:');
    summaryResult.recordset.forEach((row: any) => {
      console.log(`   ${row.supplier_name}: ${row.order_count} đơn - ${row.total_amount.toLocaleString('vi-VN')}đ`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

createPurchaseOrdersFromProducts();
