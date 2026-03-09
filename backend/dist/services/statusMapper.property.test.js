"use strict";
/**
 * Property-Based Tests for StatusMapper Service
 * Feature: pos-sales-ui-improvements
 *
 * These tests use fast-check to verify correctness properties across many random inputs.
 * Each property test runs 100 iterations to ensure robustness.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const statusMapper_1 = require("./statusMapper");
(0, vitest_1.describe)('StatusMapper - Property-Based Tests', () => {
    // Feature: pos-sales-ui-improvements, Property 8: Mapping trạng thái cũ sang mới
    // **Validates: Requirements 2.8, 2.9**
    (0, vitest_1.describe)('Property 8: Old status to new status mapping', () => {
        (0, vitest_1.it)('should always map draft and printed to pending', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed'), (oldStatus) => {
                const newStatus = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                (0, vitest_1.expect)(newStatus).toBe('pending');
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should always map completed and cancelled to processed', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('completed', 'cancelled'), (oldStatus) => {
                const newStatus = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                (0, vitest_1.expect)(newStatus).toBe('processed');
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should map all old statuses to exactly one of the two new statuses', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled'), (oldStatus) => {
                const newStatus = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                // Must be one of the two valid new statuses
                (0, vitest_1.expect)(['pending', 'processed']).toContain(newStatus);
                // Must be a valid new status
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus(newStatus)).toBe(true);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should produce deterministic mappings (same input always produces same output)', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled'), (oldStatus) => {
                const result1 = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                const result2 = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                // Same input should always produce same output
                (0, vitest_1.expect)(result1).toBe(result2);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Normalize function correctness', () => {
        (0, vitest_1.it)('should accept and preserve valid new statuses', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('pending', 'processed'), (newStatus) => {
                const normalized = statusMapper_1.StatusMapper.normalize(newStatus);
                // Should return the same status
                (0, vitest_1.expect)(normalized).toBe(newStatus);
                // Should be a valid new status
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus(normalized)).toBe(true);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should convert all old statuses to valid new statuses', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled'), (oldStatus) => {
                const normalized = statusMapper_1.StatusMapper.normalize(oldStatus);
                // Result must be a valid new status
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus(normalized)).toBe(true);
                // Result must match the mapping rule
                (0, vitest_1.expect)(normalized).toBe(statusMapper_1.StatusMapper.mapOldToNew(oldStatus));
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should handle mixed old and new status inputs consistently', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled', 'pending', 'processed'), (status) => {
                const normalized = statusMapper_1.StatusMapper.normalize(status);
                // Result must always be a valid new status
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus(normalized)).toBe(true);
                // Normalizing again should produce the same result (idempotent)
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize(normalized)).toBe(normalized);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should throw error for invalid status values', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string().filter(s => s !== 'draft' &&
                s !== 'printed' &&
                s !== 'completed' &&
                s !== 'cancelled' &&
                s !== 'pending' &&
                s !== 'processed'), (invalidStatus) => {
                (0, vitest_1.expect)(() => statusMapper_1.StatusMapper.normalize(invalidStatus)).toThrow();
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Status validation correctness', () => {
        (0, vitest_1.it)('should only accept pending and processed as valid new statuses', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string(), (status) => {
                const isValid = statusMapper_1.StatusMapper.isValidNewStatus(status);
                if (isValid) {
                    // If valid, must be exactly 'pending' or 'processed'
                    (0, vitest_1.expect)(['pending', 'processed']).toContain(status);
                }
                else {
                    // If invalid, must not be 'pending' or 'processed'
                    (0, vitest_1.expect)(['pending', 'processed']).not.toContain(status);
                }
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should reject all old status values as new statuses', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled'), (oldStatus) => {
                // Old statuses should not be valid new statuses
                (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus(oldStatus)).toBe(false);
            }), { numRuns: 100 });
        });
    });
    (0, vitest_1.describe)('Property: Mapping completeness and correctness', () => {
        (0, vitest_1.it)('should ensure every old status maps to exactly one new status', () => {
            const oldStatuses = ['draft', 'printed', 'completed', 'cancelled'];
            const newStatuses = ['pending', 'processed'];
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom(...oldStatuses), (oldStatus) => {
                const mapped = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                // Must map to exactly one of the new statuses
                (0, vitest_1.expect)(newStatuses).toContain(mapped);
                // Count should be 1 (not 0, not more than 1)
                const count = newStatuses.filter(s => s === mapped).length;
                (0, vitest_1.expect)(count).toBe(1);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)('should maintain the mapping invariant: pending statuses are incomplete, processed are complete', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom('draft', 'printed', 'completed', 'cancelled'), (oldStatus) => {
                const newStatus = statusMapper_1.StatusMapper.mapOldToNew(oldStatus);
                // Semantic invariant: draft and printed are incomplete → pending
                if (oldStatus === 'draft' || oldStatus === 'printed') {
                    (0, vitest_1.expect)(newStatus).toBe('pending');
                }
                // Semantic invariant: completed and cancelled are complete → processed
                if (oldStatus === 'completed' || oldStatus === 'cancelled') {
                    (0, vitest_1.expect)(newStatus).toBe('processed');
                }
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=statusMapper.property.test.js.map