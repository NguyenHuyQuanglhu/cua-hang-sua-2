"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const bulkImportService = __importStar(require("../services/bulk-import-service"));
const router = (0, express_1.Router)();
// Configure multer for Excel file upload
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        }
        else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
});
// Download import template
router.get('/template', auth_1.authenticate, async (req, res) => {
    try {
        const buffer = bulkImportService.generateImportTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');
        res.send(buffer);
    }
    catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({ error: 'Failed to generate template' });
    }
});
// Export products to Excel
router.get('/export', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
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
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Error exporting products:', error);
        res.status(500).json({ error: 'Failed to export products' });
    }
});
// Import products from Excel
router.post('/import', auth_1.authenticate, auth_1.storeContext, upload.single('file'), async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
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
        const result = await bulkImportService.importProducts(products, storeId, tenantId);
        res.json({
            success: result.success,
            message: `Imported ${result.imported} of ${result.totalRows} products`,
            ...result,
        });
    }
    catch (error) {
        console.error('Error importing products:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to import products',
        });
    }
});
exports.default = router;
//# sourceMappingURL=bulk-import.js.map