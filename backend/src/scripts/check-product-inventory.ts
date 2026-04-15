/**
 * Script to check product inventory details
 */

import sql from 'mssql';

const config: sql.config = {
  user: process.env.DB_USER || 'userquanlybanhangonline',
  password: process.env.DB_PASSWORD || '123456789',
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkInventory() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);

    // Find "Sữa bò" product or any product with negative stock
    console.log('\n=== Finding products with issues ===');
    const product = await pool.request()
      .query(`
        SELECT TOP 10
          p.id,
          p.name,
          p.store_id,
          p.unit_id,
          p.stock_quantity,
          u.name as unit_name,
          u.base_unit_id,
          u.conversion_factor,
          (
            SELECT SUM(
              CASE 
                WHEN u2.base_unit_id IS NULL THEN pi.Quantity
                ELSE pi.Quantity * ISNULL(u2.conversion_factor, 1)
              END
            )
            FROM ProductInventory pi
            LEFT JOIN Units u2 ON pi.UnitId = u2.id
            WHERE pi.ProductId = p.id
          ) as calculated_stock
        FROM Products p
        LEFT JOIN Units u ON p.unit_id = u.id
        WHERE p.status = 'active'
        ORDER BY p.updated_at DESC
      `);

    if (product.recordset.length === 0) {
      console.log('No products found!');
      await pool.close();
      return;
    }

    console.log(`Found ${product.recordset.length} products:`);
    product.recordset.forEach((p: any) => {
      console.log(`  - ${p.name}: stock_quantity=${p.stock_quantity}, calculated=${p.calculated_stock}`);
    });

    const prod = product.recordset[0];
    console.log('\nChecking first product:', prod.name);

    // Check ProductInventory for this product
    console.log('\n=== ProductInventory records ===');
    const inventory = await pool.request()
      .input('productId', sql.NVarChar, prod.id)
      .query(`
        SELECT 
          pi.Id,
          pi.ProductId,
          pi.StoreId,
          pi.UnitId,
          pi.Quantity,
          u.name as unit_name,
          u.base_unit_id,
          u.conversion_factor,
          CASE 
            WHEN u.base_unit_id IS NULL THEN pi.Quantity
            ELSE pi.Quantity * ISNULL(u.conversion_factor, 1)
          END as quantity_in_base_unit
        FROM ProductInventory pi
        LEFT JOIN Units u ON pi.UnitId = u.id
        WHERE pi.ProductId = @productId
      `);

    console.log(`Found ${inventory.recordset.length} inventory records:`);
    let totalInBaseUnit = 0;
    inventory.recordset.forEach((inv: any) => {
      console.log(`  - ${inv.Quantity} ${inv.unit_name} (conversion: ${inv.conversion_factor || 1}) = ${inv.quantity_in_base_unit} base units`);
      totalInBaseUnit += inv.quantity_in_base_unit || 0;
    });
    console.log(`\nTotal in base unit: ${totalInBaseUnit}`);

    // Check all units for this store
    console.log('\n=== All units in store ===');
    const units = await pool.request()
      .input('storeId', sql.NVarChar, prod.store_id)
      .query(`
        SELECT 
          id,
          name,
          base_unit_id,
          conversion_factor,
          CASE WHEN base_unit_id IS NULL THEN 'BASE' ELSE 'DERIVED' END as unit_type
        FROM Units
        WHERE store_id = @storeId
        ORDER BY base_unit_id NULLS FIRST, name
      `);

    console.log('Units:');
    units.recordset.forEach((u: any) => {
      console.log(`  - ${u.name} (${u.unit_type}) ${u.conversion_factor ? `x${u.conversion_factor}` : ''}`);
    });

    // Check recent sales for this product
    console.log('\n=== Recent sales ===');
    const sales = await pool.request()
      .input('productId', sql.NVarChar, prod.id)
      .query(`
        SELECT TOP 5
          s.InvoiceNumber,
          s.TransactionDate,
          si.Quantity,
          si.Price,
          u.name as unit_name
        FROM SalesItems si
        JOIN Sales s ON si.SalesTransactionId = s.Id
        LEFT JOIN Units u ON si.UnitId = u.id
        WHERE si.ProductId = @productId
        ORDER BY s.TransactionDate DESC
      `);

    console.log(`Recent ${sales.recordset.length} sales:`);
    sales.recordset.forEach((sale: any) => {
      console.log(`  - ${sale.InvoiceNumber}: ${sale.Quantity} ${sale.unit_name || 'units'} @ ${sale.Price}`);
    });

    await pool.close();
    console.log('\n✓ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInventory();
