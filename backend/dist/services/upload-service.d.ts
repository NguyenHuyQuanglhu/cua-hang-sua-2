/**
 * Upload Service
 * Handles file uploads with image processing
 */
/**
 * Multer upload middleware for single image
 */
export declare const uploadSingleImage: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Multer upload middleware for multiple images
 */
export declare const uploadMultipleImages: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Image processing result
 */
export interface ProcessedImage {
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
}
/**
 * Process and save product image
 */
export declare function processProductImage(buffer: Buffer, storeId: string): Promise<ProcessedImage>;
/**
 * Delete product images
 */
export declare function deleteProductImages(imageUrl: string): Promise<void>;
/**
 * Get image URL with size variant
 */
export declare function getImageUrl(originalUrl: string, size?: 'thumbnail' | 'medium' | 'large'): string;
export declare const uploadService: {
    processProductImage: typeof processProductImage;
    deleteProductImages: typeof deleteProductImages;
    getImageUrl: typeof getImageUrl;
    uploadSingleImage: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    uploadMultipleImages: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
};
//# sourceMappingURL=upload-service.d.ts.map