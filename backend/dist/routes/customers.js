"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const validate_uuid_1 = require("../middleware/validate-uuid");
const customers_sp_repository_1 = require("../repositories/customers-sp-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
/**
 * Calculate loyalty tier based on lifetime points
 * Default thresholds:
 * - Diamond: 10000+ points
 * - Gold: 5000+ points
 * - Silver: 1000+ points
 * - Bronze: < 1000 points
 */
function calculateLoyaltyTier(lifetimePoints) {
    if (lifetimePoints >= 10000)
        return 'diamond';
    if (lifetimePoints >= 5000)
        return 'gold';
    if (lifetimePoints >= 1000)
        return 'silver';
    return 'bronze';
}
// GET /api/customers
// Requirements: 3.4 - Uses sp_Customers_GetByStore
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { page = '1', pageSize = '50', search, status, customerType } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        // Use SP Repository instead of inline query
        let customers = await customers_sp_repository_1.customersSPRepository.getByStore(storeId);
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            customers = customers.filter((c) => c.name?.toLowerCase().includes(searchLower) ||
                c.phone?.toLowerCase().includes(searchLower) ||
                c.email?.toLowerCase().includes(searchLower));
        }
        if (status && status !== 'all') {
            customers = customers.filter((c) => c.status === status);
        }
        if (customerType && customerType !== 'all') {
            customers = customers.filter((c) => c.customerType === customerType);
        }
        // Calculate pagination
        const total = customers.length;
        const totalPages = Math.ceil(total / pageSizeNum);
        const offset = (pageNum - 1) * pageSizeNum;
        const paginatedCustomers = customers.slice(offset, offset + pageSizeNum);
        res.json({
            success: true,
            data: paginatedCustomers.map((c) => {
                const lifetimePoints = c.lifetimePoints ?? 0;
                const debt = c.calculatedDebt ?? c.totalDebt ?? 0;
                return {
                    id: c.id,
                    storeId: c.storeId,
                    email: c.email,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    customerType: c.customerType,
                    customerGroup: c.customerGroup,
                    gender: c.gender,
                    birthday: c.birthday,
                    zalo: c.zalo,
                    bankName: c.bankName,
                    bankAccountNumber: c.bankAccountNumber,
                    bankBranch: c.bankBranch,
                    creditLimit: c.creditLimit ?? 0,
                    status: c.status,
                    loyaltyTier: calculateLoyaltyTier(lifetimePoints), // Use calculated tier
                    loyaltyPoints: c.loyaltyPoints ?? 0,
                    lifetimePoints: lifetimePoints,
                    notes: c.notes,
                    totalDebt: debt,
                    totalPaid: c.totalPaid ?? 0,
                    calculatedDebt: debt,
                    currentDebt: debt,
                    totalPayments: c.totalPaid ?? 0,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                };
            }),
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages,
        });
    }
    catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});
// GET /api/customers/:id
router.get('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const customer = await customers_sp_repository_1.customersSPRepository.getById(id, storeId);
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Calculate tier based on lifetime points (auto-correct if mismatch)
        const lifetimePoints = customer.lifetimePoints ?? 0;
        const calculatedTier = calculateLoyaltyTier(lifetimePoints);
        const debt = customer.calculatedDebt ?? customer.totalDebt ?? 0;
        res.json({
            id: customer.id,
            storeId: customer.storeId,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            customerType: customer.customerType,
            customerGroup: customer.customerGroup,
            gender: customer.gender,
            birthday: customer.birthday,
            zalo: customer.zalo,
            bankName: customer.bankName,
            bankAccountNumber: customer.bankAccountNumber,
            bankBranch: customer.bankBranch,
            creditLimit: customer.creditLimit ?? 0,
            status: customer.status,
            loyaltyTier: calculatedTier, // Use calculated tier instead of stored
            loyaltyPoints: customer.loyaltyPoints ?? 0,
            lifetimePoints: lifetimePoints,
            notes: customer.notes,
            totalDebt: debt,
            currentDebt: debt, // Alias for frontend
            calculatedDebt: debt,
            totalPaid: customer.totalPaid ?? 0,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        });
    }
    catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});
// POST /api/customers
// Requirements: 3.1 - Uses sp_Customers_Create
router.post('/', validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const storeId = req.storeId;
        const { name, email, phone, address, customerType, customerGroup, gender, birthday, zalo, bankName, bankAccountNumber, bankBranch, creditLimit, loyaltyTier, loyaltyPoints, lifetimePoints, status, notes, } = req.body;
        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Customer name is required' });
        }
        const customerId = (0, uuid_1.v4)();
        console.log(`🔄 Creating customer with ID: ${customerId}`);
        // Use SP Repository instead of inline query
        const customer = await customers_sp_repository_1.customersSPRepository.create({
            id: customerId,
            storeId,
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            customerType: customerType || 'personal',
            customerGroup: customerGroup || null,
            gender: gender || null,
            birthday: birthday || null,
            zalo: zalo || null,
            bankName: bankName || null,
            bankAccountNumber: bankAccountNumber || null,
            bankBranch: bankBranch || null,
            creditLimit: creditLimit ?? 0,
            loyaltyTier: loyaltyTier || 'bronze',
            loyaltyPoints: loyaltyPoints ?? 0,
            lifetimePoints: lifetimePoints ?? 0,
            status: status || 'active',
            notes: notes || null,
        });
        res.status(201).json({ id: customer.id, success: true });
    }
    catch (error) {
        console.error('❌ Create customer error:', error);
        // Handle specific database errors
        if (error.message?.includes('UNIQUE KEY constraint')) {
            return res.status(409).json({ error: 'Customer with this information already exists' });
        }
        if (error.message?.includes('Conversion failed')) {
            return res.status(400).json({ error: 'Invalid data format provided' });
        }
        res.status(500).json({ error: 'Failed to create customer', details: error.message });
    }
});
// PUT /api/customers/:id
// Requirements: 3.2 - Uses sp_Customers_Update
router.put('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { name, email, phone, address, customerType, customerGroup, gender, birthday, zalo, bankName, bankAccountNumber, bankBranch, creditLimit, loyaltyTier, loyaltyPoints, lifetimePoints, status, notes, } = req.body;
        console.log(`🔄 Updating customer ${id} for store ${storeId}`);
        console.log('📊 Update data:', JSON.stringify(req.body, null, 2));
        // Use SP Repository instead of inline query
        const customer = await customers_sp_repository_1.customersSPRepository.update(id, storeId, {
            name,
            email: email !== undefined ? email : undefined,
            phone: phone !== undefined ? phone : undefined,
            address: address !== undefined ? address : undefined,
            customerType: customerType !== undefined ? customerType : undefined,
            customerGroup: customerGroup !== undefined ? customerGroup : undefined,
            gender: gender !== undefined ? gender : undefined,
            birthday: birthday !== undefined ? birthday : undefined,
            zalo: zalo !== undefined ? zalo : undefined,
            bankName: bankName !== undefined ? bankName : undefined,
            bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : undefined,
            bankBranch: bankBranch !== undefined ? bankBranch : undefined,
            creditLimit: creditLimit !== undefined ? creditLimit : undefined,
            loyaltyTier: loyaltyTier !== undefined ? loyaltyTier : undefined,
            loyaltyPoints: loyaltyPoints !== undefined ? loyaltyPoints : undefined,
            lifetimePoints: lifetimePoints !== undefined ? lifetimePoints : undefined,
            status: status !== undefined ? status : undefined,
            notes: notes !== undefined ? notes : undefined,
        });
        if (!customer) {
            console.log('❌ Customer not found');
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        console.log('✅ Customer updated successfully');
        res.json(customer);
    }
    catch (error) {
        console.error('❌ Update customer error:', error);
        console.error('📊 Request body:', JSON.stringify(req.body, null, 2));
        console.error('📊 Customer ID:', req.params.id);
        console.error('📊 Store ID:', req.storeId);
        // Handle specific database errors
        if (error.message?.includes('Conversion failed')) {
            return res.status(400).json({ error: 'Invalid data format provided', details: error.message });
        }
        res.status(500).json({ error: 'Failed to update customer', details: error.message });
    }
});
// DELETE /api/customers/:id
// Requirements: 3.3 - Uses sp_Customers_Delete
router.delete('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const user = req.user;
        // Check if force delete is requested (admin only)
        const forceDelete = req.query.force === 'true' || req.body.force === true;
        // Only admin/owner can force delete
        const canForceDelete = ['admin', 'owner'].includes(user.role) && forceDelete;
        console.log(`🔄 Deleting customer ${id} (force: ${canForceDelete})`);
        // Use SP Repository instead of inline query
        const deleted = await customers_sp_repository_1.customersSPRepository.delete(id, storeId, canForceDelete);
        if (!deleted) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        console.log('✅ Customer deleted successfully');
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Delete customer error:', error);
        // Handle specific database errors
        if (error.message?.includes('Cannot delete customer with existing transactions')) {
            return res.status(409).json({
                error: 'Cannot delete customer with existing transactions',
                details: 'This customer has sales or payment records. Only admins can force delete.',
                canForceDelete: ['admin', 'owner'].includes(req.user?.role || '')
            });
        }
        if (error.message?.includes('FOREIGN KEY constraint')) {
            return res.status(409).json({
                error: 'Cannot delete customer with existing transactions',
                details: 'Please remove all sales and payments for this customer first'
            });
        }
        res.status(500).json({ error: 'Failed to delete customer', details: error.message });
    }
});
// PUT /api/customers/:id/debt
// Requirements: 3.5 - Uses sp_Customers_UpdateDebt
router.put('/:id/debt', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { spentAmount, paidAmount } = req.body;
        // Use SP Repository for debt update
        const newDebt = await customers_sp_repository_1.customersSPRepository.updateDebt(id, storeId, spentAmount || 0, paidAmount || 0);
        res.json({ success: true, totalDebt: newDebt });
    }
    catch (error) {
        console.error('Update customer debt error:', error);
        res.status(500).json({ error: 'Failed to update customer debt' });
    }
});
// GET /api/customers/:id/history
// Requirements: 3.6 - Uses sp_Customers_GetDebtHistory
router.get('/:id/history', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Get customer to validate it exists
        const customer = await customers_sp_repository_1.customersSPRepository.getById(id, storeId);
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Get debt history
        const history = await customers_sp_repository_1.customersSPRepository.getDebtHistory(id, storeId);
        res.json({
            success: true,
            customerId: id,
            history,
        });
    }
    catch (error) {
        console.error('Get customer debt history error:', error);
        res.status(500).json({ error: 'Failed to get customer debt history' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map