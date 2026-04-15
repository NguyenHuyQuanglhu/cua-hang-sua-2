/**
 * Fast-check configuration for property-based testing
 * Feature: pos-sales-ui-improvements
 * 
 * All property tests should run with at least 100 iterations
 * as specified in the design document.
 */

export const PROPERTY_TEST_CONFIG = {
  numRuns: 100,
  verbose: false,
  seed: undefined, // Use random seed by default
};

/**
 * Default configuration for property tests
 */
export const defaultPropertyTestConfig = {
  ...PROPERTY_TEST_CONFIG,
};
