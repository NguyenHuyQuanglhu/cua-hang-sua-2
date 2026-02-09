import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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

async function addColumns() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Check if columns exist before adding
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customers' 
      AND COLUMN_NAME IN ('gender', 'birthday', 'zalo', 'bank_name', 'bank_account_number', 'bank_branch', 'loyalty_points')
    `;
    
    const existing = await pool.request().query(checkQuery);
    const existingColumns = existing.recordset.map((r: any) => r.COLUMN_NAME);
    
    console.log('\n📋 Existing columns:', existingColumns);
    
    // Add gender column
    if (!existingColumns.includes('gender')) {
      console.log('\n➕ Adding gender column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD gender NVARCHAR(20) NULL
      `);
      console.log('✅ gender column added');
    } else {
      console.log('⏭️  gender column already exists');
    }
    
    // Add birthday column
    if (!existingColumns.includes('birthday')) {
      console.log('\n➕ Adding birthday column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD birthday DATE NULL
      `);
      console.log('✅ birthday column added');
    } else {
      console.log('⏭️  birthday column already exists');
    }
    
    // Add zalo column
    if (!existingColumns.includes('zalo')) {
      console.log('\n➕ Adding zalo column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD zalo NVARCHAR(50) NULL
      `);
      console.log('✅ zalo column added');
    } else {
      console.log('⏭️  zalo column already exists');
    }
    
    // Add bank_name column
    if (!existingColumns.includes('bank_name')) {
      console.log('\n➕ Adding bank_name column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD bank_name NVARCHAR(255) NULL
      `);
      console.log('✅ bank_name column added');
    } else {
      console.log('⏭️  bank_name column already exists');
    }
    
    // Add bank_account_number column
    if (!existingColumns.includes('bank_account_number')) {
      console.log('\n➕ Adding bank_account_number column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD bank_account_number NVARCHAR(50) NULL
      `);
      console.log('✅ bank_account_number column added');
    } else {
      console.log('⏭️  bank_account_number column already exists');
    }
    
    // Add bank_branch column
    if (!existingColumns.includes('bank_branch')) {
      console.log('\n➕ Adding bank_branch column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD bank_branch NVARCHAR(255) NULL
      `);
      console.log('✅ bank_branch column added');
    } else {
      console.log('⏭️  bank_branch column already exists');
    }
    
    // Add loyalty_points column
    if (!existingColumns.includes('loyalty_points')) {
      console.log('\n➕ Adding loyalty_points column...');
      await pool.request().query(`
        ALTER TABLE Customers 
        ADD loyalty_points INT NULL DEFAULT 0
      `);
      console.log('✅ loyalty_points column added');
    } else {
      console.log('⏭️  loyalty_points column already exists');
    }

    console.log('\n✅ All columns added successfully!');
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addColumns();
