/**
 * Seed Sample Data Script
 * 
 * This script creates sample data for Purchases and Sales
 * Usage: npx tsx scripts/seed-sample-data.ts [storeId]
 */

import 'dotenv/config';
import { getConnection, closeConnection, sql } from '../src/db/index.js';
import { v4 as uuidv4 } from 'uuid';

// Sample data constants
const SAMPLE_CATEGORIES = [
  { name: 'Điện tử', description: 'Thiết bị điện tử, điện thoại, máy tính' },
  { name: 'Thực phẩm', description: 'Đồ ăn, thức uống, bánh kẹo' },
  { name: 'Thời trang', description: 'Quần áo, giày dép, phụ kiện' },
  { name: 'Gia dụng', description: 'Đồ dùng gia đình, nội thất' },
  { name: 'Văn phòng phẩm', description: 'Bút, vở, giấy, dụng cụ văn phòng' },
];

const SAMPLE_UNITS = [
  { name: 'Cái', description: 'Đơn vị tính theo cái' },
  { name: 'Kg', description: 'Đơn vị tính theo kilogram' },
  { name: 'Hộp', description: 'Đơn vị tính theo hộp' },
  { name: 'Chai', description: 'Đơn vị tính theo chai' },
  { name: 'Gói', description: 'Đơn vị tính theo gói' },
];

const SAMPLE_SUPPLIERS = [
  { name: 'Công ty TNHH ABC', contactPerson: 'Nguyễn Văn A', phone: '0901234567', email: 'abc@supplier.com', address: '123 Nguyễn Huệ, Q1, TP.HCM' },
  { name: 'Công ty CP XYZ', contactPerson: 'Trần Thị B', phone: '0912345678', email: 'xyz@supplier.com', address: '456 Lê Lợi, Q3, TP.HCM' },
  { name: 'Nhà phân phối Minh Phát', contactPerson: 'Lê Văn C', phone: '0923456789', email: 'minhphat@supplier.com', address: '789 Hai Bà Trưng, Q1, TP.HCM' },
  { name: 'Đại lý Hoàng Long', contactPerson: 'Phạm Thị D', phone: '0934567890', email: 'hoanglong@supplier.com', address: '321 Võ Văn Tần, Q3, TP.HCM' },
  { name: 'Công ty Thành Đạt', contactPerson: 'Hoàng Văn E', phone: '0945678901', email: 'thanhdat@supplier.com', address: '654 Điện Biên Phủ, Q10, TP.HCM' },
];

const SAMPLE_CUSTOMERS = [
  { name: 'Nguyễn Văn Minh', phone: '0901111111', email: 'minh@email.com', address: '100 Nguyễn Trãi, Q5, TP.HCM', customerType: 'personal' },
  { name: 'Trần Thị Hoa', phone: '0902222222', email: 'hoa@email.com', address: '200 Cách Mạng Tháng 8, Q10, TP.HCM', customerType: 'personal' },
  { name: 'Công ty ABC Corp', phone: '0903333333', email: 'abc@corp.com', address: '300 Lý Tự Trọng, Q1, TP.HCM', customerType: 'business' },
  { name: 'Lê Văn Hùng', phone: '0904444444', email: 'hung@email.com', address: '400 Trần Hưng Đạo, Q5, TP.HCM', customerType: 'personal' },
  { name: 'Phạm Thị Lan', phone: '0905555555', email: 'lan@email.com', address: '500 Nguyễn Đình Chiểu, Q3, TP.HCM', customerType: 'personal' },
  { name: 'Cửa hàng Thành Công', phone: '0906666666', email: 'thanhcong@shop.com', address: '600 Võ Thị Sáu, Q3, TP.HCM', customerType: 'business' },
  { name: 'Hoàng Văn Nam', phone: '0907777777', email: 'nam@email.com', address: '700 Pasteur, Q1, TP.HCM', customerType: 'personal' },
  { name: 'Đỗ Thị Mai', phone: '0908888888', email: 'mai@email.com', address: '800 Nguyễn Thị Minh Khai, Q1, TP.HCM', customerType: 'personal' },
  { name: 'Siêu thị Mini Mart', phone: '0909999999', email: 'minimart@shop.com', address: '900 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM', customerType: 'business' },
  { name: 'Vũ Văn Tùng', phone: '0910000000', email: 'tung@email.com', address: '1000 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM', customerType: 'personal' },
];

const SAMPLE_PRODUCTS = [
  { name: 'iPhone 15 Pro Max', barcode: '8901234567890', sellingPrice: 32990000, categoryIndex: 0 },
  { name: 'Samsung Galaxy S24', barcode: '8901234567891', sellingPrice: 24990000, categoryIndex: 0 },
  { name: 'Laptop Dell XPS 15', barcode: '8901234567892', sellingPrice: 45990000, categoryIndex: 0 },
  { name: 'Tai nghe AirPods Pro', barcode: '8901234567893', sellingPrice: 6490000, categoryIndex: 0 },
  { name: 'Mì gói Hảo Hảo', barcode: '8934563941018', sellingPrice: 5000, categoryIndex: 1 },
  { name: 'Nước ngọt Coca Cola 330ml', barcode: '8934563941019', sellingPrice: 12000, categoryIndex: 1 },
  { name: 'Bánh Oreo 137g', barcode: '8934563941020', sellingPrice: 25000, categoryIndex: 1 },
  { name: 'Sữa Vinamilk 1L', barcode: '8934563941021', sellingPrice: 35000, categoryIndex: 1 },
  { name: 'Áo thun nam basic', barcode: '8934563941022', sellingPrice: 199000, categoryIndex: 2 },
  { name: 'Quần jean nữ', barcode: '8934563941023', sellingPrice: 450000, categoryIndex: 2 },
  { name: 'Giày thể thao Nike', barcode: '8934563941024', sellingPrice: 2500000, categoryIndex: 2 },
  { name: 'Túi xách nữ', barcode: '8934563941025', sellingPrice: 890000, categoryIndex: 2 },
  { name: 'Nồi cơm điện Sunhouse', barcode: '8934563941026', sellingPrice: 890000, categoryIndex: 3 },
  { name: 'Quạt điện Panasonic', barcode: '8934563941027', sellingPrice: 650000, categoryIndex: 3 },
  { name: 'Bàn ủi hơi nước', barcode: '8934563941028', sellingPrice: 450000, categoryIndex: 3 },
  { name: 'Máy xay sinh tố', barcode: '8934563941029', sellingPrice: 750000, categoryIndex: 3 },
  { name: 'Bút bi Thiên Long', barcode: '8934563941030', sellingPrice: 5000, categoryIndex: 4 },
  { name: 'Vở 200 trang', barcode: '8934563941031', sellingPrice: 15000, categoryIndex: 4 },
  { name: 'Giấy A4 Double A', barcode: '8934563941032', sellingPrice: 85000, categoryIndex: 4 },
  { name: 'Kẹp giấy hộp 100 cái', barcode: '8934563941033', sellingPrice: 12000, categoryIndex: 4 },
];

function generateOrderNumber(prefix: string, index: number): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${dateStr}-${String(index).padStart(3, '0')}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  // Generate dates between 2026-01-01 and 2026-01-31
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-01-31');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(startDate.getTime() + randomTime);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedSampleData(storeId?: string) {
  console.log('🚀 Starting sample data seeding...\n');

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

    // Check and create Categories
    console.log('📁 Checking categories...');
    const existingCategories = await pool.request()
      .input('storeId', sql.UniqueIdentifier, targetStoreId)
      .query('SELECT id, name FROM Categories WHERE store_id = @storeId');
    
    let categoryIds: string[] = existingCategories.recordset.map((c: { id: string }) => c.id);
    
    if (categoryIds.length === 0) {
      console.log('   Creating sample categories...');
      for (const cat of SAMPLE_CATEGORIES) {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, targetStoreId)
          .input('name', sql.NVarChar, cat.name)
          .input('description', sql.NVarChar, cat.description)
          .query('INSERT INTO Categories (id, store_id, name, description) VALUES (@id, @storeId, @name, @description)');
        categoryIds.push(id);
      }
      console.log(`   ✅ Created ${SAMPLE_CATEGORIES.length} categories`);
    } else {
      console.log(`   ✅ Found ${categoryIds.length} existing categories`);
    }

    // Check and create Units
    console.log('📏 Checking units...');
    const existingUnits = await pool.request()
      .input('storeId', sql.UniqueIdentifier, targetStoreId)
      .query('SELECT id, name FROM Units WHERE store_id = @storeId');
    
    let unitIds: string[] = existingUnits.recordset.map((u: { id: string }) => u.id);
    
    if (unitIds.length === 0) {
      console.log('   Creating sample units...');
      for (const unit of SAMPLE_UNITS) {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, targetStoreId)
          .input('name', sql.NVarChar, unit.name)
          .input('description', sql.NVarChar, unit.description)
          .query('INSERT INTO Units (id, store_id, name, description) VALUES (@id, @storeId, @name, @description)');
        unitIds.push(id);
      }
      console.log(`   ✅ Created ${SAMPLE_UNITS.length} units`);
    } else {
      console.log(`   ✅ Found ${unitIds.length} existing units`);
    }

    // Check and create Suppliers
    console.log('🏭 Checking suppliers...');
    const existingSuppliers = await pool.request()
      .input('storeId', sql.UniqueIdentifier, targetStoreId)
      .query('SELECT id, name FROM Suppliers WHERE store_id = @storeId');
    
    let supplierIds: string[] = existingSuppliers.recordset.map((s: { id: string }) => s.id);
    
    if (supplierIds.length === 0) {
      console.log('   Creating sample suppliers...');
      for (const supplier of SAMPLE_SUPPLIERS) {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, targetStoreId)
          .input('name', sql.NVarChar, supplier.name)
          .input('contactPerson', sql.NVarChar, supplier.contactPerson)
          .input('phone', sql.NVarChar, supplier.phone)
          .input('email', sql.NVarChar, supplier.email)
          .input('address', sql.NVarChar, supplier.address)
          .query(`INSERT INTO Suppliers (id, store_id, name, contact_person, phone, email, address) 
                  VALUES (@id, @storeId, @name, @contactPerson, @phone, @email, @address)`);
        supplierIds.push(id);
      }
      console.log(`   ✅ Created ${SAMPLE_SUPPLIERS.length} suppliers`);
    } else {
      console.log(`   ✅ Found ${supplierIds.length} existing suppliers`);
    }

    // Check and create Customers
    console.log('👥 Checking customers...');
    const existingCustomers = await pool.request()
      .input('storeId', sql.UniqueIdentifier, targetStoreId)
      .query('SELECT id, full_name FROM Customers WHERE store_id = @storeId');
    
    let customerIds: string[] = existingCustomers.recordset.map((c: { id: string }) => c.id);
    
    if (customerIds.length === 0) {
      console.log('   Creating sample customers...');
      for (const customer of SAMPLE_CUSTOMERS) {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, targetStoreId)
          .input('name', sql.NVarChar, customer.name)
          .input('phone', sql.NVarChar, customer.phone)
          .input('email', sql.NVarChar, customer.email)
          .input('address', sql.NVarChar, customer.address)
          .input('customerType', sql.NVarChar, customer.customerType)
          .input('status', sql.NVarChar, 'active')
          .query(`INSERT INTO Customers (id, store_id, full_name, phone, email, address, customer_type, status, created_at, updated_at) 
                  VALUES (@id, @storeId, @name, @phone, @email, @address, @customerType, @status, GETDATE(), GETDATE())`);
        customerIds.push(id);
      }
      console.log(`   ✅ Created ${SAMPLE_CUSTOMERS.length} customers`);
    } else {
      console.log(`   ✅ Found ${customerIds.length} existing customers`);
    }

    // Check and create Products
    console.log('📦 Checking products...');
    const existingProducts = await pool.request()
      .input('storeId', sql.UniqueIdentifier, targetStoreId)
      .query('SELECT id, name, price FROM Products WHERE store_id = @storeId');
    
    let products: Array<{ id: string; name: string; sellingPrice: number }> = existingProducts.recordset.map((p: { id: string; name: string; price: number }) => ({
      id: p.id,
      name: p.name,
      sellingPrice: p.price || 0
    }));
    
    if (products.length === 0) {
      console.log('   Creating sample products...');
      for (const product of SAMPLE_PRODUCTS) {
        const id = uuidv4();
        const categoryId = categoryIds[product.categoryIndex % categoryIds.length];
        const unitId = unitIds[0]; // Use first unit as default
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, targetStoreId)
          .input('name', sql.NVarChar, product.name)
          .input('sku', sql.NVarChar, product.barcode)
          .input('categoryId', sql.UniqueIdentifier, categoryId)
          .input('unitId', sql.UniqueIdentifier, unitId)
          .input('price', sql.Decimal(18, 2), product.sellingPrice)
          .input('costPrice', sql.Decimal(18, 2), Math.round(product.sellingPrice * 0.7))
          .input('stockQuantity', sql.Int, 100)
          .input('status', sql.NVarChar, 'active')
          .query(`INSERT INTO Products (id, store_id, name, sku, category_id, unit_id, price, cost_price, stock_quantity, status, created_at, updated_at) 
                  VALUES (@id, @storeId, @name, @sku, @categoryId, @unitId, @price, @costPrice, @stockQuantity, @status, GETDATE(), GETDATE())`);
        products.push({ id, name: product.name, sellingPrice: product.sellingPrice });
      }
      console.log(`   ✅ Created ${SAMPLE_PRODUCTS.length} products`);
    } else {
      console.log(`   ✅ Found ${products.length} existing products`);
    }

    // Create Purchase Orders
    console.log('\n📥 Creating sample purchase orders...');
    const purchaseCount = 30; // Increased to 30 orders for the month
    for (let i = 1; i <= purchaseCount; i++) {
      const purchaseId = uuidv4();
      const orderNumber = generateOrderNumber('PO', i);
      const supplierId = randomElement(supplierIds);
      const importDate = randomDate(60);
      
      // Create 2-5 items per order
      const itemCount = randomInt(2, 5);
      let totalAmount = 0;
      const selectedProducts = new Set<string>();
      
      // First, calculate total and prepare items
      const items: Array<{ productId: string; quantity: number; cost: number }> = [];
      for (let j = 0; j < itemCount; j++) {
        let product;
        do {
          product = randomElement(products);
        } while (selectedProducts.has(product.id));
        selectedProducts.add(product.id);
        
        const quantity = randomInt(5, 50);
        const cost = Math.round(product.sellingPrice * 0.7); // Cost is 70% of selling price
        totalAmount += quantity * cost;
        items.push({ productId: product.id, quantity, cost });
      }

      // Insert purchase order
      await pool.request()
        .input('id', sql.UniqueIdentifier, purchaseId)
        .input('storeId', sql.UniqueIdentifier, targetStoreId)
        .input('orderNumber', sql.NVarChar, orderNumber)
        .input('supplierId', sql.UniqueIdentifier, supplierId)
        .input('importDate', sql.DateTime2, importDate)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('notes', sql.NVarChar, `Đơn nhập hàng mẫu #${i}`)
        .query(`INSERT INTO PurchaseOrders (id, store_id, order_number, supplier_id, import_date, total_amount, notes) 
                VALUES (@id, @storeId, @orderNumber, @supplierId, @importDate, @totalAmount, @notes)`);

      // Insert purchase order items
      for (const item of items) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('purchaseOrderId', sql.UniqueIdentifier, purchaseId)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Decimal(18, 4), item.quantity)
          .input('cost', sql.Decimal(18, 2), item.cost)
          .query(`INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, created_at) 
                  VALUES (@id, @purchaseOrderId, @productId, @quantity, @cost, GETDATE())`);
      }
      
      console.log(`   ✅ Created ${orderNumber} with ${itemCount} items, total: ${totalAmount.toLocaleString('vi-VN')} VND`);
    }

    // Create Sales Transactions
    console.log('\n📤 Creating sample sales transactions...');
    const salesCount = 60; // Increased to 60 sales for the month (about 2 per day)
    const statuses = ['pending', 'unprinted', 'printed'];
    
    for (let i = 1; i <= salesCount; i++) {
      const saleId = uuidv4();
      const invoiceNumber = generateOrderNumber('INV', i);
      const customerId = randomElement(customerIds);
      const transactionDate = randomDate(30);
      const status = statuses[i % 3]; // Distribute evenly across statuses
      
      // Create 1-4 items per sale
      const itemCount = randomInt(1, 4);
      let totalAmount = 0;
      const selectedProducts = new Set<string>();
      
      // Prepare items
      const items: Array<{ productId: string; quantity: number; price: number }> = [];
      for (let j = 0; j < itemCount; j++) {
        let product;
        do {
          product = randomElement(products);
        } while (selectedProducts.has(product.id));
        selectedProducts.add(product.id);
        
        const quantity = randomInt(1, 10);
        const price = product.sellingPrice;
        totalAmount += quantity * price;
        items.push({ productId: product.id, quantity, price });
      }

      // Apply random discount (0-10%)
      const discountPercent = randomInt(0, 10);
      const discount = Math.round(totalAmount * discountPercent / 100);
      const finalAmount = totalAmount - discount;

      // Insert sale
      await pool.request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, targetStoreId)
        .input('invoiceNumber', sql.NVarChar, invoiceNumber)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('transactionDate', sql.DateTime2, transactionDate)
        .input('status', sql.NVarChar, status)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), finalAmount)
        .input('discount', sql.Decimal(18, 2), discount)
        .input('discountType', sql.NVarChar, discountPercent > 0 ? 'percentage' : null)
        .input('discountValue', sql.Decimal(18, 2), discountPercent > 0 ? discountPercent : null)
        .input('customerPayment', sql.Decimal(18, 2), finalAmount)
        .query(`INSERT INTO Sales (id, store_id, invoice_number, customer_id, transaction_date, status, total_amount, final_amount, discount, discount_type, discount_value, customer_payment) 
                VALUES (@id, @storeId, @invoiceNumber, @customerId, @transactionDate, @status, @totalAmount, @finalAmount, @discount, @discountType, @discountValue, @customerPayment)`);

      // Insert sale items
      for (const item of items) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('salesTransactionId', sql.UniqueIdentifier, saleId)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Decimal(18, 4), item.quantity)
          .input('price', sql.Decimal(18, 2), item.price)
          .query(`INSERT INTO SalesItems (id, sales_transaction_id, product_id, quantity, price) 
                  VALUES (@id, @salesTransactionId, @productId, @quantity, @price)`);
      }
      
      console.log(`   ✅ Created ${invoiceNumber} [${status}] with ${itemCount} items, total: ${finalAmount.toLocaleString('vi-VN')} VND`);
    }

    await closeConnection();
    console.log('\n✅ Sample data seeding completed!\n');
    console.log('Summary:');
    console.log(`  - Categories: ${categoryIds.length}`);
    console.log(`  - Units: ${unitIds.length}`);
    console.log(`  - Suppliers: ${supplierIds.length}`);
    console.log(`  - Customers: ${customerIds.length}`);
    console.log(`  - Products: ${products.length}`);
    console.log(`  - Purchase Orders: ${purchaseCount}`);
    console.log(`  - Sales Transactions: ${salesCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Get store ID from command line argument
const storeId = process.argv[2];
seedSampleData(storeId);
