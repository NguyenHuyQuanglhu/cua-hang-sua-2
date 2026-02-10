import { getConnection, closeConnection } from '../src/lib/db';

async function testConnection() {
  console.log('Testing SQL Server connection...');
  console.log('Server:', process.env.DB_SERVER || '118.69.126.49');
  console.log('Database:', process.env.DB_NAME || 'Data_QuanLyBanHang_Online');
  
  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server successfully!');
    
    // Test a simple query
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Query executed successfully:', result.recordset);
    
    // Check some tables
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('📋 Available tables:', tables.recordset.map(t => t.TABLE_NAME));
    
    await closeConnection();
    console.log('✅ Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
