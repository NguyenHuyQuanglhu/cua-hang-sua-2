import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, storeContext } from '../middleware/auth';
import * as bulkImportService from '../services/bulk-import-service';

const router = Router();

// Configure multer for Excel file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// Download import template
router.get('/template', authenticate, async (req: Request, res: Response) => {
  try {
    const buffer = bulkImportService.generateImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=product-import-template.xlsx'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Export products to Excel
router.get(
  '/export',
  authenticate,
  storeContext,
  async (req: Request, res: Response) => {
    try {
      const storeId = (req as any).storeId;
      const tenantId = (req as any).user?.tenantId;

      if (!storeId || !tenantId) {
        return res.status(400).json({ error: 'Store context required' });
      }

      const includeInventory = req.query.includeInventory !== 'false';

      const buffer = await bulkImportService.exportProducts({
        storeId,
        tenantId,
        includeInventory,
      });

      const filename = `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting products:', error);
      res.status(500).json({ error: 'Failed to export products' });
    }
  }
);

// Import products from Excel
router.post(
  '/import',
  authenticate,
  storeContext,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const storeId = (req as any).storeId;
      const tenantId = (req as any).user?.tenantId;

      if (!storeId || !tenantId) {
        return res.status(400).json({ error: 'Store context required' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse Excel file
      const products = bulkImportService.parseProductsExcel(file.buffer);

      if (products.length === 0) {
        return res.status(400).json({ error: 'No valid products found in file' });
      }

      // Import products
      const result = await bulkImportService.importProducts(
        products,
        storeId,
        tenantId
      );

      res.json({
        message: `Imported ${result.imported} of ${result.totalRows} products`,
        ...result,
      });
    } catch (error) {
      console.error('Error importing products:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to import products',
      });
    }
  }
);

export default router;


// ===== CUSTOMERS IMPORT/EXPORT =====

// Download customer import template
router.get('/customers/template', authenticate, async (req: Request, res: Response) => {
  try {
    const buffer = bulkImportService.generateCustomerImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=customer-import-template.xlsx'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error generating customer template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Export customers to Excel
router.get(
  '/customers/export',
  authenticate,
  storeContext,
  async (req: Request, res: Response) => {
    try {
      const storeId = (req as any).storeId;

      if (!storeId) {
        return res.status(400).json({ error: 'Store context required' });
      }

      const buffer = await bulkImportService.exportCustomers(storeId);

      const filename = `customers-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting customers:', error);
      res.status(500).json({ error: 'Failed to export customers' });
    }
  }
);

// Import customers from Excel
router.post(
  '/customers/import',
  authenticate,
  storeContext,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const storeId = (req as any).storeId;

      if (!storeId) {
        return res.status(400).json({ error: 'Store context required' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse Excel file
      const customers = bulkImportService.parseCustomersExcel(file.buffer);

      if (customers.length === 0) {
        return res.status(400).json({ error: 'No valid customers found in file' });
      }

      // Import customers
      const result = await bulkImportService.importCustomers(customers, storeId);

      res.json({
        message: `Imported ${result.imported} of ${result.totalRows} customers`,
        ...result,
      });
    } catch (error) {
      console.error('Error importing customers:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to import customers',
      });
    }
  }
);
