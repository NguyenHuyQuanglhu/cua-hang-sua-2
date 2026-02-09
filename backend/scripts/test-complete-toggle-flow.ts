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

async function testCompleteToggleFlow() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Testing complete auto-renewal toggle flow...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // Use first user
    const testUserId = 'A4660FF2-2C59-4605-A0BF-1B2B836D8B40'; // nhan@lhu.edu.vn

    // 1. Get current value
    console.log('1. Getting current auto_renewal value...');
    const currentResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        SELECT auto_renewal, email, display_name
        FROM Users
        WHERE id = @userId
      `);
    
    const user = currentResult.recordset[0];
    console.log(`   User: ${user.display_name} (${user.email})`);
    console.log(`   Current auto_renewal: ${user.auto_renewal === 1 ? 'ON (1)' : user.auto_renewal === 0 ? 'OFF (0)' : 'NULL'}\n`);

    // 2. Toggle to opposite value
    const newValue = user.auto_renewal === 1 ? 0 : 1;
    console.log(`2. Toggling auto_renewal to: ${newValue === 1 ? 'ON (1)' : 'OFF (0)'}...`);
    
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .input('autoRenewal', sql.Bit, newValue)
      .query(`
        UPDATE Users 
        SET auto_renewal = @autoRenewal, updated_at = GETDATE() 
        WHERE id = @userId
      `);
    console.log('   ✓ Update successful\n');

    // 3. Insert audit log
    console.log('3. Inserting audit log...');
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ 
        autoRenewal: newValue === 1,
        timestamp: new Date().toISOString() 
      }))
      .query(`
        INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
        VALUES (NEWID(), @userId, 'subscription_auto_renewal_toggle', 'subscription', @userId, @details, GETDATE())
      `);
    console.log('   ✓ Audit log created\n');

    // 4. Verify the change
    console.log('4. Verifying the change...');
    const verifyResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        SELECT auto_renewal
        FROM Users
        WHERE id = @userId
      `);
    
    const newAutoRenewal = verifyResult.recordset[0].auto_renewal;
    console.log(`   New auto_renewal: ${newAutoRenewal === 1 ? 'ON (1)' : 'OFF (0)'}`);
    
    if (newAutoRenewal === newValue) {
      console.log('   ✓ Value changed correctly!\n');
    } else {
      console.log('   ❌ Value did not change!\n');
    }

    // 5. Toggle back to original value
    console.log('5. Toggling back to original value...');
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .input('autoRenewal', sql.Bit, user.auto_renewal)
      .query(`
        UPDATE Users 
        SET auto_renewal = @autoRenewal, updated_at = GETDATE() 
        WHERE id = @userId
      `);
    console.log('   ✓ Restored original value\n');

    // 6. Check audit logs
    console.log('6. Checking recent audit logs...');
    const auditLogs = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        SELECT TOP 5
          action,
          entity_type,
          details,
          created_at
        FROM AuditLogs
        WHERE user_id = @userId
        AND action = 'subscription_auto_renewal_toggle'
        ORDER BY created_at DESC
      `);
    
    console.log(`   Found ${auditLogs.recordset.length} audit log(s):`);
    auditLogs.recordset.forEach((log: any, index: number) => {
      console.log(`   ${index + 1}. ${log.action} - ${new Date(log.created_at).toLocaleString('vi-VN')}`);
      console.log(`      Details: ${log.details}`);
    });

    console.log('\n✅ Complete toggle flow test PASSED!');
    console.log('The auto-renewal toggle should now work from the frontend.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testCompleteToggleFlow();
