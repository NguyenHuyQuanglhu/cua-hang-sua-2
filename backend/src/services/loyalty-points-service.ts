import { loyaltyPointsRepository } from '../repositories/loyalty-points-repository';
import { customersSPRepository } from '../repositories/customers-sp-repository';
import { settingsSPRepository } from '../repositories/settings-sp-repository';
import { notificationGeneratorService } from './notification-generator.service';

/**
 * Calculate loyalty tier based on lifetime points
 */
type CanonicalTierName = 'bronze' | 'silver' | 'gold' | 'diamond';

interface LoyaltyTierConfig {
  name: CanonicalTierName;
  threshold: number;
}

interface LoyaltySettingsPayload {
  loyalty?: {
    tiers?: Array<{
      name?: string;
      threshold?: number;
    }>;
  };
}

const DEFAULT_TIERS: LoyaltyTierConfig[] = [
  { name: 'diamond', threshold: 10000 },
  { name: 'gold', threshold: 5000 },
  { name: 'silver', threshold: 1000 },
  { name: 'bronze', threshold: 0 },
];

const TIER_ALIAS_MAP: Record<string, CanonicalTierName> = {
  bronze: 'bronze',
  dong: 'bronze',
  silver: 'silver',
  bac: 'silver',
  gold: 'gold',
  vang: 'gold',
  diamond: 'diamond',
  kimcuong: 'diamond',
};

function normalizeTierName(value: unknown): CanonicalTierName | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return null;
  }

  const compactRaw = raw.replace(/\s+/g, '');
  const ascii = compactRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

  return TIER_ALIAS_MAP[compactRaw] || TIER_ALIAS_MAP[ascii] || null;
}

function normalizeTiers(rawTiers: Array<{ name?: string; threshold?: number }> | undefined): LoyaltyTierConfig[] {
  if (!rawTiers || rawTiers.length === 0) {
    return DEFAULT_TIERS;
  }

  const tierThresholdMap = new Map<CanonicalTierName, number>();

  for (const tier of rawTiers) {
    const normalizedName = normalizeTierName(tier.name);
    const threshold = Number(tier.threshold ?? 0);

    if (!normalizedName || !Number.isFinite(threshold)) {
      continue;
    }

    const currentThreshold = tierThresholdMap.get(normalizedName);
    if (currentThreshold === undefined || threshold > currentThreshold) {
      tierThresholdMap.set(normalizedName, threshold);
    }
  }

  if (tierThresholdMap.size === 0) {
    return DEFAULT_TIERS;
  }

  if (!tierThresholdMap.has('bronze')) {
    tierThresholdMap.set('bronze', 0);
  }

  return Array.from(tierThresholdMap.entries())
    .map(([name, threshold]) => ({ name, threshold }))
    .sort((a, b) => b.threshold - a.threshold);
}

function calculateLoyaltyTier(lifetimePoints: number, tiers: LoyaltyTierConfig[]): string {
  for (const tier of tiers) {
    if (lifetimePoints >= tier.threshold) {
      return tier.name;
    }
  }

  return 'bronze';
}

/**
 * Service for managing loyalty points operations
 */
export class LoyaltyPointsService {
  private async getConfiguredTiers(storeId: string): Promise<LoyaltyTierConfig[]> {
    try {
      const settings = await settingsSPRepository.getByStore(storeId) as LoyaltySettingsPayload;
      return normalizeTiers(settings?.loyalty?.tiers);
    } catch {
      return DEFAULT_TIERS;
    }
  }

  /**
   * Calculate points earned from a purchase amount
   */
  async calculateEarnedPoints(
    storeId: string,
    purchaseAmount: number
  ): Promise<number> {
    const settings = await loyaltyPointsRepository.getSettings(storeId);
    if (!settings || !settings.enabled) {
      return 0;
    }

    return Math.floor(purchaseAmount * settings.earnRate);
  }

  /**
   * Calculate discount amount from points
   */
  async calculatePointsDiscount(
    storeId: string,
    points: number
  ): Promise<number> {
    const settings = await loyaltyPointsRepository.getSettings(storeId);
    if (!settings || !settings.enabled) {
      return 0;
    }

    return points * settings.redeemRate;
  }

  /**
   * Earn points from a sale
   */
  async earnPoints(
    customerId: string,
    storeId: string,
    purchaseAmount: number,
    saleId: string,
    userId?: string
  ): Promise<{ points: number; newBalance: number; newTier?: string; tierUpgraded?: boolean }> {
    const settings = await loyaltyPointsRepository.getSettings(storeId);
    if (!settings || !settings.enabled) {
      return { points: 0, newBalance: 0 };
    }

    const points = await this.calculateEarnedPoints(storeId, purchaseAmount);
    if (points <= 0) {
      return { points: 0, newBalance: 0 };
    }

    const currentBalance = await loyaltyPointsRepository.getBalance(customerId, storeId);
    const newBalance = currentBalance + points;

    // Get current customer info to check tier change
    const customers = await customersSPRepository.getByStore(storeId);
    const customer = customers.find(c => c.id === customerId);
    const oldTier = customer?.loyaltyTier || 'bronze';

    await loyaltyPointsRepository.addTransaction({
      storeId,
      customerId,
      transactionType: 'earn',
      points,
      referenceType: 'sale',
      referenceId: saleId,
      description: `Tích điểm từ đơn hàng ${saleId}`,
      balanceAfter: newBalance,
      createdBy: userId,
    });

    // Calculate new loyalty tier
    const tiers = await this.getConfiguredTiers(storeId);
    const newTier = calculateLoyaltyTier(newBalance, tiers);
    const tierUpgraded = oldTier !== newTier;

    // Update customer's lifetime_points and loyalty tier using SP Repository
    await customersSPRepository.update(customerId, storeId, {
      lifetimePoints: newBalance,
      loyaltyTier: newTier,
    });

    // Create notification if tier upgraded
    if (tierUpgraded && customer) {
      await notificationGeneratorService.createTierUpgradeNotification(
        customerId,
        customer.name || 'Khách hàng',
        storeId,
        oldTier,
        newTier,
        newBalance
      );
    }

    return { points, newBalance, newTier, tierUpgraded };
  }

  /**
   * Redeem points for a discount
   */
  async redeemPoints(
    customerId: string,
    storeId: string,
    pointsToRedeem: number,
    orderAmount: number,
    saleId: string,
    userId?: string
  ): Promise<{ discount: number; newBalance: number; newTier?: string }> {
    const settings = await loyaltyPointsRepository.getSettings(storeId);
    if (!settings || !settings.enabled) {
      throw new Error('Loyalty points system is not enabled');
    }

    // Validate minimum points
    if (pointsToRedeem < settings.minPointsToRedeem) {
      throw new Error(
        `Minimum ${settings.minPointsToRedeem} points required to redeem`
      );
    }

    // Check current balance
    const currentBalance = await loyaltyPointsRepository.getBalance(customerId, storeId);
    if (pointsToRedeem > currentBalance) {
      throw new Error('Insufficient points balance');
    }

    // Calculate discount
    const discount = await this.calculatePointsDiscount(storeId, pointsToRedeem);

    // Validate max redeem percentage
    const maxDiscount = (orderAmount * settings.maxRedeemPercentage) / 100;
    if (discount > maxDiscount) {
      throw new Error(
        `Maximum ${settings.maxRedeemPercentage}% of order can be paid with points`
      );
    }

    const newBalance = currentBalance - pointsToRedeem;

    await loyaltyPointsRepository.addTransaction({
      storeId,
      customerId,
      transactionType: 'redeem',
      points: -pointsToRedeem,
      referenceType: 'sale',
      referenceId: saleId,
      description: `Đổi ${pointsToRedeem} điểm cho đơn hàng ${saleId}`,
      balanceAfter: newBalance,
      createdBy: userId,
    });

    // Calculate new loyalty tier (points might have decreased)
    const tiers = await this.getConfiguredTiers(storeId);
    const newTier = calculateLoyaltyTier(newBalance, tiers);

    // Update customer's lifetime_points and loyalty tier using SP Repository
    await customersSPRepository.update(customerId, storeId, {
      lifetimePoints: newBalance,
      loyaltyTier: newTier,
    });

    return { discount, newBalance, newTier };
  }

  /**
   * Adjust points manually (admin function)
   */
  async adjustPoints(
    customerId: string,
    storeId: string,
    pointsAdjustment: number,
    reason: string,
    userId: string
  ): Promise<{ newBalance: number; newTier?: string }> {
    const currentBalance = await loyaltyPointsRepository.getBalance(customerId, storeId);
    const newBalance = currentBalance + pointsAdjustment;

    if (newBalance < 0) {
      throw new Error('Cannot adjust points below zero');
    }

    await loyaltyPointsRepository.addTransaction({
      storeId,
      customerId,
      transactionType: 'adjustment',
      points: pointsAdjustment,
      referenceType: 'manual',
      description: reason,
      balanceAfter: newBalance,
      createdBy: userId,
    });

    // Calculate new loyalty tier
    const tiers = await this.getConfiguredTiers(storeId);
    const newTier = calculateLoyaltyTier(newBalance, tiers);

    // Update customer's lifetime_points and loyalty tier using SP Repository
    await customersSPRepository.update(customerId, storeId, {
      lifetimePoints: newBalance,
      loyaltyTier: newTier,
    });

    return { newBalance, newTier };
  }

  /**
   * Get customer points balance
   */
  async getBalance(customerId: string, storeId: string): Promise<number> {
    return loyaltyPointsRepository.getBalance(customerId, storeId);
  }

  /**
   * Get customer points history
   */
  async getHistory(customerId: string, storeId: string, limit: number = 50) {
    return loyaltyPointsRepository.getHistory(customerId, storeId, limit);
  }

  /**
   * Get loyalty points settings
   */
  async getSettings(storeId: string) {
    return loyaltyPointsRepository.getSettings(storeId);
  }

  /**
   * Update loyalty points settings
   */
  async updateSettings(storeId: string, settings: any) {
    return loyaltyPointsRepository.updateSettings(storeId, settings);
  }

  /**
   * Validate points redemption
   */
  async validateRedemption(
    customerId: string,
    storeId: string,
    pointsToRedeem: number,
    orderAmount: number
  ): Promise<{
    valid: boolean;
    error?: string;
    maxPoints?: number;
    discount?: number;
  }> {
    const settings = await loyaltyPointsRepository.getSettings(storeId);
    if (!settings || !settings.enabled) {
      return { valid: false, error: 'Loyalty points system is not enabled' };
    }

    if (pointsToRedeem < settings.minPointsToRedeem) {
      return {
        valid: false,
        error: `Minimum ${settings.minPointsToRedeem} points required`,
      };
    }

    const currentBalance = await loyaltyPointsRepository.getBalance(customerId, storeId);
    if (pointsToRedeem > currentBalance) {
      return {
        valid: false,
        error: 'Insufficient points',
        maxPoints: currentBalance,
      };
    }

    const discount = await this.calculatePointsDiscount(storeId, pointsToRedeem);
    const maxDiscount = (orderAmount * settings.maxRedeemPercentage) / 100;

    if (discount > maxDiscount) {
      const maxPoints = Math.floor(maxDiscount / settings.redeemRate);
      return {
        valid: false,
        error: `Maximum ${settings.maxRedeemPercentage}% of order can be paid with points`,
        maxPoints,
      };
    }

    return { valid: true, discount };
  }

  /**
   * Recalculate loyalty tiers for all customers in a store
   */
  async recalculateAllTiers(storeId: string): Promise<{ updated: number }> {
    try {
      // Get all customers with their current lifetime points
      const customers = await customersSPRepository.getByStore(storeId);
      const tiers = await this.getConfiguredTiers(storeId);
      let updatedCount = 0;

      for (const customer of customers) {
        const lifetimePoints = customer.lifetimePoints || 0;
        const currentTier = customer.loyaltyTier;
        const newTier = calculateLoyaltyTier(lifetimePoints, tiers);

        // Only update if tier has changed
        if (currentTier !== newTier) {
          await customersSPRepository.update(customer.id, storeId, {
            loyaltyTier: newTier,
          });
          updatedCount++;
        }
      }

      return { updated: updatedCount };
    } catch (error) {
      console.error('Error recalculating loyalty tiers:', error);
      throw error;
    }
  }

  /**
   * Get loyalty tier information
   */
  getTierInfo(tier: string): { name: string; vietnameseName: string; minPoints: number } {
    const tiers = {
      bronze: { name: 'bronze', vietnameseName: 'Đồng', minPoints: 0 },
      silver: { name: 'silver', vietnameseName: 'Bạc', minPoints: 1000 },
      gold: { name: 'gold', vietnameseName: 'Vàng', minPoints: 5000 },
      diamond: { name: 'diamond', vietnameseName: 'Kim Cương', minPoints: 10000 },
    };

    return tiers[tier as keyof typeof tiers] || tiers.bronze;
  }
}

// Export singleton instance
export const loyaltyPointsService = new LoyaltyPointsService();
