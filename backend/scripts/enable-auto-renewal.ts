import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'master',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function enableAutoRenewal() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully\n');

    // List all users
    console.log('👥 Available users:');
    const users = await pool.request().query(`
      SELECT 
        id,
        username,
        email,
        subscription_plan_id,
        subscription_status,
        auto_renewal
      FROM Users
      ORDER BY created_at DESC
    `);

    users.recordset.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   Plan: ${user.subscription_plan_id || 'basic'}`);
      console.log(`   Auto-renewal: ${user.auto_renewal ? 'ON' : 'OFF'}`);
      console.log('');
    });

    // Get user selection
    const userIndex = await question('Enter user number to enable auto-renewal (or "all" for all users): ');
    
    if (userIndex.toLowerCase() === 'all') {
      const confirm = await question('Are you sure you want to enable auto-renewal for ALL users? (yes/no): ');
      if (confirm.toLowerCase() === 'yes') {
        const result = await pool.request().query(`
          UPDATE Users 
          SET auto_renewal = 1, updated_at = GETDATE()
        `);
        console.log(`\n✅ Enabled auto-renewal for ${result.rowsAffected[0]} users`);
      } else {
        console.log('\n❌ Operation cancelled');
      }
    } else {
      const index = parseInt(userIndex) - 1;
      if (index >= 0 && index < users.recordset.length) {
        const selectedUser = users.recordset[index];
        
        const confirm = await question(`Enable auto-renewal for ${selectedUser.username}? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
          await pool.request()
            .input('userId', sql.UniqueIdentifier, selectedUser.id)
            .query(`
              UPDATE Users 
              SET auto_renewal = 1, updated_at = GETDATE()
              WHERE id = @userId
            `);
          
          console.log(`\n✅ Enabled auto-renewal for ${selectedUser.username}`);
          
          // Log the change
          await pool.request()
            .input('userId', sql.UniqueIdentifier, selectedUser.id)
            .input('details', sql.NVarChar, JSON.stringify({ 
              autoRenewal: true,
              timestamp: new Date().toISOString(),
              source: 'manual_script'
            }))
            .query(`
              INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
              VALUES (NEWID(), @userId, 'subscription_auto_renewal_toggle', 'subscription', @userId, @details, GETDATE())
            `);
          
          console.log('✅ Audit log created');
        } else {
          console.log('\n❌ Operation cancelled');
        }
      } else {
        console.log('\n❌ Invalid user number');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    rl.close();
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
enableAutoRenewal()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
