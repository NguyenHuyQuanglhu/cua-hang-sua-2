import sql from 'mssql';

const productId = process.argv[2] || '8706E968-39AC-439A-BA37-FDAFA8A83504';
const storeId = process.argv[3] || 'B6E006C7-0115-4C46-9764-6BA61B911964';

const cfg: sql.config = {
  user: process.env.DB_USER || 'userquanlybanhangonline',
  password: process.env.DB_PASSWORD || '123456789',
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'Data_quanlybanhang_online',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function columnExists(pool: sql.ConnectionPool, table: string, column: string): Promise<boolean> {
  const rs = await pool.request()
    .input('t', sql.NVarChar, table)
    .input('c', sql.NVarChar, column)
    .query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.objects o ON o.object_id = c.object_id
        WHERE o.type = 'U' AND o.name = @t AND c.name = @c
      ) THEN 1 ELSE 0 END AS ok
    `);

  return rs.recordset[0]?.ok === 1;
}

async function printColumns(pool: sql.ConnectionPool, table: string): Promise<void> {
  const rs = await pool.request()
    .input('t', sql.NVarChar, table)
    .query(`
      SELECT c.name
      FROM sys.columns c
      JOIN sys.objects o ON o.object_id = c.object_id
      WHERE o.type = 'U' AND o.name = @t
      ORDER BY c.column_id
    `);

  console.log(`TABLE ${table}: ${rs.recordset.map((r: any) => r.name).join(', ')}`);
}

async function findProduct(pool: sql.ConnectionPool): Promise<void> {
  const productsIdCols = ['id', 'Id', 'ID', 'ProductId', 'ProductID', 'product_id'];
  const productsUnitCols = ['default_sales_unit_id', 'defaultSalesUnitId', 'DefaultSalesUnitId', 'DefaultSalesUnitID', 'unit_id', 'unitId', 'UnitId', 'UnitID'];

  for (const idCol of productsIdCols) {
    if (!(await columnExists(pool, 'Products', idCol))) continue;

    const selectedCols: string[] = [idCol];
    const extraCols = ['store_id', 'status', 'stock_quantity', 'name'];
    for (const c of extraCols) {
      if (await columnExists(pool, 'Products', c)) selectedCols.push(c);
    }
    for (const c of productsUnitCols) {
      if (await columnExists(pool, 'Products', c)) selectedCols.push(c);
    }

    const q = `SELECT TOP 5 ${selectedCols.join(', ')} FROM Products WHERE ${idCol} = @id OR CONVERT(NVARCHAR(36), ${idCol}) = @id`;
    const rs = await pool.request().input('id', sql.NVarChar, productId).query(q);
    if (rs.recordset.length > 0) {
      console.log(`FOUND Products via ${idCol}:`, rs.recordset[0]);
      return;
    }
  }

  console.log('NOT_FOUND in Products by candidate id columns');
}

async function findByProductStore(pool: sql.ConnectionPool, table: string): Promise<void> {
  const productCols = ['product_id', 'ProductId', 'ProductID'];
  const storeCols = ['store_id', 'StoreId', 'StoreID'];

  let productCol: string | null = null;
  let storeCol: string | null = null;

  for (const c of productCols) {
    if (await columnExists(pool, table, c)) {
      productCol = c;
      break;
    }
  }

  for (const c of storeCols) {
    if (await columnExists(pool, table, c)) {
      storeCol = c;
      break;
    }
  }

  if (!productCol || !storeCol) {
    console.log(`${table}: missing product/store columns`, { productCol, storeCol });
    return;
  }

  const q = `SELECT TOP 5 * FROM ${table} WHERE ${productCol} = @pid AND ${storeCol} = @sid`;
  const rs = await pool.request()
    .input('pid', sql.NVarChar, productId)
    .input('sid', sql.NVarChar, storeId)
    .query(q);

  console.log(`${table} match by ${productCol}/${storeCol}: ${rs.recordset.length}`);
  if (rs.recordset.length > 0) {
    console.log(`${table} first row:`, rs.recordset[0]);
  }
}

async function checkAvailableBySp(pool: sql.ConnectionPool): Promise<void> {
  const unitsRs = await pool.request()
    .input('pid', sql.NVarChar, productId)
    .input('sid', sql.NVarChar, storeId)
    .query(`
      SELECT DISTINCT pi.UnitId
      FROM ProductInventory pi
      WHERE pi.ProductId = @pid AND pi.StoreId = @sid
    `);

  const productRs = await pool.request()
    .input('id', sql.NVarChar, productId)
    .query(`
      SELECT TOP 1 unit_id, default_sales_unit_id
      FROM Products
      WHERE id = @id
    `);

  const unitIds = new Set<string>();
  for (const row of unitsRs.recordset) {
    if (row.UnitId) unitIds.add(String(row.UnitId));
  }
  if (productRs.recordset[0]?.unit_id) unitIds.add(String(productRs.recordset[0].unit_id));
  if (productRs.recordset[0]?.default_sales_unit_id) unitIds.add(String(productRs.recordset[0].default_sales_unit_id));

  if (unitIds.size === 0) {
    console.log('SP CHECK: no unit ids to test');
    return;
  }

  for (const unitId of unitIds) {
    try {
      const rs = await pool.request()
        .input('productId', sql.NVarChar, productId)
        .input('storeId', sql.NVarChar, storeId)
        .input('unitId', sql.NVarChar, unitId)
        .execute('sp_Inventory_GetAvailable');

      const row = rs.recordset?.[0];
      console.log(`SP available for unit ${unitId}:`, row);
    } catch (error) {
      console.log(`SP available failed for unit ${unitId}:`, error instanceof Error ? error.message : String(error));
    }
  }
}

async function main(): Promise<void> {
  const pool = await sql.connect(cfg);
  try {
    console.log({ productId, storeId });
    await printColumns(pool, 'Products');
    await printColumns(pool, 'ProductInventory');
    await printColumns(pool, 'ProductUnits');

    await findProduct(pool);

    const inStoreCount = await pool.request()
      .input('sid', sql.NVarChar, storeId)
      .query(`SELECT COUNT(*) AS total FROM Products WHERE store_id = @sid AND status <> 'deleted'`);
    console.log('Products in current store:', inStoreCount.recordset[0]?.total || 0);

    await findByProductStore(pool, 'ProductInventory');
    await findByProductStore(pool, 'ProductUnits');
    await checkAvailableBySp(pool);
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
