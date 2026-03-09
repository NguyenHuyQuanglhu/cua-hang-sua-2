"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDataService = exports.SyncDataService = exports.SAMPLE_CUSTOMERS = exports.SUPPLIERS_BY_STORE_TYPE = exports.UNITS_BY_STORE_TYPE = void 0;
const db_1 = require("../db");
// Dữ liệu mẫu đơn vị tính theo loại cửa hàng
exports.UNITS_BY_STORE_TYPE = {
    toy: [
        { name: 'Cái', description: 'Đơn vị đếm từng cái' },
        { name: 'Bộ', description: 'Bộ sản phẩm hoàn chỉnh' },
        { name: 'Hộp', description: 'Hộp đóng gói' },
        { name: 'Thùng', description: 'Thùng carton lớn' },
        { name: 'Set', description: 'Set combo nhiều món' },
        { name: 'Pack', description: 'Gói nhỏ' },
    ],
    retail: [
        { name: 'Cái', description: 'Đơn vị đếm từng cái' },
        { name: 'Chiếc', description: 'Đơn vị đếm từng chiếc' },
        { name: 'Hộp', description: 'Hộp đóng gói' },
        { name: 'Thùng', description: 'Thùng carton' },
        { name: 'Kg', description: 'Kilogram' },
        { name: 'Lít', description: 'Lít' },
    ],
    food: [
        { name: 'Kg', description: 'Kilogram' },
        { name: 'Gram', description: 'Gram' },
        { name: 'Lít', description: 'Lít' },
        { name: 'Chai', description: 'Chai' },
        { name: 'Lon', description: 'Lon' },
        { name: 'Gói', description: 'Gói' },
        { name: 'Hộp', description: 'Hộp' },
    ],
    pharmacy: [
        { name: 'Viên', description: 'Viên thuốc' },
        { name: 'Vỉ', description: 'Vỉ thuốc' },
        { name: 'Hộp', description: 'Hộp thuốc' },
        { name: 'Chai', description: 'Chai thuốc nước' },
        { name: 'Tuýp', description: 'Tuýp kem/gel' },
        { name: 'Gói', description: 'Gói thuốc bột' },
        { name: 'Ống', description: 'Ống tiêm' },
    ],
    electronics: [
        { name: 'Cái', description: 'Đơn vị đếm từng cái' },
        { name: 'Bộ', description: 'Bộ sản phẩm hoàn chỉnh' },
        { name: 'Chiếc', description: 'Đơn vị đếm từng chiếc' },
        { name: 'Hộp', description: 'Hộp đóng gói' },
        { name: 'Set', description: 'Set combo phụ kiện' },
    ],
    fashion: [
        { name: 'Cái', description: 'Đơn vị đếm từng cái' },
        { name: 'Đôi', description: 'Đôi (giày, dép, tất)' },
        { name: 'Bộ', description: 'Bộ quần áo' },
        { name: 'Chiếc', description: 'Đơn vị đếm từng chiếc' },
        { name: 'Set', description: 'Set combo thời trang' },
    ],
    default: [
        { name: 'Cái', description: 'Đơn vị đếm từng cái' },
        { name: 'Hộp', description: 'Hộp đóng gói' },
        { name: 'Thùng', description: 'Thùng carton' },
        { name: 'Kg', description: 'Kilogram' },
        { name: 'Bộ', description: 'Bộ sản phẩm' },
    ],
};
// Dữ liệu mẫu nhà cung cấp theo loại cửa hàng
exports.SUPPLIERS_BY_STORE_TYPE = {
    toy: [
        { name: 'Bandai Namco Vietnam', phone: '028-1234-5678', address: 'Quận 1, TP.HCM', contactPerson: 'Nguyễn Văn A' },
        { name: 'Hobby Link Japan', phone: '+81-3-9876-5432', address: 'Tokyo, Japan', contactPerson: 'Tanaka San' },
        { name: 'Premium Bandai Japan', phone: '+81-3-1234-5678', address: 'Osaka, Japan', contactPerson: 'Yamamoto San' },
        { name: 'Good Smile Company', phone: '+81-3-5555-1234', address: 'Tokyo, Japan', contactPerson: 'Suzuki San' },
        { name: 'Kotobukiya Vietnam', phone: '028-9999-8888', address: 'Quận 7, TP.HCM', contactPerson: 'Trần Văn B' },
    ],
    retail: [
        { name: 'Công ty TNHH Phân phối ABC', phone: '028-3333-4444', address: 'Quận Bình Thạnh, TP.HCM', contactPerson: 'Lê Văn C' },
        { name: 'Nhà phân phối XYZ', phone: '024-5555-6666', address: 'Quận Cầu Giấy, Hà Nội', contactPerson: 'Phạm Thị D' },
        { name: 'Đại lý Miền Nam', phone: '028-7777-8888', address: 'Quận Tân Bình, TP.HCM', contactPerson: 'Hoàng Văn E' },
    ],
    food: [
        { name: 'Công ty Thực phẩm Sạch', phone: '028-1111-2222', address: 'Quận 12, TP.HCM', contactPerson: 'Ngô Văn F' },
        { name: 'Nông trại Organic', phone: '0263-333-4444', address: 'Đà Lạt, Lâm Đồng', contactPerson: 'Đặng Thị G' },
        { name: 'Nhà cung cấp Hải sản', phone: '0259-555-6666', address: 'Nha Trang, Khánh Hòa', contactPerson: 'Võ Văn H' },
    ],
    pharmacy: [
        { name: 'Công ty Dược phẩm Hậu Giang', phone: '0292-3861-234', address: 'TP. Cần Thơ', contactPerson: 'Nguyễn Thị I' },
        { name: 'Dược phẩm Imexpharm', phone: '028-3829-1234', address: 'Quận 3, TP.HCM', contactPerson: 'Trần Văn K' },
        { name: 'Công ty Dược Sài Gòn', phone: '028-3822-5678', address: 'Quận 1, TP.HCM', contactPerson: 'Lê Thị L' },
        { name: 'Nhà thuốc Trung ương', phone: '024-3825-9999', address: 'Quận Hoàn Kiếm, Hà Nội', contactPerson: 'Phạm Văn M' },
    ],
    electronics: [
        { name: 'Công ty Điện tử Samsung Vietnam', phone: '028-3812-3456', address: 'Quận 1, TP.HCM', contactPerson: 'Kim Văn N' },
        { name: 'Nhà phân phối Apple Việt Nam', phone: '028-3815-7890', address: 'Quận 3, TP.HCM', contactPerson: 'Nguyễn Văn O' },
        { name: 'Công ty Phụ kiện Điện tử', phone: '028-3818-1234', address: 'Quận Tân Bình, TP.HCM', contactPerson: 'Trần Thị P' },
    ],
    fashion: [
        { name: 'Công ty May mặc Việt Tiến', phone: '028-3850-1234', address: 'Quận Tân Bình, TP.HCM', contactPerson: 'Hoàng Văn Q' },
        { name: 'Nhà cung cấp Thời trang Hàn Quốc', phone: '028-3852-5678', address: 'Quận 1, TP.HCM', contactPerson: 'Park Văn R' },
        { name: 'Xưởng Giày dép Bình Dương', phone: '0274-3821-999', address: 'TP. Thủ Dầu Một, Bình Dương', contactPerson: 'Lê Văn S' },
    ],
    default: [
        { name: 'Nhà cung cấp A', phone: '028-1234-5678', address: 'TP.HCM', contactPerson: 'Nguyễn Văn A' },
        { name: 'Nhà cung cấp B', phone: '024-8765-4321', address: 'Hà Nội', contactPerson: 'Trần Văn B' },
    ],
};
// Dữ liệu mẫu khách hàng
exports.SAMPLE_CUSTOMERS = [
    { name: 'Nguyễn Văn Minh', phone: '0901234567', email: 'minh.nguyen@email.com', address: 'Quận 1, TP.HCM', customerType: 'retail' },
    { name: 'Trần Thị Hương', phone: '0912345678', email: 'huong.tran@email.com', address: 'Quận 3, TP.HCM', customerType: 'retail' },
    { name: 'Lê Hoàng Nam', phone: '0923456789', email: 'nam.le@email.com', address: 'Quận 7, TP.HCM', customerType: 'wholesale' },
    { name: 'Phạm Thị Lan', phone: '0934567890', email: 'lan.pham@email.com', address: 'Quận Bình Thạnh, TP.HCM', customerType: 'retail' },
    { name: 'Hoàng Văn Đức', phone: '0945678901', email: 'duc.hoang@email.com', address: 'Quận Tân Bình, TP.HCM', customerType: 'wholesale' },
    { name: 'Võ Thị Mai', phone: '0956789012', email: 'mai.vo@email.com', address: 'Quận Gò Vấp, TP.HCM', customerType: 'retail' },
    { name: 'Đặng Minh Tuấn', phone: '0967890123', email: 'tuan.dang@email.com', address: 'Quận 10, TP.HCM', customerType: 'vip' },
    { name: 'Ngô Thị Hồng', phone: '0978901234', email: 'hong.ngo@email.com', address: 'Quận Phú Nhuận, TP.HCM', customerType: 'retail' },
    { name: 'Bùi Văn Thắng', phone: '0989012345', email: 'thang.bui@email.com', address: 'Quận 2, TP.HCM', customerType: 'vip' },
    { name: 'Công ty TNHH ABC', phone: '028-3456-7890', email: 'contact@abc.com', address: 'Quận 1, TP.HCM', customerType: 'wholesale' },
];
class SyncDataService {
    /**
     * Sync all customer accounts - recalculate total_spent, total_paid, total_debt from Sales data
     * This calculates debt from Sales table and returns the results
     */
    async syncCustomerAccounts(storeId) {
        const result = {
            totalCustomers: 0,
            updatedCustomers: 0,
            details: [],
        };
        // Get all customers for the store
        const customers = await (0, db_1.query)(`SELECT id, full_name as name FROM Customers WHERE store_id = @storeId`, { storeId });
        result.totalCustomers = customers.length;
        // Get aggregated sales data for all customers
        const salesAggregation = await (0, db_1.query)(`SELECT 
          customer_id,
          COALESCE(SUM(final_amount), 0) as total_sales_amount,
          COALESCE(SUM(customer_payment), 0) as total_customer_payment,
          COALESCE(SUM(remaining_debt), 0) as total_remaining_debt
       FROM Sales 
       WHERE store_id = @storeId 
         AND customer_id IS NOT NULL
         AND status IN ('completed', 'printed', 'unprinted')
       GROUP BY customer_id`, { storeId });
        // Create a map for quick lookup
        const salesMap = new Map();
        for (const agg of salesAggregation) {
            salesMap.set(agg.customer_id, agg);
        }
        // Process each customer
        for (const customer of customers) {
            const salesData = salesMap.get(customer.id);
            if (salesData) {
                const newTotalSpent = salesData.total_sales_amount ?? 0;
                const newTotalPaid = salesData.total_customer_payment ?? 0;
                const newTotalDebt = newTotalSpent - newTotalPaid;
                result.updatedCustomers++;
                result.details.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    oldValues: {
                        totalSpent: 0,
                        totalPaid: 0,
                        totalDebt: 0,
                    },
                    newValues: {
                        totalSpent: newTotalSpent,
                        totalPaid: newTotalPaid,
                        totalDebt: newTotalDebt,
                    },
                });
            }
        }
        return result;
    }
    /**
     * Generate a unique order number
     */
    generateOrderNumber() {
        return `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }
    /**
     * Generate a unique invoice number
     */
    generateInvoiceNumber() {
        return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }
    /**
     * Get store info by ID
     */
    async getStoreInfo(storeId) {
        return (0, db_1.queryOne)('SELECT id, name, business_type FROM Stores WHERE id = @storeId', { storeId });
    }
    /**
     * Sync units for a store based on business type
     */
    async syncUnits(storeId, storeType) {
        const result = { added: 0, existing: 0 };
        const unitsToAdd = exports.UNITS_BY_STORE_TYPE[storeType] || exports.UNITS_BY_STORE_TYPE.default;
        for (const unit of unitsToAdd) {
            const existing = await (0, db_1.queryOne)('SELECT id FROM Units WHERE store_id = @storeId AND name = @name', { storeId, name: unit.name });
            if (!existing) {
                await (0, db_1.query)(`INSERT INTO Units (id, store_id, name, description, created_at, updated_at)
           VALUES (NEWID(), @storeId, @name, @description, GETDATE(), GETDATE())`, { storeId, name: unit.name, description: unit.description });
                result.added++;
            }
            else {
                result.existing++;
            }
        }
        return result;
    }
    /**
     * Sync suppliers for a store based on business type
     */
    async syncSuppliers(storeId, storeType) {
        const result = { added: 0, existing: 0 };
        const suppliersToAdd = exports.SUPPLIERS_BY_STORE_TYPE[storeType] || exports.SUPPLIERS_BY_STORE_TYPE.default;
        for (const supplier of suppliersToAdd) {
            const existing = await (0, db_1.queryOne)('SELECT id FROM Suppliers WHERE store_id = @storeId AND name = @name', { storeId, name: supplier.name });
            if (!existing) {
                await (0, db_1.query)(`INSERT INTO Suppliers (id, store_id, name, phone, address, contact_person, created_at, updated_at)
           VALUES (NEWID(), @storeId, @name, @phone, @address, @contactPerson, GETDATE(), GETDATE())`, { storeId, ...supplier });
                result.added++;
            }
            else {
                result.existing++;
            }
        }
        return result;
    }
    /**
     * Sync customers for a store
     */
    async syncCustomers(storeId) {
        const result = { added: 0, existing: 0 };
        for (const customer of exports.SAMPLE_CUSTOMERS) {
            const existing = await (0, db_1.queryOne)('SELECT id FROM Customers WHERE store_id = @storeId AND phone = @phone', { storeId, phone: customer.phone });
            if (!existing) {
                await (0, db_1.query)(`INSERT INTO Customers (id, store_id, name, phone, email, address, customer_type, loyalty_tier, total_spent, total_paid, total_debt, created_at, updated_at)
           VALUES (NEWID(), @storeId, @name, @phone, @email, @address, @customerType, 'bronze', 0, 0, 0, GETDATE(), GETDATE())`, { storeId, ...customer });
                result.added++;
            }
            else {
                result.existing++;
            }
        }
        return result;
    }
    /**
     * Create sample purchase orders for suppliers
     */
    async syncPurchaseOrders(storeId) {
        const result = { added: 0 };
        const suppliers = await (0, db_1.query)('SELECT id, name FROM Suppliers WHERE store_id = @storeId', { storeId });
        const products = await (0, db_1.query)('SELECT id, name, cost FROM Products WHERE store_id = @storeId', { storeId });
        if (products.length === 0) {
            return result;
        }
        for (const supplier of suppliers) {
            const existingPurchase = await (0, db_1.queryOne)('SELECT COUNT(*) as count FROM PurchaseOrders WHERE SupplierId = @supplierId AND StoreId = @storeId', { supplierId: supplier.id, storeId });
            if (!existingPurchase || existingPurchase.count === 0) {
                // Create 2-3 purchase orders
                const numOrders = Math.floor(Math.random() * 2) + 2;
                let totalPurchaseAmount = 0;
                for (let i = 0; i < numOrders; i++) {
                    const orderNumber = this.generateOrderNumber();
                    const daysAgo = Math.floor(Math.random() * 60) + 1;
                    const importDate = new Date();
                    importDate.setDate(importDate.getDate() - daysAgo);
                    const numProducts = Math.min(Math.floor(Math.random() * 4) + 2, products.length);
                    const shuffledProducts = [...products].sort(() => Math.random() - 0.5).slice(0, numProducts);
                    let orderTotal = 0;
                    const orderItems = [];
                    for (const product of shuffledProducts) {
                        const quantity = Math.floor(Math.random() * 50) + 10;
                        const cost = product.cost || Math.floor(Math.random() * 500000) + 50000;
                        orderTotal += quantity * cost;
                        orderItems.push({ productId: product.id, quantity, cost });
                    }
                    const purchaseResult = await (0, db_1.query)(`INSERT INTO PurchaseOrders (Id, StoreId, OrderNumber, SupplierId, ImportDate, TotalAmount, Notes, CreatedAt, UpdatedAt)
             OUTPUT INSERTED.Id
             VALUES (NEWID(), @storeId, @orderNumber, @supplierId, @importDate, @totalAmount, @notes, GETDATE(), GETDATE())`, {
                        storeId,
                        orderNumber,
                        supplierId: supplier.id,
                        importDate: importDate.toISOString(),
                        totalAmount: orderTotal,
                        notes: `Đơn nhập hàng từ ${supplier.name}`,
                    });
                    const purchaseId = purchaseResult[0].Id;
                    for (const item of orderItems) {
                        await (0, db_1.query)(`INSERT INTO PurchaseOrderItems (Id, PurchaseOrderId, ProductId, Quantity, Cost, CreatedAt)
               VALUES (NEWID(), @purchaseOrderId, @productId, @quantity, @cost, GETDATE())`, { purchaseOrderId: purchaseId, productId: item.productId, quantity: item.quantity, cost: item.cost });
                    }
                    totalPurchaseAmount += orderTotal;
                    result.added++;
                }
                // Create partial payment (50-80%)
                const paymentPercentage = (Math.random() * 30 + 50) / 100;
                const paymentAmount = Math.floor(totalPurchaseAmount * paymentPercentage);
                if (paymentAmount > 0) {
                    await (0, db_1.query)(`INSERT INTO SupplierPayments (Id, StoreId, SupplierId, PaymentDate, Amount, Notes, CreatedAt)
             VALUES (NEWID(), @storeId, @supplierId, GETDATE(), @amount, @notes, GETDATE())`, { storeId, supplierId: supplier.id, amount: paymentAmount, notes: `Thanh toán cho ${supplier.name}` });
                }
            }
        }
        return result;
    }
    /**
     * Create sample sales for customers
     */
    async syncSales(storeId) {
        const result = { added: 0 };
        const customers = await (0, db_1.query)('SELECT id, name FROM Customers WHERE store_id = @storeId', { storeId });
        const products = await (0, db_1.query)('SELECT id, name, cost FROM Products WHERE store_id = @storeId', { storeId });
        if (products.length === 0 || customers.length === 0) {
            return result;
        }
        // Only first 5 customers
        for (const customer of customers.slice(0, 5)) {
            const existingSale = await (0, db_1.queryOne)('SELECT COUNT(*) as count FROM Sales WHERE CustomerId = @customerId AND StoreId = @storeId', { customerId: customer.id, storeId });
            if (!existingSale || existingSale.count === 0) {
                // Create 1-3 sales
                const numSales = Math.floor(Math.random() * 3) + 1;
                let totalSpent = 0;
                for (let i = 0; i < numSales; i++) {
                    const invoiceNumber = this.generateInvoiceNumber();
                    const daysAgo = Math.floor(Math.random() * 30) + 1;
                    const transactionDate = new Date();
                    transactionDate.setDate(transactionDate.getDate() - daysAgo);
                    const numProducts = Math.min(Math.floor(Math.random() * 3) + 1, products.length);
                    const shuffledProducts = [...products].sort(() => Math.random() - 0.5).slice(0, numProducts);
                    let saleTotal = 0;
                    const saleItems = [];
                    for (const product of shuffledProducts) {
                        const quantity = Math.floor(Math.random() * 5) + 1;
                        const price = (product.cost || 100000) * 1.3; // 30% markup
                        saleTotal += quantity * price;
                        saleItems.push({ productId: product.id, quantity, price });
                    }
                    // Random payment (70-100% of total)
                    const paymentPercentage = (Math.random() * 30 + 70) / 100;
                    const customerPayment = Math.floor(saleTotal * paymentPercentage);
                    const remainingDebt = saleTotal - customerPayment;
                    const saleResult = await (0, db_1.query)(`INSERT INTO Sales (Id, StoreId, InvoiceNumber, CustomerId, TransactionDate, Status, TotalAmount, FinalAmount, CustomerPayment, RemainingDebt, CreatedAt, UpdatedAt)
             OUTPUT INSERTED.Id
             VALUES (NEWID(), @storeId, @invoiceNumber, @customerId, @transactionDate, 'completed', @totalAmount, @finalAmount, @customerPayment, @remainingDebt, GETDATE(), GETDATE())`, {
                        storeId,
                        invoiceNumber,
                        customerId: customer.id,
                        transactionDate: transactionDate.toISOString(),
                        totalAmount: saleTotal,
                        finalAmount: saleTotal,
                        customerPayment,
                        remainingDebt,
                    });
                    const saleId = saleResult[0].Id;
                    for (const item of saleItems) {
                        await (0, db_1.query)(`INSERT INTO SalesItems (Id, SalesTransactionId, ProductId, Quantity, Price, CreatedAt)
               VALUES (NEWID(), @saleId, @productId, @quantity, @price, GETDATE())`, { saleId, productId: item.productId, quantity: item.quantity, price: item.price });
                    }
                    totalSpent += saleTotal;
                    result.added++;
                }
                // Update customer totals
                await (0, db_1.query)(`UPDATE Customers SET 
            total_spent = COALESCE(total_spent, 0) + @totalSpent,
            updated_at = GETDATE()
           WHERE id = @customerId`, { customerId: customer.id, totalSpent });
            }
        }
        return result;
    }
    /**
     * Sync all sample data for a store
     */
    async syncAllData(storeId) {
        const store = await this.getStoreInfo(storeId);
        const storeType = store?.business_type?.toLowerCase() || 'default';
        console.log(`Syncing data for store: ${store?.name} (type: ${storeType})`);
        const results = {
            units: { added: 0, existing: 0 },
            suppliers: { added: 0, existing: 0 },
            customers: { added: 0, existing: 0 },
            purchases: { added: 0 },
            sales: { added: 0 },
        };
        // 1. Sync Units
        results.units = await this.syncUnits(storeId, storeType);
        // 2. Sync Suppliers
        results.suppliers = await this.syncSuppliers(storeId, storeType);
        // 3. Sync Customers
        results.customers = await this.syncCustomers(storeId);
        // 4. Create sample purchases
        results.purchases = await this.syncPurchaseOrders(storeId);
        // 5. Create sample sales
        results.sales = await this.syncSales(storeId);
        return results;
    }
}
exports.SyncDataService = SyncDataService;
exports.syncDataService = new SyncDataService();
//# sourceMappingURL=sync-data-service.js.map