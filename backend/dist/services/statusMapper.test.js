"use strict";
/**
 * Unit Tests for StatusMapper Service
 * Feature: pos-sales-ui-improvements
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const statusMapper_1 = require("./statusMapper");
(0, vitest_1.describe)('StatusMapper', () => {
    (0, vitest_1.describe)('mapOldToNew', () => {
        (0, vitest_1.it)('should map draft to pending', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.mapOldToNew('draft')).toBe('pending');
        });
        (0, vitest_1.it)('should map printed to pending', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.mapOldToNew('printed')).toBe('pending');
        });
        (0, vitest_1.it)('should map completed to processed', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.mapOldToNew('completed')).toBe('processed');
        });
        (0, vitest_1.it)('should map cancelled to processed', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.mapOldToNew('cancelled')).toBe('processed');
        });
    });
    (0, vitest_1.describe)('isValidNewStatus', () => {
        (0, vitest_1.it)('should return true for pending', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus('pending')).toBe(true);
        });
        (0, vitest_1.it)('should return true for processed', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus('processed')).toBe(true);
        });
        (0, vitest_1.it)('should return false for draft', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus('draft')).toBe(false);
        });
        (0, vitest_1.it)('should return false for invalid status', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.isValidNewStatus('invalid')).toBe(false);
        });
    });
    (0, vitest_1.describe)('normalize', () => {
        (0, vitest_1.it)('should return pending as-is', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('pending')).toBe('pending');
        });
        (0, vitest_1.it)('should return processed as-is', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('processed')).toBe('processed');
        });
        (0, vitest_1.it)('should normalize draft to pending', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('draft')).toBe('pending');
        });
        (0, vitest_1.it)('should normalize printed to pending', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('printed')).toBe('pending');
        });
        (0, vitest_1.it)('should normalize completed to processed', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('completed')).toBe('processed');
        });
        (0, vitest_1.it)('should normalize cancelled to processed', () => {
            (0, vitest_1.expect)(statusMapper_1.StatusMapper.normalize('cancelled')).toBe('processed');
        });
        (0, vitest_1.it)('should throw error for invalid status', () => {
            (0, vitest_1.expect)(() => statusMapper_1.StatusMapper.normalize('invalid')).toThrow('Invalid status value: "invalid". Must be one of: pending, processed, draft, printed, completed, cancelled');
        });
        (0, vitest_1.it)('should throw error for empty string', () => {
            (0, vitest_1.expect)(() => statusMapper_1.StatusMapper.normalize('')).toThrow();
        });
    });
});
//# sourceMappingURL=statusMapper.test.js.map