/**
 * Unit Tests for StatusMapper Service
 * Feature: pos-sales-ui-improvements
 */

import { describe, it, expect } from 'vitest';
import { StatusMapper } from './statusMapper';

describe('StatusMapper', () => {
  describe('mapOldToNew', () => {
    it('should map draft to pending', () => {
      expect(StatusMapper.mapOldToNew('draft')).toBe('pending');
    });

    it('should map printed to pending', () => {
      expect(StatusMapper.mapOldToNew('printed')).toBe('pending');
    });

    it('should map completed to processed', () => {
      expect(StatusMapper.mapOldToNew('completed')).toBe('processed');
    });

    it('should map cancelled to processed', () => {
      expect(StatusMapper.mapOldToNew('cancelled')).toBe('processed');
    });
  });

  describe('isValidNewStatus', () => {
    it('should return true for pending', () => {
      expect(StatusMapper.isValidNewStatus('pending')).toBe(true);
    });

    it('should return true for processed', () => {
      expect(StatusMapper.isValidNewStatus('processed')).toBe(true);
    });

    it('should return false for draft', () => {
      expect(StatusMapper.isValidNewStatus('draft')).toBe(false);
    });

    it('should return false for invalid status', () => {
      expect(StatusMapper.isValidNewStatus('invalid')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should return pending as-is', () => {
      expect(StatusMapper.normalize('pending')).toBe('pending');
    });

    it('should return processed as-is', () => {
      expect(StatusMapper.normalize('processed')).toBe('processed');
    });

    it('should normalize draft to pending', () => {
      expect(StatusMapper.normalize('draft')).toBe('pending');
    });

    it('should normalize printed to pending', () => {
      expect(StatusMapper.normalize('printed')).toBe('pending');
    });

    it('should normalize completed to processed', () => {
      expect(StatusMapper.normalize('completed')).toBe('processed');
    });

    it('should normalize cancelled to processed', () => {
      expect(StatusMapper.normalize('cancelled')).toBe('processed');
    });

    it('should throw error for invalid status', () => {
      expect(() => StatusMapper.normalize('invalid')).toThrow(
        'Invalid status value: "invalid". Must be one of: pending, processed, draft, printed, completed, cancelled'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => StatusMapper.normalize('')).toThrow();
    });
  });
});
