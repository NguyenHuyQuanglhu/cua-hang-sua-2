/**
 * Property-Based Tests for StatusMapper Service
 * Feature: pos-sales-ui-improvements
 * 
 * These tests use fast-check to verify correctness properties across many random inputs.
 * Each property test runs 100 iterations to ensure robustness.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { StatusMapper } from './statusMapper';
import { OrderStatus, LegacyOrderStatus } from '../types/sales';

describe('StatusMapper - Property-Based Tests', () => {
  // Feature: pos-sales-ui-improvements, Property 8: Mapping trạng thái cũ sang mới
  // **Validates: Requirements 2.8, 2.9**
  describe('Property 8: Old status to new status mapping', () => {
    it('should always map draft and printed to pending', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed'),
          (oldStatus) => {
            const newStatus = StatusMapper.mapOldToNew(oldStatus);
            expect(newStatus).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always map completed and cancelled to processed', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('completed', 'cancelled'),
          (oldStatus) => {
            const newStatus = StatusMapper.mapOldToNew(oldStatus);
            expect(newStatus).toBe('processed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map all old statuses to exactly one of the two new statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed', 'completed', 'cancelled'),
          (oldStatus) => {
            const newStatus = StatusMapper.mapOldToNew(oldStatus);
            
            // Must be one of the two valid new statuses
            expect(['pending', 'processed']).toContain(newStatus);
            
            // Must be a valid new status
            expect(StatusMapper.isValidNewStatus(newStatus)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce deterministic mappings (same input always produces same output)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed', 'completed', 'cancelled'),
          (oldStatus) => {
            const result1 = StatusMapper.mapOldToNew(oldStatus);
            const result2 = StatusMapper.mapOldToNew(oldStatus);
            
            // Same input should always produce same output
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Normalize function correctness', () => {
    it('should accept and preserve valid new statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<OrderStatus>('pending', 'processed'),
          (newStatus) => {
            const normalized = StatusMapper.normalize(newStatus);
            
            // Should return the same status
            expect(normalized).toBe(newStatus);
            
            // Should be a valid new status
            expect(StatusMapper.isValidNewStatus(normalized)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert all old statuses to valid new statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed', 'completed', 'cancelled'),
          (oldStatus) => {
            const normalized = StatusMapper.normalize(oldStatus);
            
            // Result must be a valid new status
            expect(StatusMapper.isValidNewStatus(normalized)).toBe(true);
            
            // Result must match the mapping rule
            expect(normalized).toBe(StatusMapper.mapOldToNew(oldStatus));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed old and new status inputs consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('draft', 'printed', 'completed', 'cancelled', 'pending', 'processed'),
          (status) => {
            const normalized = StatusMapper.normalize(status);
            
            // Result must always be a valid new status
            expect(StatusMapper.isValidNewStatus(normalized)).toBe(true);
            
            // Normalizing again should produce the same result (idempotent)
            expect(StatusMapper.normalize(normalized)).toBe(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for invalid status values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => 
            s !== 'draft' && 
            s !== 'printed' && 
            s !== 'completed' && 
            s !== 'cancelled' && 
            s !== 'pending' && 
            s !== 'processed'
          ),
          (invalidStatus) => {
            expect(() => StatusMapper.normalize(invalidStatus)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Status validation correctness', () => {
    it('should only accept pending and processed as valid new statuses', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (status) => {
            const isValid = StatusMapper.isValidNewStatus(status);
            
            if (isValid) {
              // If valid, must be exactly 'pending' or 'processed'
              expect(['pending', 'processed']).toContain(status);
            } else {
              // If invalid, must not be 'pending' or 'processed'
              expect(['pending', 'processed']).not.toContain(status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all old status values as new statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed', 'completed', 'cancelled'),
          (oldStatus) => {
            // Old statuses should not be valid new statuses
            expect(StatusMapper.isValidNewStatus(oldStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Mapping completeness and correctness', () => {
    it('should ensure every old status maps to exactly one new status', () => {
      const oldStatuses: LegacyOrderStatus[] = ['draft', 'printed', 'completed', 'cancelled'];
      const newStatuses: OrderStatus[] = ['pending', 'processed'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...oldStatuses),
          (oldStatus) => {
            const mapped = StatusMapper.mapOldToNew(oldStatus);
            
            // Must map to exactly one of the new statuses
            expect(newStatuses).toContain(mapped);
            
            // Count should be 1 (not 0, not more than 1)
            const count = newStatuses.filter(s => s === mapped).length;
            expect(count).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain the mapping invariant: pending statuses are incomplete, processed are complete', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<LegacyOrderStatus>('draft', 'printed', 'completed', 'cancelled'),
          (oldStatus) => {
            const newStatus = StatusMapper.mapOldToNew(oldStatus);
            
            // Semantic invariant: draft and printed are incomplete → pending
            if (oldStatus === 'draft' || oldStatus === 'printed') {
              expect(newStatus).toBe('pending');
            }
            
            // Semantic invariant: completed and cancelled are complete → processed
            if (oldStatus === 'completed' || oldStatus === 'cancelled') {
              expect(newStatus).toBe('processed');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
