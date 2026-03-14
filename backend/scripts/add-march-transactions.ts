import { query } from '../src/db';

async function addMarchTransactions() {
  try {
    console.log('=== Adding sample transactions for March 2026 ===\n');

    // Get first store
    const stores = await query(`SELECT TOP 1 id FROM Stores`, {});
    if (!stores || stores.length === 0) {
      console.log('No stores found');
      return;
    }
    const storeId = (stores[0] as any).id;
    console.log('Using store:', storeId);

    // Get first supplier
    const suppliers = await query(
      `SELECT TOP 1 id, name FROM Suppliers WHERE store_id = @storeId`,
      { storeId }
    );
    if (!suppliers || suppliers.length === 0) {
      console.log('No suppliers found');
      return;
    }
    const supplierId = (suppliers[0] as any).id;
    const supplierName = (suppliers[0] as any).name;
    console.log('Using supplier:', supplierName);

    // Get first customer
    const customers = await query(
      `SELECT TOP 1 id, full_name FROM Customers WHERE store_id = @storeId`,
      { storeId }
    );
    if (!customers || customers.length === 0) {
      console.log('No customers found');
      return;
    }
    const customerId = (customers[0] as any).id;
    const customerName = (customers[0] as any).full_name;
    console.log('Using customer:', customerName);

    // Add a purchase order
    const purchaseId = crypto.randomUUID();
    await query(
      `INSERT INTO PurchaseOrders (
        id, store_id, supplier_id, invoice_number, import_date, 
        total_amount, paid_amount, remaining_debt, payment_status, 
        notes, created_at, updated_at
      ) VALUES (
        @purchaseId, @storeId, @supplierId, @invoiceNumber, @importDate,
        @totalAmount, @paidAmount, @remainingDebt, @paymentStatus,
        @notes, GETDATE(), GETDATE()
      )`,
      {
        purchaseId,
        storeId,
        supplierId,
        invoiceNumber: 'PO202603150001',
        importDate: '2026-03-15',
        totalAmount: 5000000,
        paidAmount: 2000000,
        remainingDebt: 3000000,
        paymentStatus: 'partial',
        notes: 'Nhập hàng tháng 3'
      }
    );
    console.log('✓ Added purchase order: 5,000,000 VND');

    // Add a customer payment
    const paymentId = crypto.randomUUID();
    await query(
      `INSERT INTO Payments (
        Id, StoreId, CustomerId, Amount, PaymentDate, Notes, CreatedAt
      ) VALUES (
        @paymentId, @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE()
      )`,
      {
        paymentId,
        storeId,
        customerId,
        amount: 1500000,
        paymentDate: '2026-03-10',
        notes: 'Thanh toán công nợ tháng 3'
      }
    );
    console.log('✓ Added customer payment: 1,500,000 VND');

    // Add a supplier payment
    const supplierPaymentId = crypto.randomUUID();
    await query(
      `INSERT INTO SupplierPayments (
        id, store_id, supplier_id, purchase_id, amount, 
        payment_date, payment_method, notes, created_at
      ) VALUES (
        @paymentId, @storeId, @supplierId, @purchaseId, @amount,
        @paymentDate, @paymentMethod, @notes, GETDATE()
      )`,
      {
        paymentId: supplierPaymentId,
        storeId,
        supplierId,
        purchaseId,
        amount: 2000000,
        paymentDate: '2026-03-15',
        paymentMethod: 'cash',
        notes: 'Trả tiền nhập hàng'
      }
    );
    console.log('✓ Added supplier payment: 2,000,000 VND');

    console.log('\n=== Summary ===');
    console.log('Chi phí nhập hàng: 5,000,000 VND');
    console.log('Thu từ khách hàng: 1,500,000 VND');
    console.log('Trả nhà cung cấp: 2,000,000 VND');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

addMarchTransactions();
