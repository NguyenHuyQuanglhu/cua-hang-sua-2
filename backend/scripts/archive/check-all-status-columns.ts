import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkAllStatusColumns() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Get all tables
    const tablesResult = await sql.query`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    console.log('\nTables with status column:\n');

    for (const table of tablesResult.recordset) {
      const tableName = table.TABLE_NAME;
      
      // Check if table has status column
      const columnResult = await sql.query`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ${tableName} AND COLUMN_NAME = 'status'
      `;

      if (columnResult.recordset.length > 0) {
        console.log(`✓ ${tableName} - has status column (${columnResult.recordset[0].DATA_TYPE})`);
      }
    }

    // Close connection
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllStatusColumns();
