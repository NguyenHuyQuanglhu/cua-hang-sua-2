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

async function getStoreId() {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT TOP 1 id, name FROM Stores`;
    console.log('Store ID:', result.recordset[0]?.id);
    console.log('Store Name:', result.recordset[0]?.name);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

getStoreId();
