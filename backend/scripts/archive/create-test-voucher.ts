/**
 * Create Test Voucher Script
 * Usage: npx tsx scripts/create-test-voucher.ts [storeId]
 */

import 'dotenv/config';
import { getConnection, closeConnection, sql } from '../src/db/index.js';
import { v4 as uuidv4 } from 'uuid';

async function createTestVoucher(storeId?: string) {
  console.log('🎫 Creating test voucher...\n');

  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server\n');

    // Get store ID
    let targetStoreId = storeId;
    if (!targetStoreId) {
      const storesResult = await pool.request().query('SELECT TOP 1 id FROM Stores WHERE status = \'active\'');
      if (storesResult.recordset.length === 0) {
        throw new Error('No active store found. Please create a store first.');
      }
      targetStoreId = storesResult.recordset[0].id;
    }
    console.log(`📦 Using store ID: ${targetStoreId}\n`);

    // Create test vouchers
    const vouchers = [
      {
        code: 'SALE10',
        name: 'Giảm 10%',
        description: 'Giảm giá 10% cho đơn hàng từ 100,000đ',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscountAmount: 50000,
        minPurchaseAmount: 100000,
        usageLimit: 100,
        usagePerCustomer: 5,
      },
      {
        code: 'SAVE50K',
        name: 'Giảm 50,000đ',
        description: 'Giảm 50,000đ cho đơn hàng từ 500,000đ',
        discountType: 'fixed',
        discountValue: 50000,
        maxDiscountAmount: null,
        minPurchaseAmount: 500000,
        usageLimit: 50,
        usagePerCustomer: 3,
      },
      {
        code: 'SHIP30K',
        name: 'Miễn phí vận chuyển',
        description: 'Giảm 30,000đ phí vận chuyển',
        discountType: 'fixed',
        discountValue: 30000,
        maxDiscountAmount: null,
        minPurchaseAmount: 200000,
        usageLimit: 200,
        usagePerCustomer: 10,
      },
      {
        code: 'MEMBER20',
        name: 'Thành viên - Giảm 20%',
        description: 'Giảm giá 20% cho thành viên',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscountAmount: 100000,
        minPurchaseAmount: 300000,
        usageLimit: 30,
        usagePerCustomer: 2,
      },
    ];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

    for (const voucher of vouchers) {
      const id = uuidv4();
      
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, targetStoreId)
        .input('code', sql.NVarChar, voucher.code)
        .input('name', sql.NVarChar, voucher.name)
        .input('description', sql.NVarChar, voucher.description)
        .input('discountType', sql.NVarChar, voucher.discountType)
        .input('discountValue', sql.Decimal(18, 2), voucher.discountValue)
        .input('maxDiscountAmount', sql.Decimal(18, 2), voucher.maxDiscountAmount)
        .input('minPurchaseAmount', sql.Decimal(18, 2), voucher.minPurchaseAmount)
        .input('startDate', sql.DateTime2, startDate)
        .input('endDate', sql.DateTime2, endDate)
        .input('usageLimit', sql.Int, voucher.usageLimit)
        .input('usageCount', sql.Int, 0)
        .input('usagePerCustomer', sql.Int, voucher.usagePerCustomer)
        .input('status', sql.NVarChar, 'active')
        .query(`
          INSERT INTO Vouchers (
            id, store_id, code, name, description, 
            discount_type, discount_value, max_discount_amount, min_purchase_amount,
            start_date, end_date, usage_limit, usage_count, usage_per_customer, status
          ) VALUES (
            @id, @storeId, @code, @name, @description,
            @discountType, @discountValue, @maxDiscountAmount, @minPurchaseAmount,
            @startDate, @endDate, @usageLimit, @usageCount, @usagePerCustomer, @status
          )
        `);

      console.log(`✅ Created voucher: ${voucher.code} - ${voucher.name}`);
    }

    await closeConnection();
    console.log('\n✅ Test vouchers created successfully!\n');
    console.log('Available voucher codes:');
    vouchers.forEach(v => {
      console.log(`  - ${v.code}: ${v.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create vouchers:', error);
    process.exit(1);
  }
}

// Get store ID from command line argument
const storeId = process.argv[2];
createTestVoucher(storeId);
