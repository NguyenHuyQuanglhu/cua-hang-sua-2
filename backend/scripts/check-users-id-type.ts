import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'CuaHangSua',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Khanhlinh2011',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function checkUsersIdType() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected\n');

    // Check Users.Id column type
    const usersIdResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Id'
    `);

    console.log('📋 Users.Id column info:');
    console.log(usersIdResult.recordset[0]);
    console.log('');

    // Check if Sales.CreatedBy exists
    const salesCreatedByResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Sales' AND COLUMN_NAME = 'CreatedBy'
    `);

    if (salesCreatedByResult.recordset.length > 0) {
      console.log('📋 Sales.CreatedBy column info:');
      console.log(salesCreatedByResult.recordset[0]);
    } else {
      console.log('⚠️  Sales.CreatedBy column does not exist yet');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkUsersIdType();
