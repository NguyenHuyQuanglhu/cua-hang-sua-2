/**
 * Sales API Routes Integration Tests
 * Feature: pos-sales-ui-improvements
 * 
 * Tests for the Sales API routes to verify:
 * - GET /api/sales supports status filtering and returns counts
 * - POST /api/sales sets default status="pending"
 * - PATCH /api/sales/:id allows status updates with validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import salesRouter from './sales';

// Mock dependencies
vi.mock('../db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner', tenantId: 'tenant-1' };
    next();
  },
  storeContext: (req: any, res: any, next: any) => {
    req.storeId = 'store-1';
    next();
  },
}));

vi.mock('../services', () => ({
  salesService: {
    createSale: vi.fn(),
  },
  InventoryInsufficientStockError: class InventoryInsufficientStockError extends Error {
    constructor(
      message: string,
      public productId: string,
      public requestedQuantity: number,
      public availableQuantity: number,
      public unitId?: string
    ) {
      super(message);
    }
  },
}));

vi.mock('../repositories/sales-sp-repository', () => ({
  salesSPRepository: {
    getByStore: vi.fn(),
    getById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../services/pdf-invoice-service', () => ({
  getSaleForInvoice: vi.fn(),
  generateInvoicePDF: vi.fn(),
}));

describe('Sales API Routes - POS Sales UI Improvements', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sales', salesRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/sales - Status Filtering and Counts', () => {
    it('should return status counts in response', async () => {
      const { salesSPRepository } = await import('../repositories/sales-sp-repository');
      
      // Mock sales data with different statuses
      (salesSPRepository.getByStore as any).mockResolvedValue([
        { id: '1', status: 'pending', invoiceNumber: 'PN001', createdBy: 'user-1' },
        { id: '2', status: 'pending', invoiceNumber: 'PN002', createdBy: 'user-1' },
        { id: '3', status: 'processed', invoiceNumber: 'PN003', createdBy: 'user-1' },
      ]);

      const { query } = await import('../db');
      (query as any).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/sales')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.counts).toEqual({
        pending: 2,
        processed: 1,
      });
    });

    it('should filter by status=pending', async () => {
      const { salesSPRepository } = await import('../repositories/sales-sp-repository');
      
      (salesSPRepository.getByStore as any).mockResolvedValue([
        { id: '1', status: 'pending', invoiceNumber: 'PN001', createdBy: 'user-1' },
      ]);

      const { query } = await import('../db');
      (query as any).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/sales?status=pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(salesSPRepository.getByStore).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should normalize old status values in query', async () => {
      const { salesSPRepository } = await import('../repositories/sales-sp-repository');
      
      (salesSPRepository.getByStore as any).mockResolvedValue([]);

      const { query } = await import('../db');
      (query as any).mockResolvedValue([]);

      // Send old status value "draft" - should be normalized to "pending"
      const response = await request(app)
        .get('/api/sales?status=draft')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(salesSPRepository.getByStore).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({ status: 'pending' })
      );
    });
  });

  describe('POST /api/sales - Default Status', () => {
    it('should set default status="pending" when not provided', async () => {
      const { salesService } = await import('../services');
      
      (salesService.createSale as any).mockResolvedValue({
        sale: {
          id: 'sale-1',
          invoiceNumber: 'PN001',
          status: 'pending',
          finalAmount: 100,
        },
        conversions: [],
      });

      const response = await request(app)
        .post('/api/sales')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
          totalAmount: 100,
          finalAmount: 100,
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
      expect(salesService.createSale).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
        'store-1',
        'user-1'
      );
    });

    it('should accept explicit status="processed"', async () => {
      const { salesService } = await import('../services');
      
      (salesService.createSale as any).mockResolvedValue({
        sale: {
          id: 'sale-1',
          invoiceNumber: 'PN001',
          status: 'processed',
          finalAmount: 100,
        },
        conversions: [],
      });

      const response = await request(app)
        .post('/api/sales')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
          totalAmount: 100,
          finalAmount: 100,
          status: 'processed',
        })
        .expect(201);

      expect(response.body.status).toBe('processed');
    });

    it('should normalize old status values', async () => {
      const { salesService } = await import('../services');
      
      (salesService.createSale as any).mockResolvedValue({
        sale: {
          id: 'sale-1',
          invoiceNumber: 'PN001',
          status: 'pending',
          finalAmount: 100,
        },
        conversions: [],
      });

      // Send old status "draft" - should be normalized to "pending"
      const response = await request(app)
        .post('/api/sales')
        .send({
          items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
          totalAmount: 100,
          finalAmount: 100,
          status: 'draft',
        })
        .expect(201);

      expect(salesService.createSale).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
        'store-1',
        'user-1'
      );
    });
  });

  describe('PATCH /api/sales/:id - Status Updates', () => {
    it('should update status with validation', async () => {
      const { salesSPRepository } = await import('../repositories/sales-sp-repository');
      
      (salesSPRepository.updateStatus as any).mockResolvedValue(true);

      const response = await request(app)
        .patch('/api/sales/sale-1')
        .send({ status: 'processed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(salesSPRepository.updateStatus).toHaveBeenCalledWith(
        'sale-1',
        'store-1',
        'processed'
      );
    });

    it('should normalize old status values', async () => {
      const { salesSPRepository } = await import('../repositories/sales-sp-repository');
      
      (salesSPRepository.updateStatus as any).mockResolvedValue(true);

      // Send old status "completed" - should be normalized to "processed"
      const response = await request(app)
        .patch('/api/sales/sale-1')
        .send({ status: 'completed' })
        .expect(200);

      expect(salesSPRepository.updateStatus).toHaveBeenCalledWith(
        'sale-1',
        'store-1',
        'processed'
      );
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .patch('/api/sales/sale-1')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });
});
