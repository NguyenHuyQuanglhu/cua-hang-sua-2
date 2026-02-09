import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Fake email and phone generators
function generateFakeEmail(name: string, index: number): string {
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
  
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = domains[index % domains.length];
  
  return `${cleanName}${index}@${domain}`;
}

function generateFakePhone(index: number): string {
  // Vietnamese phone format: 09xx xxx xxx or 03xx xxx xxx
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099', '032', '033', '034', '035', '036', '037', '038', '039'];
  const prefix = prefixes[index % prefixes.length];
  const middle = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const last = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return `${prefix}${middle}${last}`;
}

async function addTestContactInfo() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Adding test contact info to customers...\n');
    pool = await sql.connect(config);

    // Get all customers without email or phone
    const customers = await pool.request().query(`
      SELECT 
        c.id,
        c.full_name as name,
        c.email,
        c.phone,
        c.total_debt,
        s.name as store_name
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      ORDER BY c.full_name
    `);

    if (customers.recordset.length === 0) {
      console.log('No customers found');
      return;
    }

    console.log(`Found ${customers.recordset.length} customers\n`);

    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < customers.recordset.length; i++) {
      const customer = customers.recordset[i];
      const needsEmail = !customer.email;
      const needsPhone = !customer.phone;

      if (!needsEmail && !needsPhone) {
        console.log(`${i + 1}. ${customer.name} - Already has contact info ✓`);
        skipped++;
        continue;
      }

      const newEmail = needsEmail ? generateFakeEmail(customer.name, i) : customer.email;
      const newPhone = needsPhone ? generateFakePhone(i) : customer.phone;

      try {
        await pool.request()
          .input('customerId', sql.UniqueIdentifier, customer.id)
          .input('email', sql.NVarChar, newEmail)
          .input('phone', sql.NVarChar, newPhone)
          .query(`
            UPDATE Customers
            SET 
              email = @email,
              phone = @phone,
              updated_at = GETDATE()
            WHERE id = @customerId
          `);

        console.log(`${i + 1}. ${customer.name} (${customer.store_name})`);
        if (needsEmail) console.log(`   📧 Email: ${newEmail}`);
        if (needsPhone) console.log(`   📱 Phone: ${newPhone}`);
        if (customer.total_debt > 0) {
          console.log(`   💰 Debt: ${customer.total_debt.toLocaleString('vi-VN')} VND`);
        }
        console.log('');

        updated++;
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        skipped++;
      }
    }

    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Updated: ${updated} customers`);
    console.log(`⏭️  Skipped: ${skipped} customers`);
    console.log(`${'='.repeat(50)}`);

    // Show customers with debt for testing
    console.log('\n📋 Customers with debt (ready for testing):');
    const debtCustomers = await pool.request().query(`
      SELECT TOP 10
        c.full_name as name,
        c.email,
        c.phone,
        c.total_debt,
        s.name as store_name
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      WHERE c.total_debt > 0
      ORDER BY c.total_debt DESC
    `);

    if (debtCustomers.recordset.length > 0) {
      debtCustomers.recordset.forEach((c: any, idx: number) => {
        console.log(`\n${idx + 1}. ${c.name} (${c.store_name})`);
        console.log(`   Debt: ${c.total_debt.toLocaleString('vi-VN')} VND`);
        console.log(`   Email: ${c.email || 'N/A'}`);
        console.log(`   Phone: ${c.phone || 'N/A'}`);
      });
    } else {
      console.log('No customers with debt found');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

addTestContactInfo();
