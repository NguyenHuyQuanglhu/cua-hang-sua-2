"use strict";
/**
 * Upload Routes
 * Handles file upload endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const upload_service_js_1 = require("../services/upload-service.js");
const router = (0, express_1.Router)();
/**
 * POST /api/upload/product-image
 * Upload a product image
 */
router.post('/product-image', auth_js_1.authenticate, auth_js_1.storeContext, (req, res, next) => {
    (0, upload_service_js_1.uploadSingleImage)(req, res, (err) => {
        if (err) {
            if (err.message.includes('Only image files')) {
                return res.status(400).json({ error: err.message });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds 5MB limit' });
            }
            return res.status(500).json({ error: 'Upload failed' });
        }
        next();
    });
}, async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const storeId = req.storeId;
        if (!storeId) {
            return res.status(400).json({ error: 'Store ID required' });
        }
        const result = await upload_service_js_1.uploadService.processProductImage(file.buffer, storeId);
        res.json({
            success: true,
            images: result,
        });
    }
    catch (error) {
        console.error('Image processing error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});
/**
 * DELETE /api/upload/product-image
 * Delete product images
 */
router.delete('/product-image', auth_js_1.authenticate, auth_js_1.storeContext, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL required' });
        }
        await upload_service_js_1.uploadService.deleteProductImages(imageUrl);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Image deletion error:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map