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

async function checkAndUpdate() {
  try {
    const pool = await sql.connect(config);
    
    // Check current customers
    console.log('\n📋 Current Customers:');
    console.log('='.repeat(100));
    const customers = await pool.request().query(`
      SELECT 
        full_name,
        gender,
        customer_type,
        store_id
      FROM Customers
      ORDER BY full_name
    `);
    
    console.log(`Total customers: ${customers.recordset.length}`);
    console.log('\nFirst 10 customers:');
    customers.recordset.slice(0, 10).forEach((c: any) => {
      console.log(`  ${c.full_name.padEnd(30)} | Gender: ${(c.gender || 'NULL').padEnd(10)} | Type: ${c.customer_type || 'NULL'}`);
    });
    
    // Count by gender
    const genderCount = await pool.request().query(`
      SELECT 
        gender,
        COUNT(*) as count
      FROM Customers
      GROUP BY gender
    `);
    
    console.log('\n📊 Gender Distribution:');
    genderCount.recordset.forEach((g: any) => {
      console.log(`  ${(g.gender || 'NULL').padEnd(10)}: ${g.count} customers`);
    });
    
    // Update some customers with random gender for testing
    console.log('\n🔄 Updating customers with random gender for testing...');
    
    // Get all customers and update them one by one
    const allCustomers = await pool.request().query(`
      SELECT id FROM Customers WHERE gender IS NULL
    `);
    
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;
    
    for (let i = 0; i < allCustomers.recordset.length; i++) {
      const customer = allCustomers.recordset[i];
      let gender;
      
      if (i % 3 === 0) {
        gender = 'male';
        maleCount++;
      } else if (i % 3 === 1) {
        gender = 'female';
        femaleCount++;
      } else {
        gender = 'other';
        otherCount++;
      }
      
      await pool.request()
        .input('id', sql.UniqueIdentifier, customer.id)
        .input('gender', sql.NVarChar(20), gender)
        .query(`UPDATE Customers SET gender = @gender WHERE id = @id`);
    }
    
    console.log(`✅ Updated ${allCustomers.recordset.length} customers`);
    console.log(`   - Male: ${maleCount}`);
    console.log(`   - Female: ${femaleCount}`);
    console.log(`   - Other: ${otherCount}`);
    
    // Show updated distribution
    const newGenderCount = await pool.request().query(`
      SELECT 
        gender,
        COUNT(*) as count
      FROM Customers
      GROUP BY gender
    `);
    
    console.log('\n📊 New Gender Distribution:');
    newGenderCount.recordset.forEach((g: any) => {
      console.log(`  ${(g.gender || 'NULL').padEnd(10)}: ${g.count} customers`);
    });
    
    // Show sample by store
    console.log('\n🏪 Customers by Store:');
    const byStore = await pool.request().query(`
      SELECT 
        s.name as store_name,
        c.gender,
        COUNT(*) as count
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      GROUP BY s.name, c.gender
      ORDER BY s.name, c.gender
    `);
    
    byStore.recordset.forEach((row: any) => {
      console.log(`  ${(row.store_name || 'Unknown').padEnd(30)} | ${(row.gender || 'NULL').padEnd(10)}: ${row.count}`);
    });
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndUpdate();
