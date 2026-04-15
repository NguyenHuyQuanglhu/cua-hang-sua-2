import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to map database record to API response
function mapStoreToResponse(s: Record<string, unknown>) {
  return {
    id: s.id,
    ownerId: s.owner_id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    logoUrl: s.logo_url,
    address: s.address,
    phone: s.phone,
    businessType: s.business_type,
    domain: s.domain,
    status: s.status,
    settings: s.settings,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// GET /api/stores
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let stores;
    
    // Owner and company_manager can see all stores
    if (userRole === 'owner' || userRole === 'company_manager' || userRole === 'admin') {
      stores = await query(
        `SELECT * FROM Stores WHERE status = 'active' ORDER BY name`,
        {}
      );
    } else {
      // Other roles only see assigned stores
      stores = await query(
        `SELECT s.* FROM Stores s
         INNER JOIN UserStores us ON s.id = us.store_id
         WHERE us.user_id = @userId AND s.status = 'active'
         ORDER BY s.name`,
        { userId }
      );
    }

    res.json(stores.map(mapStoreToResponse));
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to get stores' });
  }
});

// POST /api/stores - Create a new store
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const tenantId = req.user!.tenantId;
    const { name, description, address, phone, businessType } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Tên cửa hàng là bắt buộc' });
      return;
    }

    if (name.length > 255) {
      res.status(400).json({ error: 'Tên cửa hàng không được quá 255 ký tự' });
      return;
    }

    // Check store limit for this user from Users table
    const userLimits = await queryOne<{ max_stores: number }>(
      'SELECT ISNULL(max_stores, 999) as max_stores FROM Users WHERE id = @userId',
      { userId }
    );
    const maxStores = userLimits?.max_stores || 999;

    // Count current stores the user has access to
    const currentStoreCount = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT us.store_id) as count
       FROM UserStores us
       INNER JOIN Stores s ON us.store_id = s.id
       WHERE us.user_id = @userId AND s.status = 'active'`,
      { userId }
    );

    if (currentStoreCount && currentStoreCount.count >= maxStores) {
      res.status(403).json({
        error: `Bạn đã đạt giới hạn ${maxStores} cửa hàng. Vui lòng nâng cấp gói để tạo thêm cửa hàng.`,
        errorCode: 'STORE_LIMIT_REACHED',
        maxStores: maxStores,
        currentStores: currentStoreCount.count
      });
      return;
    }

    // Find or create StoreOwner for this user
    let storeOwner = await queryOne<{ id: string }>(
      'SELECT id FROM StoreOwners WHERE email = @email',
      { email: userEmail }
    );

    if (!storeOwner) {
      // Create StoreOwner record for this user
      const user = await queryOne<{ display_name: string }>(
        'SELECT display_name FROM Users WHERE id = @userId',
        { userId }
      );
      
      storeOwner = await insert<{ id: string }>(
        'StoreOwners',
        {
          id: uuidv4(),
          email: userEmail,
          password_hash: 'linked_to_user', // Placeholder since auth is via Users table
          full_name: user?.display_name || userEmail,
          created_at: new Date(),
          updated_at: new Date(),
        }
      );
    }

    if (!storeOwner) {
      res.status(500).json({ error: 'Failed to create store owner' });
      return;
    }

    // Generate slug from name
    let slug = generateSlug(name.trim());
    
    // Check if slug already exists and make it unique
    const existingSlug = await queryOne(
      'SELECT id FROM Stores WHERE slug = @slug',
      { slug }
    );
    
    if (existingSlug) {
      // Append timestamp to make slug unique
      slug = `${slug}-${Date.now()}`;
    }

    // Insert the new store
    const storeId = uuidv4();
    const newStore = await insert<Record<string, unknown>>(
      'Stores',
      {
        id: storeId,
        owner_id: storeOwner.id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        business_type: businessType?.trim() || null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }
    );

    if (!newStore) {
      res.status(500).json({ error: 'Failed to create store' });
      return;
    }

    // Add the creator to UserStores with owner role
    await insert(
      'UserStores',
      {
        id: uuidv4(),
        user_id: userId,
        store_id: storeId,
        role: 'owner',
        created_at: new Date(),
        updated_at: new Date(),
      }
    );

    res.status(201).json(mapStoreToResponse(newStore));
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// GET /api/stores/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const s = await queryOne(
      `SELECT s.* FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE s.id = @id AND us.user_id = @userId`,
      { id, userId }
    );

    if (!s) {
      res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
      return;
    }

    res.json(mapStoreToResponse(s as Record<string, unknown>));
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Failed to get store' });
  }
});

// PUT /api/stores/:id - Update store information
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { name, description, address, phone, businessType, status } = req.body;

    // Check if store exists
    const store = await queryOne<Record<string, unknown>>(
      'SELECT * FROM Stores WHERE id = @id',
      { id }
    );

    if (!store) {
      res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
      return;
    }

    // Check permission: admin can edit all stores, others must be owner
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    if (!isAdmin && store.owner_id !== userId) {
      res.status(403).json({ error: 'Bạn không có quyền quản lý cửa hàng này' });
      return;
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Tên cửa hàng là bắt buộc' });
        return;
      }
      if (name.length > 255) {
        res.status(400).json({ error: 'Tên cửa hàng không được quá 255 ký tự' });
        return;
      }
    }

    // Validate status if provided
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      res.status(400).json({ error: 'Trạng thái không hợp lệ' });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      // Update slug if name changes
      let newSlug = generateSlug(name.trim());
      const existingSlug = await queryOne(
        'SELECT id FROM Stores WHERE slug = @slug AND id != @id',
        { slug: newSlug, id }
      );
      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      updateData.slug = newSlug;
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (businessType !== undefined) updateData.business_type = businessType?.trim() || null;
    if (status !== undefined) updateData.status = status;

    // Execute update
    const setClauses = Object.keys(updateData)
      .map(col => `${col} = @${col}`)
      .join(', ');

    const updatedStore = await queryOne<Record<string, unknown>>(
      `UPDATE Stores SET ${setClauses} OUTPUT INSERTED.* WHERE id = @id`,
      { ...updateData, id }
    );

    if (!updatedStore) {
      res.status(500).json({ error: 'Failed to update store' });
      return;
    }

    res.json(mapStoreToResponse(updatedStore));
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// DELETE /api/stores/:id - Deactivate store (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user has access to the store
    const userStore = await queryOne<{ role: string }>(
      'SELECT role FROM UserStores WHERE store_id = @id AND user_id = @userId',
      { id, userId }
    );

    if (!userStore) {
      res.status(403).json({ error: 'Bạn không có quyền quản lý cửa hàng này' });
      return;
    }

    const store = await queryOne<Record<string, unknown>>(
      'SELECT * FROM Stores WHERE id = @id',
      { id }
    );

    if (!store) {
      res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
      return;
    }

    // Soft delete - set status to inactive
    const deactivatedStore = await queryOne<Record<string, unknown>>(
      `UPDATE Stores 
       SET status = 'inactive', updated_at = @updatedAt 
       OUTPUT INSERTED.* 
       WHERE id = @id`,
      { id, updatedAt: new Date() }
    );

    if (!deactivatedStore) {
      res.status(500).json({ error: 'Failed to deactivate store' });
      return;
    }

    res.json(mapStoreToResponse(deactivatedStore));
  } catch (error) {
    console.error('Deactivate store error:', error);
    res.status(500).json({ error: 'Failed to deactivate store' });
  }
});

// POST /api/stores/sync - Sync user with all active stores
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get all active stores
    const allStores = await query(
      `SELECT id, name FROM Stores WHERE status = 'active'`
    );

    // Get stores user already has access to
    const userStores = await query(
      `SELECT store_id FROM UserStores WHERE user_id = @userId`,
      { userId }
    );
    const existingStoreIds = new Set(
      userStores.map((us: Record<string, unknown>) => us.store_id as string)
    );

    // Add user to stores they don't have access to
    const addedStores: string[] = [];
    for (const store of allStores) {
      const storeRecord = store as { id: string; name: string };
      if (!existingStoreIds.has(storeRecord.id)) {
        await insert('UserStores', {
          id: uuidv4(),
          user_id: userId,
          store_id: storeRecord.id,
          role: userRole === 'admin' ? 'manager' : 'staff',
          created_at: new Date(),
          updated_at: new Date(),
        });
        addedStores.push(storeRecord.name);
      }
    }

    // Return updated store list
    const stores = await query(
      `SELECT s.* FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE us.user_id = @userId AND s.status = 'active'
       ORDER BY s.name`,
      { userId }
    );

    res.json({
      success: true,
      message: addedStores.length > 0 
        ? `Đã thêm quyền truy cập: ${addedStores.join(', ')}`
        : 'Dữ liệu đã đồng bộ',
      stores: stores.map(mapStoreToResponse),
      addedStores,
    });
  } catch (error) {
    console.error('Sync stores error:', error);
    res.status(500).json({ error: 'Failed to sync stores' });
  }
});

// DELETE /api/stores/:id/permanent - Permanently delete store
router.delete('/:id/permanent', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Require confirm=true query param
    if (confirm !== 'true') {
      res.status(400).json({ error: 'Vui lòng xác nhận xóa vĩnh viễn' });
      return;
    }

    // Check if user is admin OR owner of the store
    const isSystemAdmin = userRole === 'admin';
    
    if (!isSystemAdmin) {
      const userStore = await queryOne<{ role: string }>(
        'SELECT role FROM UserStores WHERE store_id = @id AND user_id = @userId',
        { id, userId }
      );

      if (!userStore || userStore.role !== 'owner') {
        res.status(403).json({ error: 'Chỉ quản trị viên hoặc chủ cửa hàng mới có quyền xóa vĩnh viễn' });
        return;
      }
    }

    const store = await queryOne<Record<string, unknown>>(
      'SELECT * FROM Stores WHERE id = @id',
      { id }
    );

    if (!store) {
      res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
      return;
    }

    // Count related data for response
    const productCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM Products WHERE store_id = @id',
      { id }
    );
    const orderCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM Sales WHERE store_id = @id',
      { id }
    );
    const customerCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM Customers WHERE store_id = @id',
      { id }
    );

    // Delete related data in correct order (respecting foreign key constraints)
    try {
      // Delete sale items first (depends on Sales) - table is SalesItems with sales_transaction_id
      await query('DELETE FROM SalesItems WHERE sales_transaction_id IN (SELECT id FROM Sales WHERE store_id = @id)', { id });
      // Delete purchase items (depends on Purchases)
      await query('DELETE FROM PurchaseItems WHERE purchase_id IN (SELECT id FROM Purchases WHERE store_id = @id)', { id });
      // Delete payments (has store_id directly)
      await query('DELETE FROM Payments WHERE store_id = @id', { id });
      // Delete supplier payments (has store_id directly)
      await query('DELETE FROM SupplierPayments WHERE store_id = @id', { id });
      // Delete cash flow transactions
      await query('DELETE FROM CashFlow WHERE store_id = @id', { id });
      // Delete shifts
      await query('DELETE FROM Shifts WHERE store_id = @id', { id });
      // Delete sales
      await query('DELETE FROM Sales WHERE store_id = @id', { id });
      // Delete purchases
      await query('DELETE FROM Purchases WHERE store_id = @id', { id });
      // Delete inventory
      await query('DELETE FROM Inventory WHERE store_id = @id', { id }).catch(() => {});
      
      // Delete online-related data BEFORE products (OnlineProducts references Products)
      // First delete OnlineOrders and ShoppingCarts that reference OnlineStores
      await query('DELETE FROM OnlineOrders WHERE online_store_id IN (SELECT id FROM OnlineStores WHERE store_id = @id)', { id }).catch(() => {});
      await query('DELETE FROM ShoppingCarts WHERE online_store_id IN (SELECT id FROM OnlineStores WHERE store_id = @id)', { id }).catch(() => {});
      // Delete OnlineProducts (references both OnlineStores and Products)
      await query('DELETE FROM OnlineProducts WHERE online_store_id IN (SELECT id FROM OnlineStores WHERE store_id = @id)', { id }).catch(() => {});
      // Delete OnlineStoreProducts
      await query('DELETE FROM OnlineStoreProducts WHERE online_store_id IN (SELECT id FROM OnlineStores WHERE store_id = @id)', { id }).catch(() => {});
      // Delete online stores
      await query('DELETE FROM OnlineStores WHERE store_id = @id', { id }).catch(() => {});
      
      // Now delete products (after OnlineProducts is deleted)
      await query('DELETE FROM Products WHERE store_id = @id', { id });
      // Delete customers
      await query('DELETE FROM Customers WHERE store_id = @id', { id });
      // Delete suppliers
      await query('DELETE FROM Suppliers WHERE store_id = @id', { id });
      // Delete contractors
      await query('DELETE FROM Contractors WHERE store_id = @id', { id }).catch(() => {});
      // Delete categories
      await query('DELETE FROM Categories WHERE store_id = @id', { id });
      // Delete units
      await query('DELETE FROM Units WHERE store_id = @id', { id });
      // Delete user-store relationships
      await query('DELETE FROM UserStores WHERE store_id = @id', { id });
      // Finally delete the store
      await query('DELETE FROM Stores WHERE id = @id', { id });
    } catch (deleteError) {
      console.error('Error during cascade delete:', deleteError);
      throw deleteError;
    }

    res.json({ 
      success: true, 
      message: 'Đã xóa cửa hàng vĩnh viễn',
      deletedData: {
        products: productCount?.count || 0,
        orders: orderCount?.count || 0,
        customers: customerCount?.count || 0,
      }
    });
  } catch (error) {
    console.error('Permanent delete store error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Không thể xóa cửa hàng: ${errorMessage}` });
  }
});

export default router;
