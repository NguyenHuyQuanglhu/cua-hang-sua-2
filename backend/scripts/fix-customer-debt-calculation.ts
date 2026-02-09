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

async function fixCustomerDebt() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Fixing customer debt calculation...\n');
    pool = await sql.connect(config);

    // Get all customers with their actual debt from sales
    const customers = await pool.request().query(`
      SELECT 
        c.id,
        c.full_name,
        c.total_debt as current_total_debt,
        c.total_paid as current_total_paid,
        s.name as store_name,
        -- Calculate actual debt from sales
        ISNULL(SUM(CASE 
          WHEN sales.status != 'cancelled' 
          THEN sales.final_amount - ISNULL(sales.customer_payment, 0)
          ELSE 0 
        END), 0) as actual_debt_from_sales,
        -- Calculate actual paid from sales
        ISNULL(SUM(CASE 
          WHEN sales.status != 'cancelled' 
          THEN ISNULL(sales.customer_payment, 0)
          ELSE 0 
        END), 0) as actual_paid_from_sales,
        -- Calculate from payments table
        ISNULL((
          SELECT SUM(amount)
          FROM Payments p
          WHERE p.customer_id = c.id
        ), 0) as actual_paid_from_payments
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      LEFT JOIN Sales sales ON c.id = sales.customer_id AND sales.store_id = c.store_id
      GROUP BY c.id, c.full_name, c.total_debt, c.total_paid, s.name
      HAVING c.total_debt != ISNULL(SUM(CASE 
        WHEN sales.status != 'cancelled' 
        THEN sales.final_amount - ISNULL(sales.customer_payment, 0)
        ELSE 0 
      END), 0)
      ORDER BY c.full_name
    `);

    if (customers.recordset.length === 0) {
      console.log('✅ All customer debts are correct!');
      return;
    }

    console.log(`Found ${customers.recordset.length} customers with incorrect debt:\n`);

    let fixed = 0;
    let errors = 0;

    for (const customer of customers.recordset) {
      console.log(`\n${fixed + errors + 1}. ${customer.full_name} (${customer.store_name})`);
      console.log(`   Current debt in DB: ${customer.current_total_debt?.toLocaleString('vi-VN') || 0} VND`);
      console.log(`   Actual debt from sales: ${customer.actual_debt_from_sales?.toLocaleString('vi-VN') || 0} VND`);
      console.log(`   Current paid in DB: ${customer.current_total_paid?.toLocaleString('vi-VN') || 0} VND`);
      console.log(`   Actual paid from sales: ${customer.actual_paid_from_sales?.toLocaleString('vi-VN') || 0} VND`);
      console.log(`   Actual paid from payments: ${customer.actual_paid_from_payments?.toLocaleString('vi-VN') || 0} VND`);

      // Calculate correct values
      const correctDebt = customer.actual_debt_from_sales || 0;
      const correctPaid = Math.max(
        customer.actual_paid_from_sales || 0,
        customer.actual_paid_from_payments || 0
      );

      try {
        await pool.request()
          .input('customerId', sql.UniqueIdentifier, customer.id)
          .input('totalDebt', sql.Decimal(18, 2), correctDebt)
          .input('totalPaid', sql.Decimal(18, 2), correctPaid)
          .query(`
            UPDATE Customers
            SET 
              total_debt = @totalDebt,
              total_paid = @totalPaid,
              updated_at = GETDATE()
            WHERE id = @customerId
          `);

        console.log(`   ✅ Fixed: debt = ${correctDebt.toLocaleString('vi-VN')}, paid = ${correctPaid.toLocaleString('vi-VN')}`);
        fixed++;
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Fixed: ${fixed} customers`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} customers`);
    }
    console.log(`${'='.repeat(60)}`);

    // Show summary
    console.log('\n📊 Summary of all customers with debt:');
    const summary = await pool.request().query(`
      SELECT 
        c.full_name,
        c.total_debt,
        c.total_paid,
        s.name as store_name
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      WHERE c.total_debt > 0
      ORDER BY c.total_debt DESC
    `);

    if (summary.recordset.length > 0) {
      summary.recordset.forEach((c: any, idx: number) => {
        console.log(`\n${idx + 1}. ${c.full_name} (${c.store_name})`);
        console.log(`   Debt: ${c.total_debt?.toLocaleString('vi-VN') || 0} VND`);
        console.log(`   Paid: ${c.total_paid?.toLocaleString('vi-VN') || 0} VND`);
      });
    } else {
      console.log('No customers with debt');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

fixCustomerDebt();
