import { Router, Response } from 'express';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { purchaseOrderRepository, CreatePurchaseOrderInput } from '../repositories/purchase-order-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

/**
 * GET /api/purchases
 * Lấy danh sách đơn nhập hàng với pagination và filter
 * Query params: page, pageSize, search, supplierId, dateFrom, dateTo
 * Requirements: 2.1, 2.2, 2.3
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const result = await purchaseOrderRepository.findAllWithSupplier(storeId, {
      page,
      pageSize,
      search,
      supplierId,
      dateFrom,
      dateTo,
    });

    // Log first item to check if paidAmount is included
    if (result.data.length > 0) {
      console.log('[GET /api/purchases] Sample response:', JSON.stringify(result.data[0], null, 2));
    }

    res.json({
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/purchases/:id
 * Lấy chi tiết đơn nhập hàng với items
 * Requirements: 2.4
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    console.log('GET /api/purchases/:id - ID:', id, 'Store:', storeId);

    const purchase = await purchaseOrderRepository.findByIdWithDetails(id, storeId);

    if (!purchase) {
      console.log('Purchase order not found');
      res.status(404).json({ error: 'Purchase order not found', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    console.log('Purchase order found:', {
      id: purchase.id,
      orderNumber: purchase.orderNumber,
      itemsCount: purchase.items?.length || 0,
      items: purchase.items
    });

    res.json({ purchaseOrder: purchase });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Failed to get purchase', code: 'INTERNAL_ERROR' });
  }
});


/**
 * POST /api/purchases/quick
 * Nhập hàng nhanh - Tạo đơn nhập hàng với 1 sản phẩm
 * Requirements: Quick purchase feature
 */
router.post('/quick', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;
    const { supplierId, productId, quantity, cost, unitId, importDate, baseQuantity, baseCost, baseUnitId, paidAmount, paymentMethod } = req.body;

    // Validate required fields
    if (!supplierId) {
      res.status(400).json({ error: 'Supplier is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!productId || !quantity || cost === undefined || !unitId || !importDate) {
      res.status(400).json({ error: 'All fields are required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0', code: 'VALIDATION_ERROR' });
      return;
    }

    if (cost < 0) {
      res.status(400).json({ error: 'Cost cannot be negative', code: 'VALIDATION_ERROR' });
      return;
    }

    // Use base values if provided, otherwise use original values
    const finalBaseQuantity = baseQuantity || quantity;
    const finalBaseCost = baseCost || cost;
    const finalBaseUnitId = baseUnitId || unitId;

    // Calculate total amount using base values
    const totalAmount = finalBaseQuantity * finalBaseCost;
    
    // Validate paid amount
    const finalPaidAmount = paidAmount || 0;
    if (finalPaidAmount < 0 || finalPaidAmount > totalAmount) {
      res.status(400).json({ error: 'Invalid paid amount', code: 'VALIDATION_ERROR' });
      return;
    }

    const input: CreatePurchaseOrderInput = {
      supplierId,
      importDate,
      notes: 'Nhập hàng nhanh',
      totalAmount,
      createdBy: userId,
      items: [{
        productId,
        quantity,
        cost,
        unitId,
        baseQuantity: finalBaseQuantity,
        baseCost: finalBaseCost,
        baseUnitId: finalBaseUnitId,
      }],
      paidAmount: finalPaidAmount,
      paymentMethod: paymentMethod || 'cash',
    };

    const purchase = await purchaseOrderRepository.createWithItems(input, storeId);

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Quick purchase error:', error);
    res.status(500).json({ error: 'Failed to create quick purchase', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/purchases
 * Tạo đơn nhập hàng mới
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;
    const { supplierId, importDate, notes, items } = req.body;

    // Validate required fields
    if (!supplierId) {
      res.status(400).json({ error: 'Supplier is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!importDate) {
      res.status(400).json({ error: 'Import date is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Calculate total amount using base values
    const totalAmount = items.reduce((sum: number, item: { 
      quantity: number; 
      cost: number; 
      baseQuantity?: number; 
      baseCost?: number; 
    }) => {
      const baseQty = item.baseQuantity || item.quantity;
      const baseCst = item.baseCost || item.cost;
      return sum + (baseQty * baseCst);
    }, 0);

    const input: CreatePurchaseOrderInput = {
      supplierId,
      importDate,
      notes,
      totalAmount,
      createdBy: userId,
      items: items.map((item: { 
        productId: string; 
        quantity: number; 
        cost: number; 
        unitId: string;
        baseQuantity?: number;
        baseCost?: number;
        baseUnitId?: string;
      }) => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
        baseQuantity: item.baseQuantity,
        baseCost: item.baseCost,
        baseUnitId: item.baseUnitId,
      })),
    };

    const purchase = await purchaseOrderRepository.createWithItems(input, storeId);

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PUT /api/purchases/:id
 * Cập nhật đơn nhập hàng với validation
 * Requirements: 3.1
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { supplierId, importDate, notes, items } = req.body;

    // Validate required fields
    if (!importDate) {
      res.status(400).json({ error: 'Import date is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Calculate total amount using base values
    const totalAmount = items.reduce((sum: number, item: { 
      quantity: number; 
      cost: number; 
      baseQuantity?: number; 
      baseCost?: number; 
    }) => {
      const baseQty = item.baseQuantity || item.quantity;
      const baseCst = item.baseCost || item.cost;
      return sum + (baseQty * baseCst);
    }, 0);

    const input = {
      supplierId,
      importDate,
      notes,
      totalAmount,
      items: items.map((item: { 
        productId: string; 
        quantity: number; 
        cost: number; 
        unitId: string;
        baseQuantity?: number;
        baseCost?: number;
        baseUnitId?: string;
      }) => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
        baseQuantity: item.baseQuantity,
        baseCost: item.baseCost,
        baseUnitId: item.baseUnitId,
      })),
    };

    const purchase = await purchaseOrderRepository.updateWithItems(id, input, storeId);

    res.json(purchase);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    console.error('Update purchase error:', error);
    res.status(500).json({ error: 'Failed to update purchase', code: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/purchases/:id
 * Xóa đơn nhập hàng với kiểm tra ràng buộc
 * Requirements: 3.2, 3.3, 3.4
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    // Check if purchase order can be deleted (no used lots)
    const canDelete = await purchaseOrderRepository.canDelete(id, storeId);
    
    if (!canDelete) {
      res.status(400).json({ 
        error: 'Cannot delete purchase order with used inventory. Some items have been sold or transferred.',
        code: 'PURCHASE_DELETE_FORBIDDEN',
      });
      return;
    }

    await purchaseOrderRepository.deleteWithItems(id, storeId);

    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    if (errorMessage.includes('Cannot delete')) {
      res.status(400).json({ error: errorMessage, code: 'PURCHASE_DELETE_FORBIDDEN' });
      return;
    }

    console.error('Delete purchase error:', error);
    res.status(500).json({ error: 'Failed to delete purchase', code: 'INTERNAL_ERROR' });
  }
});

export default router;
