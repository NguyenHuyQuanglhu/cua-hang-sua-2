import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { salesService, InventoryInsufficientStockError } from '../services';
import { salesSPRepository } from '../repositories/sales-sp-repository';
import * as pdfInvoiceService from '../services/pdf-invoice-service';
import { validateAndNormalizeStatus, validateStatusQuery } from '../middleware/validateStatus';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// Helper function to generate invoice number
async function generateInvoiceNumber(storeId: string): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const datePrefix = `PN${year}${month}${day}`;

  const result = await queryOne<{ invoice_number: string }>(
    `SELECT TOP 1 invoice_number 
     FROM Sales 
     WHERE store_id = @storeId AND invoice_number LIKE @prefix + '%' 
     ORDER BY invoice_number DESC`,
    { storeId, prefix: datePrefix }
  );

  let nextSequence = 1;
  if (result) {
    const lastSequence = parseInt(
      result.invoice_number.substring(datePrefix.length),
      10
    );
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
}

// GET /api/sales
router.get('/', validateStatusQuery, async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { page = '1', pageSize = '20', search, status, customerId, dateFrom, dateTo } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);

    // Use SP Repository to get sales with filters
    const filters = {
      startDate: dateFrom ? new Date(dateFrom as string) : null,
      endDate: dateTo ? new Date(dateTo as string) : null,
      customerId: customerId && customerId !== 'all' ? customerId as string : null,
      status: status && status !== 'all' ? status as string : null,
    };

    let sales = await salesSPRepository.getByStore(storeId, filters);

    // Filter by employee: only show sales created by current user
    // Exception: owner and company_manager can see all sales
    if (userRole !== 'owner' && userRole !== 'company_manager') {
      sales = sales.filter(s => s.createdBy === userId);
    }

    // Apply search filter (client-side since SP doesn't support it)
    if (search) {
      const searchLower = (search as string).toLowerCase();
      sales = sales.filter(s =>
        s.invoiceNumber?.toLowerCase().includes(searchLower) ||
        s.customerName?.toLowerCase().includes(searchLower)
      );
    }

    // Calculate status counts for all sales (before pagination)
    const statusCounts = {
      pending: sales.filter(s => s.status === 'pending').length,
      processed: sales.filter(s => s.status === 'processed').length,
    };

    // Calculate pagination
    const total = sales.length;
    const totalPages = Math.ceil(total / pageSizeNum);
    const offset = (pageNum - 1) * pageSizeNum;
    const paginatedSales = sales.slice(offset, offset + pageSizeNum);

    // Get item counts for all paginated sales in a single query (fix N+1)
    let itemCountMap: Record<string, number> = {};
    if (paginatedSales.length > 0) {
      const saleIds = paginatedSales.map(s => s.id);
      const placeholders = saleIds.map((_, i) => `@id${i}`).join(',');
      const params: Record<string, string> = {};
      saleIds.forEach((id, i) => { params[`id${i}`] = id; });

      const countResults = await query(
        `SELECT sales_transaction_id, COUNT(*) as item_count
         FROM SalesItems
         WHERE sales_transaction_id IN (${placeholders})
         GROUP BY sales_transaction_id`,
        params
      );

      (countResults as Array<{ sales_transaction_id: string; item_count: number }>).forEach(r => {
        itemCountMap[r.sales_transaction_id] = r.item_count;
      });
    }

    const salesWithItemCount = paginatedSales.map(s => ({
      ...s,
      itemCount: itemCountMap[s.id] || 0,
    }));

    res.json({
      success: true,
      data: salesWithItemCount.map((s) => ({
        id: s.id,
        storeId: s.storeId,
        invoiceNumber: s.invoiceNumber,
        customerId: s.customerId,
        customerName: s.customerName,
        shiftId: s.shiftId,
        transactionDate: s.transactionDate,
        status: s.status,
        totalAmount: s.totalAmount,
        vatAmount: s.vatAmount,
        finalAmount: s.finalAmount,
        discount: s.discount,
        discountType: s.discountType,
        discountValue: s.discountValue,
        tierDiscountPercentage: s.tierDiscountPercentage,
        tierDiscountAmount: s.tierDiscountAmount,
        pointsUsed: s.pointsUsed,
        pointsDiscount: s.pointsDiscount,
        customerPayment: s.customerPayment,
        previousDebt: s.previousDebt,
        remainingDebt: s.remainingDebt,
        paymentMethod: (s as any).paymentMethod,
        itemCount: s.itemCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
      counts: statusCounts,
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// GET /api/sales/items/all - Get all sale items for dashboard (must be before /:id)
router.get('/items/all', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { dateFrom, dateTo } = req.query;

    let dateFilter = '';
    const params: Record<string, unknown> = { storeId };

    if (dateFrom) {
      dateFilter += ' AND s.transaction_date >= @dateFrom';
      params.dateFrom = new Date(dateFrom as string);
    }
    if (dateTo) {
      dateFilter += ' AND s.transaction_date <= @dateTo';
      params.dateTo = new Date(dateTo as string);
    }

    // This query is specific and not covered by SP, keep inline
    const items = await query(
      `SELECT si.id, si.sales_transaction_id, si.product_id, si.quantity, si.price,
              p.name as product_name, s.transaction_date
       FROM SalesItems si
       JOIN Products p ON si.product_id = p.id
       JOIN Sales s ON si.sales_transaction_id = s.id
       WHERE s.store_id = @storeId${dateFilter}
       ORDER BY s.transaction_date DESC`,
      params
    );

    res.json({
      success: true,
      data: items.map((i: Record<string, unknown>) => ({
        id: i.id,
        salesTransactionId: i.sales_transaction_id,
        productId: i.product_id,
        productName: i.product_name,
        unitName: null,
        quantity: i.quantity,
        price: i.price,
        totalPrice: (i.quantity as number) * (i.price as number),
        transactionDate: i.transaction_date,
      })),
    });
  } catch (error) {
    console.error('Get all sale items error:', error);
    res.status(500).json({ error: 'Failed to get sale items' });
  }
});

// GET /api/sales/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    // Use SP Repository instead of inline query
    const result = await salesSPRepository.getById(id, storeId);

    if (!result) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const { sale, items } = result;

    res.json({
      sale: {
        id: sale.id,
        storeId: sale.storeId,
        invoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        shiftId: sale.shiftId,
        transactionDate: sale.transactionDate,
        status: sale.status,
        totalAmount: sale.totalAmount,
        vatAmount: sale.vatAmount,
        finalAmount: sale.finalAmount,
        discount: sale.discount,
        discountType: sale.discountType,
        discountValue: sale.discountValue,
        tierDiscountPercentage: sale.tierDiscountPercentage,
        tierDiscountAmount: sale.tierDiscountAmount,
        pointsUsed: sale.pointsUsed,
        pointsDiscount: sale.pointsDiscount,
        customerPayment: sale.customerPayment,
        previousDebt: sale.previousDebt,
        remainingDebt: sale.remainingDebt,
        items: items.map((item) => ({
          id: item.id,
          salesId: item.salesTransactionId,
          productId: item.productId,
          productName: item.productName,
          unitName: item.unitName,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to get sale' });
  }
});

// GET /api/sales/:id/items
router.get('/:id/items', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    // Use SP Repository to get sale with items
    const result = await salesSPRepository.getById(id, storeId);

    if (!result) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    res.json({
      success: true,
      data: result.items.map((i) => ({
        id: i.id,
        saleId: i.salesTransactionId,
        productId: i.productId,
        productName: i.productName,
        unitName: i.unitName,
        quantity: i.quantity,
        price: i.price,
        unitPrice: i.price,
        totalPrice: i.quantity * i.price,
      })),
    });
  } catch (error) {
    console.error('Get sale items error:', error);
    res.status(500).json({ error: 'Failed to get sale items' });
  }
});

// POST /api/sales
router.post('/', validateAndNormalizeStatus, async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const {
      customerId, shiftId, items, totalAmount, vatAmount, finalAmount,
      discount, discountType, discountValue, customerPayment,
      previousDebt, remainingDebt, tierDiscountPercentage, tierDiscountAmount,
      pointsUsed, pointsDiscount, status
    } = req.body;

    // Set default status to "pending" if not provided (Requirement 2.2)
    const orderStatus = status || 'pending';

    console.log('[POST /api/sales] Creating sale:', { storeId, userId, customerId, shiftId, itemsCount: items?.length, totalAmount, finalAmount, previousDebt, status: orderStatus });

    // Allow empty items if this is a debt payment only (previousDebt > 0 and totalAmount = 0)
    const isDebtPaymentOnly = previousDebt > 0 && totalAmount === 0 && (!items || items.length === 0);

    // Validate items (unless it's debt payment only)
    if (!isDebtPaymentOnly && (!items || items.length === 0)) {
      res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm' });
      return;
    }

    // If debt payment only, create a simple sale record without inventory management
    if (isDebtPaymentOnly) {
      console.log('[POST /api/sales] Creating debt payment only sale');

      const saleId = crypto.randomUUID();
      const invoiceNumber = await generateInvoiceNumber(storeId);

      await query(
        `INSERT INTO Sales (
          id, store_id, customer_id, shift_id, invoice_number, transaction_date,
          total_amount, discount, discount_type, discount_value, vat_amount, final_amount,
          customer_payment, previous_debt, remaining_debt, payment_method, status, CreatedBy, created_at, updated_at
        ) VALUES (
          @id, @storeId, @customerId, @shiftId, @invoiceNumber, GETDATE(),
          @totalAmount, @discount, @discountType, @discountValue, @vatAmount, @finalAmount,
          @customerPayment, @previousDebt, @remainingDebt, @paymentMethod, @status, @createdBy, GETDATE(), GETDATE()
        )`,
        {
          id: saleId,
          storeId,
          customerId: customerId || null,
          shiftId: shiftId || null,
          invoiceNumber,
          totalAmount: 0,
          discount: 0,
          discountType: 'amount',
          discountValue: 0,
          vatAmount: 0,
          finalAmount: 0,
          customerPayment: customerPayment || 0,
          previousDebt: previousDebt || 0,
          remainingDebt: 0, // Debt is paid
          paymentMethod: req.body.paymentMethod || 'cash',
          status: orderStatus,
          createdBy: userId,
        }
      );

      // Update customer debt
      if (customerId && previousDebt > 0) {
        await query(
          `UPDATE Customers 
           SET total_debt = ISNULL(total_debt, 0) - @previousDebt,
               total_paid = ISNULL(total_paid, 0) + @previousDebt,
               updated_at = GETDATE()
           WHERE id = @customerId AND store_id = @storeId`,
          { customerId, previousDebt, storeId }
        );
      }

      console.log('[POST /api/sales] Debt payment sale created:', saleId, invoiceNumber);

      res.status(201).json({
        id: saleId,
        invoiceNumber,
        status: orderStatus,
        finalAmount: 0,
        conversions: [],
      });
      return;
    }

    // Map items to include unitId
    const mappedItems = items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price ?? item.unitPrice,
      unitId: item.unitId, // Support unitId for unit conversion
    }));

    // Use SalesService to create sale with inventory management
    // Note: SalesService handles complex inventory deduction logic
    const result = await salesService.createSale(
      {
        customerId,
        shiftId,
        items: mappedItems,
        discount,
        discountType,
        discountValue,
        tierDiscountPercentage,
        tierDiscountAmount,
        pointsUsed,
        pointsDiscount,
        customerPayment,
        previousDebt,
        vatAmount,
        status: orderStatus, // Pass the status to the service
      },
      storeId,
      userId
    );

    console.log('[POST /api/sales] Sale created:', result.sale.id, result.sale.invoiceNumber);
    if (result.conversions.length > 0) {
      console.log('[POST /api/sales] Auto conversions:', result.conversions.length);
    }

    res.status(201).json({
      id: result.sale.id,
      invoiceNumber: result.sale.invoiceNumber,
      status: result.sale.status,
      finalAmount: result.sale.finalAmount,
      conversions: result.conversions.map((c) => ({
        id: c.id,
        productId: c.productId,
        conversionType: c.conversionType,
        conversionUnitChange: c.conversionUnitChange,
        baseUnitChange: c.baseUnitChange,
        notes: c.notes,
      })),
    });
  } catch (error) {
    console.error('Create sale error:', error);

    // Handle insufficient stock error
    if (error instanceof InventoryInsufficientStockError) {
      res.status(400).json({
        error: error.message,
        code: 'INSUFFICIENT_STOCK',
        productId: error.productId,
        requestedQuantity: error.requestedQuantity,
        availableQuantity: error.availableQuantity,
        unitId: error.unitId,
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Catch SQL Server RAISERROR for insufficient stock caused by concurrent transaction race conditions
    if (errorMessage.includes('Insufficient stock for product')) {
      res.status(400).json({
        error: 'Sản phẩm đã hết hàng hoặc không đủ số lượng để bán. Vui lòng kiểm tra lại tồn kho.',
        code: 'INSUFFICIENT_STOCK',
        details: errorMessage
      });
      return;
    }

    res.status(500).json({ error: `Failed to create sale: ${errorMessage}` });
  }
});

// PUT /api/sales/:id
router.put('/:id', validateAndNormalizeStatus, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { status, customerPayment, remainingDebt } = req.body;

    console.log('[Sales PUT] Update request:', {
      id,
      storeId,
      status,
      customerPayment,
      remainingDebt,
    });

    // Use SP Repository for status update if only status is being updated
    if (status && !customerPayment && !remainingDebt) {
      console.log('[Sales PUT] Using SP for status update');
      const updated = await salesSPRepository.updateStatus(id, storeId, status);
      console.log('[Sales PUT] SP result:', updated);

      if (!updated) {
        console.error('[Sales PUT] Sale not found:', { id, storeId });
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      res.json({ success: true });
      return;
    }

    // For other updates, use inline query (SP doesn't support partial updates)
    console.log('[Sales PUT] Using inline query for update');
    await query(
      `UPDATE Sales SET 
        status = COALESCE(@status, status),
        customer_payment = COALESCE(@customerPayment, customer_payment),
        remaining_debt = COALESCE(@remainingDebt, remaining_debt),
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`,
      { id, storeId, status, customerPayment, remainingDebt }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// PATCH /api/sales/:id - Update sale status (Requirement 2.3, 2.4, 3.1)
router.patch('/:id', validateAndNormalizeStatus, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { status, customerPayment, remainingDebt } = req.body;

    console.log('[Sales PATCH] Update request:', {
      id,
      storeId,
      status,
      customerPayment,
      remainingDebt,
    });

    // Use SP Repository for status update if only status is being updated
    if (status && !customerPayment && !remainingDebt) {
      console.log('[Sales PATCH] Using SP for status update');
      const updated = await salesSPRepository.updateStatus(id, storeId, status);
      console.log('[Sales PATCH] SP result:', updated);

      if (!updated) {
        console.error('[Sales PATCH] Sale not found:', { id, storeId });
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      res.json({ success: true });
      return;
    }

    // For other updates, use inline query (SP doesn't support partial updates)
    console.log('[Sales PATCH] Using inline query for update');
    const result = await query(
      `UPDATE Sales SET 
        status = COALESCE(@status, status),
        customer_payment = COALESCE(@customerPayment, customer_payment),
        remaining_debt = COALESCE(@remainingDebt, remaining_debt),
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`,
      { id, storeId, status, customerPayment, remainingDebt }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    // Delete sale items first
    await query('DELETE FROM SalesItems WHERE sales_transaction_id = @id', { id });

    // Delete sale
    await query('DELETE FROM Sales WHERE id = @id AND store_id = @storeId', { id, storeId });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// GET /api/sales/:id/invoice-pdf - Generate PDF invoice
router.get('/:id/invoice-pdf', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Get invoice data
    const invoiceData = await pdfInvoiceService.getSaleForInvoice(
      parseInt(id),
      storeId,
      tenantId
    );

    if (!invoiceData) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Generate PDF
    const pdfBuffer = await pdfInvoiceService.generateInvoicePDF(invoiceData);

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoiceData.invoiceNumber}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

export default router;
