"use strict";
/**
 * Upload Service
 * Handles file uploads with image processing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadService = exports.uploadMultipleImages = exports.uploadSingleImage = void 0;
exports.processProductImage = processProductImage;
exports.deleteProductImages = deleteProductImages;
exports.getImageUrl = getImageUrl;
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
// Upload directory
const UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
const PRODUCT_IMAGES_DIR = path_1.default.join(UPLOAD_DIR, 'products');
// Ensure directories exist
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs_1.default.existsSync(PRODUCT_IMAGES_DIR)) {
    fs_1.default.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
}
// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Image sizes for product images
const IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
};
/**
 * Multer storage configuration
 */
const storage = multer_1.default.memoryStorage();
/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
    }
};
/**
 * Multer upload middleware for single image
 */
exports.uploadSingleImage = (0, multer_1.default)({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
}).single('image');
/**
 * Multer upload middleware for multiple images
 */
exports.uploadMultipleImages = (0, multer_1.default)({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5,
    },
}).array('images', 5);
/**
 * Process and save product image
 */
async function processProductImage(buffer, storeId) {
    const uniqueId = crypto_1.default.randomBytes(16).toString('hex');
    const storeDir = path_1.default.join(PRODUCT_IMAGES_DIR, storeId);
    // Ensure store directory exists
    if (!fs_1.default.existsSync(storeDir)) {
        fs_1.default.mkdirSync(storeDir, { recursive: true });
    }
    const baseName = `${uniqueId}`;
    const results = {
        original: '',
        thumbnail: '',
        medium: '',
        large: '',
    };
    // Save original (optimized)
    const originalPath = path_1.default.join(storeDir, `${baseName}_original.webp`);
    await (0, sharp_1.default)(buffer)
        .webp({ quality: 85 })
        .toFile(originalPath);
    results.original = `/uploads/products/${storeId}/${baseName}_original.webp`;
    // Generate thumbnail
    const thumbnailPath = path_1.default.join(storeDir, `${baseName}_thumb.webp`);
    await (0, sharp_1.default)(buffer)
        .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
        fit: 'cover',
        position: 'center',
    })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
    results.thumbnail = `/uploads/products/${storeId}/${baseName}_thumb.webp`;
    // Generate medium
    const mediumPath = path_1.default.join(storeDir, `${baseName}_medium.webp`);
    await (0, sharp_1.default)(buffer)
        .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
        fit: 'inside',
        withoutEnlargement: true,
    })
        .webp({ quality: 80 })
        .toFile(mediumPath);
    results.medium = `/uploads/products/${storeId}/${baseName}_medium.webp`;
    // Generate large
    const largePath = path_1.default.join(storeDir, `${baseName}_large.webp`);
    await (0, sharp_1.default)(buffer)
        .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
        fit: 'inside',
        withoutEnlargement: true,
    })
        .webp({ quality: 85 })
        .toFile(largePath);
    results.large = `/uploads/products/${storeId}/${baseName}_large.webp`;
    return results;
}
/**
 * Delete product images
 */
async function deleteProductImages(imageUrl) {
    if (!imageUrl)
        return;
    // Extract base path from URL
    const urlPath = imageUrl.replace('/uploads/', '');
    const basePath = path_1.default.join(UPLOAD_DIR, urlPath);
    // Get the base name without size suffix
    const dir = path_1.default.dirname(basePath);
    const fileName = path_1.default.basename(basePath);
    const match = fileName.match(/^(.+)_(original|thumb|medium|large)\.webp$/);
    if (match) {
        const baseName = match[1];
        const sizes = ['original', 'thumb', 'medium', 'large'];
        for (const size of sizes) {
            const filePath = path_1.default.join(dir, `${baseName}_${size}.webp`);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
    }
}
/**
 * Get image URL with size variant
 */
function getImageUrl(originalUrl, size = 'medium') {
    if (!originalUrl)
        return '';
    const sizeMap = {
        thumbnail: 'thumb',
        medium: 'medium',
        large: 'large',
    };
    return originalUrl.replace('_original.webp', `_${sizeMap[size]}.webp`);
}
exports.uploadService = {
    processProductImage,
    deleteProductImages,
    getImageUrl,
    uploadSingleImage: exports.uploadSingleImage,
    uploadMultipleImages: exports.uploadMultipleImages,
};
//# sourceMappingURL=upload-service.js.map