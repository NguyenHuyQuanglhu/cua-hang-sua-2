import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../.env') });

import { query, queryOne } from '../src/db';
import { loyaltyPointsService } from '../src/services/loyalty-points-service';
import { customersSPRepository } from '../src/repositories/customers-sp-repository';

interface StoreRow {
  store_id: string;
}

interface PaymentRow {
  id: string;
  store_id: string;
  customer_id: string;
  amount: number;
  payment_date?: Date | string | null;
  created_at?: Date | string | null;
}

interface ExistingPointRow {
  id: string;
}

interface CustomerPaymentTotalRow {
  customer_id: string;
  total_amount: number;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM sys.tables WHERE name = @tableName`,
    { tableName }
  );

  return Number(result?.total || 0) > 0;
}

async function backfillStoreWithTransactions(storeId: string) {
  console.log(`\n[Backfill] Processing store: ${storeId}`);

  const payments = await query<PaymentRow>(
    `SELECT
       id,
       store_id,
       customer_id,
       amount,
       payment_date,
       created_at
     FROM Payments
     WHERE store_id = @storeId
       AND customer_id IS NOT NULL
       AND ISNULL(amount, 0) > 0
     ORDER BY payment_date ASC, created_at ASC`,
    { storeId }
  );

  let processed = 0;
  let skippedExisting = 0;
  let skippedNoPoints = 0;
  let awardedPoints = 0;
  let failed = 0;

  for (const payment of payments) {
    const customerId = payment.customer_id;
    const paymentId = payment.id;
    const amount = Number(payment.amount || 0);

    if (!customerId || !paymentId || !Number.isFinite(amount) || amount <= 0) {
      skippedNoPoints++;
      continue;
    }

    const existing = await queryOne<ExistingPointRow>(
      `SELECT TOP 1 id
       FROM LoyaltyPointsTransactions
       WHERE store_id = @storeId
         AND customer_id = @customerId
         AND reference_type = 'payment'
         AND reference_id = @paymentId`,
      { storeId, customerId, paymentId }
    );

    if (existing?.id) {
      skippedExisting++;
      continue;
    }

    try {
      const previewPoints = await loyaltyPointsService.calculateEarnedPoints(storeId, amount);
      if (previewPoints <= 0) {
        skippedNoPoints++;
        continue;
      }

      const result = await loyaltyPointsService.earnPointsFromPayment(
        customerId,
        storeId,
        amount,
        paymentId
      );

      if (result.points > 0) {
        processed++;
        awardedPoints += result.points;
      } else {
        skippedNoPoints++;
      }
    } catch (error) {
      failed++;
      console.error(`[Backfill] Failed payment ${paymentId}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(
    `[Backfill] Store ${storeId} done: processed=${processed}, awardedPoints=${awardedPoints}, skippedExisting=${skippedExisting}, skippedNoPoints=${skippedNoPoints}, failed=${failed}`
  );

  return {
    storeId,
    processed,
    awardedPoints,
    skippedExisting,
    skippedNoPoints,
    failed,
    totalPayments: payments.length,
  };
}

async function backfillStoreWithoutTransactions(storeId: string) {
  console.log(`\n[Backfill] Processing store: ${storeId} (no LoyaltyPointsTransactions table)`);

  const customerTotals = await query<CustomerPaymentTotalRow>(
    `SELECT
       customer_id,
       SUM(CAST(amount AS FLOAT)) AS total_amount
     FROM Payments
     WHERE store_id = @storeId
       AND customer_id IS NOT NULL
       AND ISNULL(amount, 0) > 0
     GROUP BY customer_id`,
    { storeId }
  );

  let processed = 0;
  let skippedExisting = 0;
  let skippedNoPoints = 0;
  let awardedPoints = 0;
  let failed = 0;

  for (const row of customerTotals) {
    const customerId = row.customer_id;
    const totalAmount = Number(row.total_amount || 0);

    if (!customerId || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      skippedNoPoints++;
      continue;
    }

    try {
      const customer = await customersSPRepository.getById(customerId, storeId);
      if (!customer) {
        failed++;
        continue;
      }

      const targetPoints = await loyaltyPointsService.calculateEarnedPoints(storeId, totalAmount);
      if (targetPoints <= 0) {
        skippedNoPoints++;
        continue;
      }

      const currentPoints = Number(customer.lifetimePoints ?? customer.loyaltyPoints ?? 0);
      if (targetPoints <= currentPoints) {
        skippedExisting++;
        continue;
      }

      await customersSPRepository.update(customerId, storeId, {
        lifetimePoints: targetPoints,
        loyaltyPoints: targetPoints,
      });

      processed++;
      awardedPoints += targetPoints - currentPoints;
    } catch (error) {
      failed++;
      console.error(`[Backfill] Failed customer ${customerId}:`, error instanceof Error ? error.message : error);
    }
  }

  // Re-evaluate tiers after setting points in aggregate mode
  try {
    await loyaltyPointsService.recalculateAllTiers(storeId);
  } catch (error) {
    console.warn(`[Backfill] Tier recalculate warning for store ${storeId}:`, error instanceof Error ? error.message : error);
  }

  console.log(
    `[Backfill] Store ${storeId} done: processed=${processed}, awardedPoints=${awardedPoints}, skippedExisting=${skippedExisting}, skippedNoPoints=${skippedNoPoints}, failed=${failed}`
  );

  return {
    storeId,
    processed,
    awardedPoints,
    skippedExisting,
    skippedNoPoints,
    failed,
    totalPayments: customerTotals.length,
  };
}

async function run() {
  console.log('[Backfill] Starting payment loyalty backfill...');

  const hasPayments = await tableExists('Payments');
  const hasTransactions = await tableExists('LoyaltyPointsTransactions');

  if (!hasPayments) {
    console.error('[Backfill] Payments table not found. Stop.');
    return;
  }

  console.log(
    hasTransactions
      ? '[Backfill] LoyaltyPointsTransactions detected: using per-payment idempotent mode.'
      : '[Backfill] LoyaltyPointsTransactions missing: using aggregate fallback mode.'
  );

  const stores = await query<StoreRow>(
    `SELECT DISTINCT store_id
     FROM Payments
     WHERE store_id IS NOT NULL`
  );

  if (stores.length === 0) {
    console.log('[Backfill] No stores with payments found. Nothing to do.');
    return;
  }

  let grandProcessed = 0;
  let grandAwardedPoints = 0;
  let grandSkippedExisting = 0;
  let grandSkippedNoPoints = 0;
  let grandFailed = 0;

  for (const store of stores) {
    const summary = hasTransactions
      ? await backfillStoreWithTransactions(store.store_id)
      : await backfillStoreWithoutTransactions(store.store_id);
    grandProcessed += summary.processed;
    grandAwardedPoints += summary.awardedPoints;
    grandSkippedExisting += summary.skippedExisting;
    grandSkippedNoPoints += summary.skippedNoPoints;
    grandFailed += summary.failed;
  }

  console.log('\n[Backfill] Completed.');
  console.log(
    `[Backfill] Summary: processed=${grandProcessed}, awardedPoints=${grandAwardedPoints}, skippedExisting=${grandSkippedExisting}, skippedNoPoints=${grandSkippedNoPoints}, failed=${grandFailed}`
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Backfill] Fatal error:', error);
    process.exit(1);
  });
