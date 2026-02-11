import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { cashTransactionRepository } from '../repositories/cash-transaction-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

console.log('[Payments] Route loaded successfully');

// GET /api/payments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const payments = await query(
      `SELECT p.*, c.full_name as customer_name
       FROM Payments p
       LEFT JOIN Customers c ON p.customer_id = c.id
       WHERE p.store_id = @storeId
       ORDER BY p.created_at DESC`,
      { storeId }
    );

    res.json(payments.map((p: Record<string, unknown>) => ({
      id: p.id,
      storeId: p.store_id,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: p.amount,
      paymentDate: p.payment_date,
      notes: p.notes,
      createdAt: p.created_at,
    })));
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /api/payments
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const { customerId, amount, paymentDate, paymentMethod, notes } = req.body;

    // Get customer name for cash flow description
    const customerResult = await query(
      `SELECT name FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    if (!customerResult || customerResult.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerName = customerResult[0].name;
    const paymentDateValue = paymentDate || new Date();

    // Insert payment record
    const result = await query(
      `INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, payment_method, notes, created_at)
       OUTPUT INSERTED.*
       VALUES (NEWID(), @storeId, @customerId, @amount, @paymentDate, @paymentMethod, @notes, GETDATE())`,
      { 
        storeId, 
        customerId, 
        amount, 
        paymentDate: paymentDateValue, 
        paymentMethod: paymentMethod || 'cash',
        notes 
      }
    );

    const payment = result[0];

    // Update customer debt using stored procedure
    try {
      await query(
        `EXEC sp_Customers_UpdateDebt @id = @customerId, @storeId = @storeId, @debtAmount = 0, @paidAmount = @amount`,
        { customerId, storeId, amount }
      );
      console.log(`[Payments] Updated customer debt for ${customerName}: paid ${amount}`);
    } catch (debtError) {
      console.error('[Payments] Failed to update customer debt:', debtError);
    }

    // Create cash flow entry for the payment (income)
    try {
      const cashFlowDescription = notes || `Thu tiền từ khách hàng: ${customerName}`;
      await cashTransactionRepository.create(
        {
          storeId,
          type: 'thu',
          transactionDate: paymentDateValue instanceof Date ? paymentDateValue.toISOString() : new Date(paymentDateValue).toISOString(),
          amount: amount,
          reason: cashFlowDescription,
          category: 'Thu tiền khách hàng',
          relatedInvoiceId: payment.id,
          createdBy: userId,
        },
        storeId
      );
      console.log(`[Payments] Created cash transaction for payment from ${customerName}: ${amount}`);
    } catch (cashError) {
      // Log but don't fail the payment if cash transaction fails
      console.error('[Payments] Failed to create cash transaction:', cashError);
    }

    res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// POST /api/payments/refund - Refund money to customer
router.post('/refund', async (req: AuthRequest, res: Response) => {
  console.log('[Refund] ===== REFUND ENDPOINT HIT =====');
  console.log('[Refund] Method:', req.method);
  console.log('[Refund] URL:', req.url);
  console.log('[Refund] Headers:', req.headers);
  console.log('[Refund] Body:', req.body);
  
  try {
    console.log('[Refund] Starting refund process...');
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const { customerId, amount, paymentMethod, notes } = req.body;

    console.log('[Refund] Request data:', { customerId, amount, paymentMethod, storeId, userId });

    if (!amount || amount <= 0) {
      console.log('[Refund] Invalid amount:', amount);
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get customer info - try different column names
    console.log('[Refund] Getting customer info...');
    let customerResult;
    try {
      // Try with 'name' and 'totalDebt' first
      customerResult = await query(
        `SELECT name, totalDebt FROM Customers WHERE id = @customerId AND store_id = @storeId`,
        { customerId, storeId }
      );
    } catch (error1) {
      console.log('[Refund] First query failed, trying with full_name and total_debt...');
      try {
        // Try with 'full_name' and 'total_debt'
        customerResult = await query(
          `SELECT full_name as name, total_debt as totalDebt FROM Customers WHERE id = @customerId AND store_id = @storeId`,
          { customerId, storeId }
        );
      } catch (error2) {
        console.log('[Refund] Second query failed, trying basic query...');
        // Try basic query to see what columns exist
        customerResult = await query(
          `SELECT * FROM Customers WHERE id = @customerId AND store_id = @storeId`,
          { customerId, storeId }
        );
      }
    }

    console.log('[Refund] Customer query result:', customerResult);

    if (!customerResult || customerResult.length === 0) {
      console.log('[Refund] Customer not found');
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult[0];
    const customerName = customer.name || customer.full_name || 'Unknown Customer';
    const currentDebt = customer.totalDebt || customer.total_debt || 0;

    console.log('[Refund] Customer info:', { customerName, currentDebt });

    // Check if customer has excess payment (negative debt)
    if (currentDebt >= 0) {
      console.log('[Refund] Customer does not have excess payment');
      return res.status(400).json({ 
        error: 'Customer does not have excess payment to refund',
        currentDebt 
      });
    }

    const maxRefundAmount = Math.abs(currentDebt);
    if (amount > maxRefundAmount) {
      console.log('[Refund] Amount exceeds max refund');
      return res.status(400).json({ 
        error: `Refund amount cannot exceed ${maxRefundAmount}`,
        maxRefundAmount 
      });
    }

    console.log('[Refund] Validation passed, creating refund record...');

    // Create refund payment record (negative amount to represent money going out)
    const refundId = await query(
      `INSERT INTO Payments (id, store_id, customer_id, payment_date, amount, payment_method, notes, created_at)
       OUTPUT INSERTED.id
       VALUES (NEWID(), @storeId, @customerId, GETDATE(), -@amount, @paymentMethod, @notes, GETDATE())`,
      { 
        storeId, 
        customerId, 
        amount, // Store as negative to represent refund
        paymentMethod: paymentMethod || 'cash',
        notes: notes || `Hoàn tiền cho khách hàng ${customerName}`
      }
    );

    console.log('[Refund] Created refund payment record:', refundId);

    // Update customer debt (increase debt by refund amount since we're giving money back)
    const newDebt = currentDebt + amount;
    await query(
      `UPDATE Customers 
       SET total_debt = @newDebt,
           total_paid = total_paid - @amount,
           updated_at = GETDATE()
       WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId, newDebt, amount }
    );

    console.log('[Refund] Updated customer debt from', currentDebt, 'to', newDebt);

    // Create cash flow record (money out)
    try {
      const { createCashTransaction } = await import('../services/cash-flow-service');
      await createCashTransaction(
        {
          transactionDate: new Date(),
          amount: -amount, // Negative for money out
          type: 'expense',
          paymentMethod: paymentMethod || 'cash',
          reason: notes || `Hoàn tiền cho khách hàng ${customerName}`,
          category: 'Hoàn tiền khách hàng',
          relatedInvoiceId: refundId[0]?.id,
          createdBy: userId,
        },
        storeId
      );
      console.log('[Refund] Created cash flow record');
    } catch (cashError) {
      console.error('[Refund] Failed to create cash flow record:', cashError);
    }

    res.status(201).json({ 
      success: true, 
      message: `Đã hoàn ${amount.toLocaleString()}đ cho khách hàng ${customerName}`,
      refund: {
        amount,
        customerName,
        previousDebt: currentDebt,
        newDebt: newDebt
      }
    });

  } catch (error) {
    console.error('[Refund] Error:', error);
    res.status(500).json({ 
      error: 'Failed to process refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
