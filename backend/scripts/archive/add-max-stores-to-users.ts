import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function addMaxStoresToUsers() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Check if max_stores column exists
    const checkColumn = await sql.query`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'max_stores'
    `;

    if (checkColumn.recordset[0].count === 0) {
      console.log('Adding max_stores column to Users table...');
      
      await sql.query`
        ALTER TABLE Users
        ADD max_stores INT DEFAULT 3
      `;
      
      console.log('✅ Column added successfully!');
    } else {
      console.log('✅ Column max_stores already exists');
    }

    // Set default value for existing users
    await sql.query`
      UPDATE Users
      SET max_stores = 3
      WHERE max_stores IS NULL
    `;
    
    console.log('✅ Updated existing users with default max_stores = 3');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

addMaxStoresToUsers();
