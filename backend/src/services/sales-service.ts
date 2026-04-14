import { withTransaction } from '../db/transaction';
import { query, queryOne } from '../db';
import { inventoryService, InsufficientStockError } from './inventory-service';
import { Sale, SalesItem } from '../repositories/sales-repository';
import { UnitConversionLog } from '../repositories/unit-conversion-log-repository';
import { loyaltyPointsService } from './loyalty-points-service';
import { cashTransactionRepository } from '../repositories/cash-transaction-repository';

/**
 * Input for creating a sale item
 */
export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  price: number;
  unitId?: string; // Optional unit ID for unit conversion
}

/**
 * Input for creating a sale
 */
export interface CreateSaleInput {
  customerId?: string;
  shiftId?: string;
  projectName?: string;
  items: CreateSaleItemInput[];
  discount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  tierDiscountPercentage?: number;
  tierDiscountAmount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  customerPayment?: number;
  previousDebt?: number;
  vatAmount?: number;
  status?: 'pending' | 'processed';
}

/**
 * Result of creating a sale
 */
export interface CreateSaleResult {
  sale: Sale;
  items: SalesItem[];
  conversions: UnitConversionLog[];
}

/**
 * Sales Service
 * Handles sales transactions with automatic inventory deduction and unit conversion
 */
export class SalesService {
  private async resolvePreferredColumnName(
    tableName: string,
    candidates: string[]
  ): Promise<string | null> {
    if (!candidates.length) {
      return null;
    }

    const quotedCandidates = candidates
      .map((name) => `'${name.replace(/'/g, "''")}'`)
      .join(', ');

    const priorityCase = candidates
      .map((name, idx) => `WHEN '${name.replace(/'/g, "''")}' THEN ${idx + 1}`)
      .join(' ');

    const row = await queryOne<{ column_name: string }>(
      `SELECT TOP 1 c.name AS column_name
       FROM sys.columns c
       INNER JOIN sys.objects o ON o.object_id = c.object_id
       WHERE o.type = 'U'
         AND o.name = @tableName
         AND c.name IN (${quotedCandidates})
       ORDER BY CASE c.name ${priorityCase} ELSE 999 END`,
      { tableName }
    );

    return row?.column_name || null;
  }

  private async resolveStoreColumnName(tableName: string): Promise<'store_id' | 'StoreId' | 'StoreID' | null> {
    const row = await this.resolvePreferredColumnName(tableName, ['store_id', 'StoreId', 'StoreID']);

    if (row === 'store_id' || row === 'StoreId' || row === 'StoreID') {
      return row;
    }

    return null;
  }

  /**
   * Generate a unique invoice number
   */
  private async generateInvoiceNumber(
    storeId: string
  ): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `INV${year}${month}${day}`;

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

  /**
   * Create a new sale with automatic inventory deduction
   */
  async createSale(
    saleData: CreateSaleInput,
    storeId: string,
    userId?: string
  ): Promise<CreateSaleResult> {
    return withTransaction(async (transaction) => {
      // Validate items
      if (!saleData.items || saleData.items.length === 0) {
        throw new Error('Sale must have at least one item');
      }

      // Check inventory availability for all items first
      // Accumulate requested quantities by product and unit
      const requestedQuantities = new Map<string, number>();
      let attemptedInventorySync = false;

      for (const item of saleData.items) {
        const unitId = item.unitId || await this.getDefaultUnitId(item.productId, storeId);
        const key = `${item.productId}_${unitId}`;
        const currentQty = requestedQuantities.get(key) || 0;
        requestedQuantities.set(key, currentQty + item.quantity);
      }

      for (const [key, totalQty] of requestedQuantities.entries()) {
        const [productId, unitId] = key.split('_');

        console.log('[SalesService] Checking stock:', {
          productId,
          storeId,
          unitId,
          requestedQty: totalQty
        });

        let available = await inventoryService.checkAvailableQuantity(
          productId,
          storeId,
          unitId
        );

        // Legacy data can have stock in Products.stock_quantity but missing ProductInventory rows.
        // Sync once and re-check before failing the sale.
        if (available < totalQty && !attemptedInventorySync) {
          attemptedInventorySync = true;
          try {
            await inventoryService.syncAllInventory(storeId);
            available = await inventoryService.checkAvailableQuantity(
              productId,
              storeId,
              unitId
            );
            console.log('[SalesService] Stock recheck after sync:', {
              productId,
              unitId,
              available,
              requestedQty: totalQty,
            });
          } catch (syncError) {
            console.error('[SalesService] Inventory sync before stock check failed:', syncError);
          }
        }

        console.log('[SalesService] Available stock:', available);

        if (available < totalQty) {
          const product = await queryOne<{ name: string }>(
            'SELECT name FROM Products WHERE id = @productId',
            { productId }
          );
          throw new InsufficientStockError(
            `Không đủ hàng. Chỉ còn ${available} ${product?.name || 'sản phẩm'}`,
            productId,
            totalQty,
            available,
            unitId
          );
        }
      }

      // Calculate totals
      const totalAmount = saleData.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );
      const discount = saleData.discount || 0;
      const tierDiscountAmount = saleData.tierDiscountAmount || 0;
      const pointsDiscount = saleData.pointsDiscount || 0;
      const vatAmount = saleData.vatAmount || 0;
      const finalAmount =
        totalAmount - discount - tierDiscountAmount - pointsDiscount + vatAmount;

      // Calculate remaining debt
      const customerPayment = saleData.customerPayment || 0;
      const previousDebt = saleData.previousDebt || 0;

      // Total sales value from THIS transaction
      const salesValueFromThisTransaction = finalAmount;

      // Calculate debt for just THIS sale
      const saleRemainingDebt = Math.max(0, salesValueFromThisTransaction - customerPayment);

      // Calculate any excess payment that should go to old debt
      const excessPayment = Math.max(0, customerPayment - salesValueFromThisTransaction);

      // We still store remaining_debt as just the remaining debt of THIS sale
      const remainingDebt = saleRemainingDebt;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(storeId);
      const saleId = crypto.randomUUID();
      const now = new Date();

      // Create sale record
      await query(
        `INSERT INTO Sales 
         (id, store_id, invoice_number, customer_id, shift_id, transaction_date, 
          status, total_amount, vat_amount, final_amount, discount, discount_type, 
          discount_value, tier_discount_percentage, tier_discount_amount, 
          points_used, points_discount, customer_payment, previous_debt,
          project_name,
          remaining_debt, CreatedBy, created_at, updated_at)
         VALUES (@id, @storeId, @invoiceNumber, @customerId, @shiftId, @transactionDate,
                 @status, @totalAmount, @vatAmount, @finalAmount, @discount, @discountType,
                 @discountValue, @tierDiscountPercentage, @tierDiscountAmount,
                 @pointsUsed, @pointsDiscount, @customerPayment, @previousDebt,
                 @projectName,
                 @remainingDebt, @createdBy, @createdAt, @updatedAt)`,
        {
          id: saleId,
          storeId,
          invoiceNumber,
          customerId: saleData.customerId || null,
          shiftId: saleData.shiftId || null,
          transactionDate: now,
          status: saleData.status || 'pending',
          totalAmount,
          vatAmount,
          finalAmount,
          discount,
          discountType: saleData.discountType || null,
          discountValue: saleData.discountValue || null,
          tierDiscountPercentage: saleData.tierDiscountPercentage || null,
          tierDiscountAmount,
          pointsUsed: saleData.pointsUsed || 0,
          pointsDiscount,
          customerPayment,
          previousDebt,
          projectName: saleData.projectName || null,
          remainingDebt,
          createdBy: userId || null,
          createdAt: now,
          updatedAt: now,
        }
      );

      // Create sale items and deduct inventory
      const items: SalesItem[] = [];
      const allConversions: UnitConversionLog[] = [];

      const salesItemsTransactionColumn =
        (await this.resolvePreferredColumnName('SalesItems', ['sales_transaction_id', 'SalesTransactionId', 'SalesTransactionID'])) ||
        'sales_transaction_id';
      const salesItemsProductColumn =
        (await this.resolvePreferredColumnName('SalesItems', ['product_id', 'ProductId', 'ProductID'])) ||
        'product_id';
      const salesItemsUnitColumn =
        (await this.resolvePreferredColumnName('SalesItems', ['unit_id', 'UnitId', 'UnitID'])) ||
        'unit_id';
      const salesItemsCreatedAtColumn =
        (await this.resolvePreferredColumnName('SalesItems', ['created_at', 'CreatedAt'])) ||
        'created_at';

      for (const itemData of saleData.items) {
        const itemId = crypto.randomUUID();
        const unitId = itemData.unitId || await this.getDefaultUnitId(itemData.productId, storeId);

        // Create sale item
        await query(
          `INSERT INTO SalesItems 
           (id, ${salesItemsTransactionColumn}, ${salesItemsProductColumn}, quantity, price, ${salesItemsUnitColumn}, ${salesItemsCreatedAtColumn})
           VALUES (@id, @salesTransactionId, @productId, @quantity, @price, @unitId, @createdAt)`,
          {
            id: itemId,
            salesTransactionId: saleId,
            productId: itemData.productId,
            quantity: itemData.quantity,
            price: itemData.price,
            unitId: unitId || null,
            createdAt: now,
          }
        );

        items.push({
          id: itemId,
          salesTransactionId: saleId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
        });

        // Deduct inventory
        const deductResult = await inventoryService.deductInventory(
          itemData.productId,
          storeId,
          itemData.quantity,
          unitId,
          saleId
        );

        // Collect conversion logs
        if (deductResult.conversions.length > 0) {
          allConversions.push(...deductResult.conversions);
        }
      }

      // Update customer debt if applicable
      if (saleData.customerId) {
        // Only update if there's a sale or payment
        if (salesValueFromThisTransaction !== 0 || customerPayment > 0) {
          await query(
            `UPDATE Customers 
             SET total_debt = ISNULL(total_debt, 0) + @debtChange, 
                 total_paid = ISNULL(total_paid, 0) + @paidAmount,
                 updated_at = @updatedAt
             WHERE id = @customerId AND store_id = @storeId`,
            {
              customerId: saleData.customerId,
              storeId,
              debtChange: salesValueFromThisTransaction, // total_debt is total historical sales value
              paidAmount: customerPayment,
              updatedAt: now,
            }
          );
        }

        // Apply excess payment to old debts (FIFO)
        if (excessPayment > 0) {
          const salesWithDebt = await query(
            `SELECT id, remaining_debt FROM Sales
             WHERE customer_id = @customerId AND store_id = @storeId AND remaining_debt > 0
             ORDER BY transaction_date ASC, created_at ASC`,
            { customerId: saleData.customerId, storeId }
          ) as Array<{ id: string; remaining_debt: number }>;

          let remainingToPay = excessPayment;
          for (const oldSale of salesWithDebt) {
            if (remainingToPay <= 0) break;
            const debtToClear = Math.min(oldSale.remaining_debt, remainingToPay);
            const newOldSaleDebt = oldSale.remaining_debt - debtToClear;

            await query(
              `UPDATE Sales SET remaining_debt = @newDebt, updated_at = @updatedAt WHERE id = @saleId`,
              { newDebt: newOldSaleDebt, updatedAt: now, saleId: oldSale.id }
            );
            remainingToPay -= debtToClear;
          }
        }

        // Explicitly create a Payments record so it shows up in History properly
        if (customerPayment > 0) {
          await query(
            `INSERT INTO Payments (id, store_id, customer_id, payment_date, amount, notes, created_at)
             VALUES (NEWID(), @storeId, @customerId, @paymentDate, @amount, @notes, @createdAt)`,
            {
              storeId,
              customerId: saleData.customerId,
              paymentDate: now,
              amount: customerPayment,
              notes: `Thanh toán tại quầy (Hoá đơn ${invoiceNumber})`,
              createdAt: now
            }
          );
        }
      }

      // Earn loyalty points for the customer (if applicable)
      // Points are earned on the amount after discounts (excluding VAT)
      if (saleData.customerId) {
        try {
          const amountForPoints = totalAmount - discount - tierDiscountAmount - pointsDiscount;
          if (amountForPoints > 0) {
            const earnResult = await loyaltyPointsService.earnPoints(
              saleData.customerId,
              storeId,
              amountForPoints,
              saleId
            );
            if (earnResult.points > 0) {
              console.log(`[SalesService] Customer ${saleData.customerId} earned ${earnResult.points} points.New balance: ${earnResult.newBalance}`);
            }
          }
        } catch (earnError) {
          // Log but don't fail the sale if loyalty points fails
          console.error('[SalesService] Failed to earn loyalty points:', earnError);
        }
      }

      // Create cash transaction for the payment received
      if (customerPayment > 0) {
        try {
          await cashTransactionRepository.create(
            {
              storeId,
              type: 'thu',
              transactionDate: now.toISOString(),
              amount: customerPayment,
              reason: `Thu tiền bán hàng - ${invoiceNumber}`,
              category: 'Bán hàng',
              relatedInvoiceId: saleId,
            },
            storeId
          );
          console.log(`[SalesService] Created cash transaction for sale ${invoiceNumber}: ${customerPayment} `);
        } catch (cashError) {
          // Log but don't fail the sale if cash transaction fails
          console.error('[SalesService] Failed to create cash transaction:', cashError);
        }
      }

      // Fetch created sale
      const sale = await queryOne<any>(
        `SELECT * FROM Sales WHERE id = @id AND store_id = @storeId`,
        { id: saleId, storeId }
      );

      return {
        sale: this.mapSaleToEntity(sale),
        items,
        conversions: allConversions,
      };
    });
  }

  /**
   * Cancel a sale and restore inventory
   */
  async cancelSale(saleId: string, storeId: string): Promise<void> {
    return withTransaction(async (transaction) => {
      // Get sale
      const sale = await queryOne<any>(
        `SELECT * FROM Sales WHERE id = @id AND store_id = @storeId`,
        { id: saleId, storeId }
      );

      if (!sale) {
        throw new Error('Sale not found');
      }

      if (sale.status === 'cancelled') {
        throw new Error('Sale is already cancelled');
      }

      // Get sale items
      const salesItemsTransactionColumn =
        (await this.resolvePreferredColumnName('SalesItems', ['sales_transaction_id', 'SalesTransactionId', 'SalesTransactionID'])) ||
        'sales_transaction_id';

      const items = await query<any>(
        `SELECT * FROM SalesItems WHERE ${salesItemsTransactionColumn} = @salesTransactionId`,
        { salesTransactionId: saleId }
      );

      // Restore inventory for each item
      for (const item of items) {
        const itemProductId = item.product_id || item.ProductId || item.ProductID;
        const itemUnitId = item.unit_id || item.UnitId || item.UnitID;
        const unitId = itemUnitId || await this.getDefaultUnitId(itemProductId, storeId);
        await inventoryService.restoreInventory(
          itemProductId,
          storeId,
          item.quantity,
          unitId
        );
      }

      // Update sale status
      await query(
        `UPDATE Sales SET status = 'cancelled', updated_at = @updatedAt 
         WHERE id = @id AND store_id = @storeId`,
        { id: saleId, storeId, updatedAt: new Date() }
      );

      // Restore customer debt if applicable
      if (sale.customer_id) {
        // Calculate the debt change from this cancelled transaction
        const debtChangeFromCancelledTransaction = sale.final_amount - (sale.customer_payment || 0);

        if (debtChangeFromCancelledTransaction !== 0 || sale.customer_payment > 0) {
          await query(
            `UPDATE Customers 
             SET total_debt = ISNULL(total_debt, 0) - @debtChange,
            total_paid = ISNULL(total_paid, 0) - @paidAmount,
            updated_at = @updatedAt
             WHERE id = @customerId AND store_id = @storeId`,
            {
              customerId: sale.customer_id,
              storeId,
              debtChange: debtChangeFromCancelledTransaction,
              paidAmount: sale.customer_payment || 0,
              updatedAt: new Date(),
            }
          );
        }
      }
    });
  }

  /**
   * Get default unit ID for a product
   * Returns unit_id from Products table
   */
  private async getDefaultUnitId(
    productId: string,
    storeId: string
  ): Promise<string> {
    const productsIdColumn =
      (await this.resolvePreferredColumnName('Products', ['id', 'Id', 'ID', 'ProductId', 'ProductID', 'product_id'])) ||
      'id';
    const productsDefaultSalesUnitColumn = await this.resolvePreferredColumnName('Products', [
      'default_sales_unit_id',
      'defaultSalesUnitId',
      'DefaultSalesUnitId',
      'DefaultSalesUnitID'
    ]);
    const productsUnitColumn = await this.resolvePreferredColumnName('Products', ['unit_id', 'unitId', 'UnitId', 'UnitID']);

    const defaultSalesUnitSelect = productsDefaultSalesUnitColumn
      ? `p.${productsDefaultSalesUnitColumn} AS default_sales_unit_id`
      : 'NULL AS default_sales_unit_id';
    const unitSelect = productsUnitColumn
      ? `p.${productsUnitColumn} AS unit_id`
      : 'NULL AS unit_id';

    const productStoreColumn = await this.resolveStoreColumnName('Products');
    const productStoreSelect = productStoreColumn ? `p.${productStoreColumn} AS store_id` : 'NULL AS store_id';

    const product = await queryOne<{ default_sales_unit_id: string | null; unit_id: string | null; store_id: string | null }>(
      `SELECT TOP 1 ${defaultSalesUnitSelect}, ${unitSelect}
      , ${productStoreSelect}
       FROM Products p
       WHERE (
         p.${productsIdColumn} = @productId
         OR CONVERT(NVARCHAR(36), p.${productsIdColumn}) = @productId
         OR LOWER(CONVERT(NVARCHAR(36), p.${productsIdColumn})) = LOWER(@productId)
       )
       ORDER BY CASE WHEN ${productStoreColumn ? `p.${productStoreColumn}` : 'NULL'} = @storeId THEN 0 ELSE 1 END`,
      { productId, storeId }
    );

    const directUnitId = product?.default_sales_unit_id || product?.unit_id;
    if (directUnitId) {
      return directUnitId;
    }

    if (product) {
      const unitsIdColumn = (await this.resolvePreferredColumnName('Units', ['id', 'Id', 'ID'])) || 'id';
      const unitsStoreColumn = await this.resolveStoreColumnName('Units');

      const fallbackUnit = await queryOne<{ unit_id: string }>(
        `SELECT TOP 1 u.${unitsIdColumn} AS unit_id
         FROM Units u
         ${unitsStoreColumn ? `WHERE u.${unitsStoreColumn} = @storeId` : ''}
         ORDER BY u.${unitsIdColumn}`,
        unitsStoreColumn ? { storeId } : {}
      );

      if (fallbackUnit?.unit_id) {
        const updateFragments: string[] = [];
        if (productsUnitColumn) {
          updateFragments.push(`${productsUnitColumn} = COALESCE(${productsUnitColumn}, @fallbackUnitId)`);
        }
        if (productsDefaultSalesUnitColumn) {
          updateFragments.push(`${productsDefaultSalesUnitColumn} = COALESCE(${productsDefaultSalesUnitColumn}, @fallbackUnitId)`);
        }

        if (updateFragments.length > 0) {
          await query(
            `UPDATE Products
             SET ${updateFragments.join(', ')}
             WHERE ${productsIdColumn} = @productId`,
            { productId, fallbackUnitId: fallbackUnit.unit_id }
          );
        }

        return fallbackUnit.unit_id;
      }

      throw new Error(`Product ${productId} is missing unit configuration for store ${storeId}`);
    }

    const productUnitsProductColumn = await this.resolvePreferredColumnName('ProductUnits', ['product_id', 'ProductId', 'ProductID']);
    const productUnitsStoreColumn = await this.resolveStoreColumnName('ProductUnits');
    const productUnitsConversionUnitColumn = await this.resolvePreferredColumnName('ProductUnits', ['conversion_unit_id', 'ConversionUnitId', 'ConversionUnitID']);
    const productUnitsBaseUnitColumn = await this.resolvePreferredColumnName('ProductUnits', ['base_unit_id', 'BaseUnitId', 'BaseUnitID']);
    const productUnitsActiveColumn = await this.resolvePreferredColumnName('ProductUnits', ['is_active', 'IsActive']);

    if (productUnitsProductColumn && (productUnitsConversionUnitColumn || productUnitsBaseUnitColumn)) {
      const activeFilter = productUnitsActiveColumn ? `AND (pu.${productUnitsActiveColumn} = 1 OR pu.${productUnitsActiveColumn} IS NULL)` : '';
      const storeFilter = productUnitsStoreColumn ? `AND pu.${productUnitsStoreColumn} = @storeId` : '';
      const conversionSelect = productUnitsConversionUnitColumn
        ? `pu.${productUnitsConversionUnitColumn} AS conversion_unit_id`
        : 'NULL AS conversion_unit_id';
      const baseSelect = productUnitsBaseUnitColumn
        ? `pu.${productUnitsBaseUnitColumn} AS base_unit_id`
        : 'NULL AS base_unit_id';

      const productUnitRow = await queryOne<{ conversion_unit_id: string | null; base_unit_id: string | null }>(
        `SELECT TOP 1 ${conversionSelect}, ${baseSelect}
         FROM ProductUnits pu
         WHERE pu.${productUnitsProductColumn} = @productId
           ${storeFilter}
           ${activeFilter}
         ORDER BY CASE WHEN ${productUnitsConversionUnitColumn ? `pu.${productUnitsConversionUnitColumn}` : 'NULL'} IS NOT NULL THEN 0 ELSE 1 END`,
        { productId, storeId }
      );

      const unitFromProductUnits = productUnitRow?.conversion_unit_id || productUnitRow?.base_unit_id;
      if (unitFromProductUnits) {
        return unitFromProductUnits;
      }
    }

    throw new Error(`Product ${productId} not found for store ${storeId}`);
  }

  /**
   * Map database record to Sale entity
   */
  private mapSaleToEntity(record: any): Sale {
    return {
      id: record.id,
      storeId: record.store_id,
      invoiceNumber: record.invoice_number,
      customerId: record.customer_id || undefined,
      shiftId: record.shift_id || undefined,
      transactionDate: record.transaction_date
        ? record.transaction_date instanceof Date
          ? record.transaction_date.toISOString()
          : String(record.transaction_date)
        : new Date().toISOString(),
      status: record.status || 'pending',
      totalAmount: record.total_amount || 0,
      vatAmount: record.vat_amount || 0,
      finalAmount: record.final_amount || 0,
      discount: record.discount || 0,
      discountType: record.discount_type || undefined,
      discountValue: record.discount_value ?? undefined,
      tierDiscountPercentage: record.tier_discount_percentage ?? undefined,
      tierDiscountAmount: record.tier_discount_amount ?? undefined,
      pointsUsed: record.points_used || 0,
      pointsDiscount: record.points_discount || 0,
      customerPayment: record.customer_payment ?? undefined,
      previousDebt: record.previous_debt ?? undefined,
      projectName: record.project_name || record.ProjectName || undefined,
      remainingDebt: record.remaining_debt ?? undefined,
      createdAt: record.created_at
        ? record.created_at instanceof Date
          ? record.created_at.toISOString()
          : String(record.created_at)
        : undefined,
      updatedAt: record.updated_at
        ? record.updated_at instanceof Date
          ? record.updated_at.toISOString()
          : String(record.updated_at)
        : undefined,
    };
  }
}

// Export singleton instance
export const salesService = new SalesService();
