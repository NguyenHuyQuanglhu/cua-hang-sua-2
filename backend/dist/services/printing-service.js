"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printingService = exports.PrintingService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class PrintingService {
    /**
     * In tem mã vạch sản phẩm
     */
    async generateBarcodePDF(products) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ size: [283.46, 141.73], margin: 10 }); // 100mm x 50mm
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            products.forEach((product, index) => {
                if (index > 0)
                    doc.addPage();
                // Tên sản phẩm
                doc.fontSize(10).font('Helvetica-Bold').text(product.name, {
                    align: 'center',
                    width: 263.46,
                });
                doc.moveDown(0.3);
                // Mã vạch (giả lập - trong thực tế cần thư viện tạo barcode)
                if (product.barcode) {
                    doc.fontSize(8).font('Helvetica').text(product.barcode, {
                        align: 'center',
                    });
                    // Vẽ mã vạch đơn giản (các thanh dọc)
                    const barcodeY = doc.y + 5;
                    const barcodeWidth = 200;
                    const barcodeHeight = 40;
                    const startX = (283.46 - barcodeWidth) / 2;
                    doc.rect(startX, barcodeY, barcodeWidth, barcodeHeight).stroke();
                    // Vẽ các thanh mã vạch
                    for (let i = 0; i < 50; i++) {
                        const x = startX + (i * barcodeWidth / 50);
                        const barWidth = Math.random() > 0.5 ? 2 : 4;
                        if (Math.random() > 0.3) {
                            doc.rect(x, barcodeY, barWidth, barcodeHeight).fill('black');
                        }
                    }
                }
                doc.moveDown(3);
                // Giá bán
                doc.fontSize(12).font('Helvetica-Bold').text(`${product.sellingPrice.toLocaleString('vi-VN')} đ`, {
                    align: 'center',
                });
                // SKU (nếu có)
                if (product.sku) {
                    doc.moveDown(0.3);
                    doc.fontSize(8).font('Helvetica').text(`SKU: ${product.sku}`, {
                        align: 'center',
                    });
                }
            });
            doc.end();
        });
    }
    /**
     * In phiếu nhập kho
     */
    async generatePurchaseReceiptPDF(order) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('PHIẾU NHẬP KHO', {
                align: 'center',
            });
            doc.moveDown();
            // Thông tin đơn hàng
            doc.fontSize(10).font('Helvetica');
            doc.text(`Số phiếu: ${order.orderNumber}`);
            doc.text(`Nhà cung cấp: ${order.supplierName}`);
            doc.text(`Ngày nhập: ${order.orderDate.toLocaleDateString('vi-VN')}`);
            doc.moveDown();
            // Bảng sản phẩm
            const tableTop = doc.y;
            const itemCodeX = 50;
            const descriptionX = 150;
            const quantityX = 350;
            const priceX = 420;
            const totalX = 490;
            // Header bảng
            doc.font('Helvetica-Bold');
            doc.text('STT', itemCodeX, tableTop);
            doc.text('Tên sản phẩm', descriptionX, tableTop);
            doc.text('SL', quantityX, tableTop);
            doc.text('Đơn giá', priceX, tableTop);
            doc.text('Thành tiền', totalX, tableTop);
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            // Dữ liệu
            doc.font('Helvetica');
            let y = tableTop + 25;
            order.items.forEach((item, index) => {
                doc.text((index + 1).toString(), itemCodeX, y);
                doc.text(item.productName, descriptionX, y, { width: 180 });
                doc.text(item.quantity.toString(), quantityX, y);
                doc.text(item.unitPrice.toLocaleString('vi-VN'), priceX, y);
                doc.text(item.total.toLocaleString('vi-VN'), totalX, y);
                y += 25;
            });
            // Tổng cộng
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;
            doc.font('Helvetica-Bold');
            doc.text('TỔNG CỘNG:', priceX - 50, y);
            doc.text(`${order.totalAmount.toLocaleString('vi-VN')} đ`, totalX, y);
            // Chữ ký
            y += 50;
            doc.font('Helvetica');
            doc.text('Người lập phiếu', 100, y);
            doc.text('Thủ kho', 300, y);
            doc.text('Giám đốc', 450, y);
            doc.end();
        });
    }
    /**
     * In phiếu xuất kho
     */
    async generateDeliveryNotePDF(order) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('PHIẾU XUẤT KHO', {
                align: 'center',
            });
            doc.moveDown();
            // Thông tin
            doc.fontSize(10).font('Helvetica');
            doc.text(`Số phiếu: ${order.orderNumber}`);
            doc.text(`Khách hàng: ${order.customerName || 'Khách lẻ'}`);
            doc.text(`Ngày xuất: ${order.orderDate.toLocaleDateString('vi-VN')}`);
            doc.moveDown();
            // Bảng sản phẩm (tương tự phiếu nhập)
            const tableTop = doc.y;
            const itemCodeX = 50;
            const descriptionX = 150;
            const quantityX = 350;
            const priceX = 420;
            const totalX = 490;
            doc.font('Helvetica-Bold');
            doc.text('STT', itemCodeX, tableTop);
            doc.text('Tên sản phẩm', descriptionX, tableTop);
            doc.text('SL', quantityX, tableTop);
            doc.text('Đơn giá', priceX, tableTop);
            doc.text('Thành tiền', totalX, tableTop);
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            doc.font('Helvetica');
            let y = tableTop + 25;
            order.items.forEach((item, index) => {
                doc.text((index + 1).toString(), itemCodeX, y);
                doc.text(item.productName, descriptionX, y, { width: 180 });
                doc.text(item.quantity.toString(), quantityX, y);
                doc.text(item.unitPrice.toLocaleString('vi-VN'), priceX, y);
                doc.text(item.total.toLocaleString('vi-VN'), totalX, y);
                y += 25;
            });
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;
            doc.font('Helvetica-Bold');
            doc.text('TỔNG CỘNG:', priceX - 50, y);
            doc.text(`${order.totalAmount.toLocaleString('vi-VN')} đ`, totalX, y);
            y += 50;
            doc.font('Helvetica');
            doc.text('Người xuất hàng', 100, y);
            doc.text('Thủ kho', 300, y);
            doc.text('Người nhận', 450, y);
            doc.end();
        });
    }
    /**
     * In bảng giá sản phẩm
     */
    async generatePriceListPDF(priceList) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('BẢNG GIÁ SẢN PHẨM', {
                align: 'center',
            });
            doc.moveDown();
            doc.fontSize(12).font('Helvetica');
            doc.text(`Cửa hàng: ${priceList.storeName}`);
            doc.text(`Ngày áp dụng: ${priceList.effectiveDate.toLocaleDateString('vi-VN')}`);
            doc.moveDown();
            // Bảng giá
            const tableTop = doc.y;
            const sttX = 50;
            const nameX = 100;
            const skuX = 300;
            const categoryX = 380;
            const priceX = 480;
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('STT', sttX, tableTop);
            doc.text('Tên sản phẩm', nameX, tableTop);
            doc.text('SKU', skuX, tableTop);
            doc.text('Danh mục', categoryX, tableTop);
            doc.text('Giá bán', priceX, tableTop);
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            doc.font('Helvetica').fontSize(9);
            let y = tableTop + 25;
            priceList.products.forEach((product, index) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.text((index + 1).toString(), sttX, y);
                doc.text(product.name, nameX, y, { width: 180 });
                doc.text(product.sku || '-', skuX, y);
                doc.text(product.category || '-', categoryX, y, { width: 80 });
                doc.text(product.sellingPrice.toLocaleString('vi-VN'), priceX, y);
                y += 20;
            });
            doc.end();
        });
    }
    /**
     * In nhãn giá (sticker nhỏ)
     */
    async generatePriceLabelPDF(products) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ size: [141.73, 113.39], margin: 5 }); // 50mm x 40mm
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            products.forEach((product, index) => {
                if (index > 0)
                    doc.addPage();
                // Tên sản phẩm
                doc.fontSize(8).font('Helvetica-Bold').text(product.name, {
                    align: 'center',
                    width: 131.73,
                });
                doc.moveDown(0.5);
                // Giá bán (lớn và nổi bật)
                doc.fontSize(16).font('Helvetica-Bold').fillColor('red').text(`${product.sellingPrice.toLocaleString('vi-VN')}đ`, {
                    align: 'center',
                });
                doc.fillColor('black');
                // SKU
                if (product.sku) {
                    doc.moveDown(0.3);
                    doc.fontSize(6).font('Helvetica').text(`SKU: ${product.sku}`, {
                        align: 'center',
                    });
                }
            });
            doc.end();
        });
    }
}
exports.PrintingService = PrintingService;
exports.printingService = new PrintingService();
//# sourceMappingURL=printing-service.js.map