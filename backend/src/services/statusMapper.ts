/**
 * Status Mapper Service
 * Feature: pos-sales-ui-improvements
 * 
 * This service handles the mapping between old status values (draft, printed, completed, cancelled)
 * and new status values (pending, processed) to ensure backward compatibility during the transition period.
 * 
 * Mapping Rules:
 * - 'draft' → 'pending'
 * - 'printed' → 'pending'
 * - 'completed' → 'processed'
 * - 'cancelled' → 'processed'
 */

import { OrderStatus, LegacyOrderStatus } from '../types/sales';

/**
 * StatusMapper class provides methods to map between old and new status values
 */
export class StatusMapper {
  /**
   * Mapping from old status values to new status values
   */
  private static readonly OLD_TO_NEW_MAPPING: Record<LegacyOrderStatus, OrderStatus> = {
    'draft': 'pending',
    'printed': 'pending',
    'completed': 'processed',
    'cancelled': 'processed'
  };

  /**
   * Map old status to new status
   * 
   * @param oldStatus - The legacy status value
   * @returns The corresponding new status value
   * 
   * @example
   * StatusMapper.mapOldToNew('draft') // returns 'pending'
   * StatusMapper.mapOldToNew('completed') // returns 'processed'
   */
  static mapOldToNew(oldStatus: LegacyOrderStatus): OrderStatus {
    return this.OLD_TO_NEW_MAPPING[oldStatus];
  }

  /**
   * Validate if a status is a valid new status value
   * 
   * @param status - The status value to validate
   * @returns True if the status is 'pending' or 'processed'
   * 
   * @example
   * StatusMapper.isValidNewStatus('pending') // returns true
   * StatusMapper.isValidNewStatus('draft') // returns false
   */
  static isValidNewStatus(status: string): status is OrderStatus {
    return status === 'pending' || status === 'processed';
  }

  /**
   * Normalize status value - accepts both old and new status values, returns new status
   * 
   * If the status is already a new status value, it returns it as-is.
   * If the status is an old status value, it maps it to the corresponding new status.
   * 
   * @param status - The status value to normalize (can be old or new)
   * @returns The normalized new status value
   * @throws Error if the status is not a valid old or new status value
   * 
   * @example
   * StatusMapper.normalize('pending') // returns 'pending'
   * StatusMapper.normalize('draft') // returns 'pending'
   * StatusMapper.normalize('completed') // returns 'processed'
   * StatusMapper.normalize('invalid') // throws Error
   */
  static normalize(status: string): OrderStatus {
    // If it's already a valid new status, return it
    if (this.isValidNewStatus(status)) {
      return status;
    }

    // Check if it's a valid old status
    if (this.isValidOldStatus(status)) {
      return this.mapOldToNew(status as LegacyOrderStatus);
    }

    // Invalid status value
    throw new Error(
      `Invalid status value: "${status}". Must be one of: pending, processed, draft, printed, completed, cancelled`
    );
  }

  /**
   * Check if a status is a valid old (legacy) status value
   * 
   * @param status - The status value to check
   * @returns True if the status is a valid legacy status
   * 
   * @example
   * StatusMapper.isValidOldStatus('draft') // returns true
   * StatusMapper.isValidOldStatus('pending') // returns false
   */
  private static isValidOldStatus(status: string): status is LegacyOrderStatus {
    return status === 'draft' || 
           status === 'printed' || 
           status === 'completed' || 
           status === 'cancelled';
  }
}
