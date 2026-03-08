/**
 * Fast-check setup verification test
 * Feature: pos-sales-ui-improvements
 * 
 * This test verifies that fast-check is properly installed and configured.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PROPERTY_TEST_CONFIG } from './fast-check.config';

describe('Fast-check Setup', () => {
  it('should be properly installed and working', () => {
    // Simple property: adding zero to any number returns the same number
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(n + 0).toBe(n);
      }),
      { numRuns: 100 }
    );
  });

  it('should use the configured number of runs', () => {
    expect(PROPERTY_TEST_CONFIG.numRuns).toBe(100);
  });

  it('should generate boolean values', () => {
    fc.assert(
      fc.property(fc.boolean(), (value) => {
        expect(typeof value).toBe('boolean');
      }),
      PROPERTY_TEST_CONFIG
    );
  });

  it('should generate string values', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(typeof value).toBe('string');
      }),
      PROPERTY_TEST_CONFIG
    );
  });
});
