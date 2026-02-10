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
exports.exportService = exports.ExportService = void 0;
const XLSX = __importStar(require("xlsx"));
const pdfkit_1 = __importDefault(require("pdfkit"));
class ExportService {
    /**
     * Xuất dữ liệu ra Excel
     */
    exportToExcel(data) {
        const workbook = XLSX.utils.book_new();
        // Tạo worksheet
        const wsData = [
            [data.title], // Tiêu đề
            [], // Dòng trống
            data.headers, // Header
            ...data.rows, // Dữ liệu
        ];
        // Thêm summary nếu có
        if (data.summary) {
            wsData.push([]);
            wsData.push(['TỔNG KẾT']);
            Object.entries(data.summary).forEach(([key, value]) => {
                wsData.push([key, value]);
            });
        }
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        // Định dạng độ rộng cột
        const colWidths = data.headers.map((header) => ({
            wch: Math.max(header.length, 15),
        }));
        worksheet['!cols'] = colWidths;
        // Merge cell cho tiêu đề
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: data.headers.length - 1 } },
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        // Xuất ra buffer
        const excelBuffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
        });
        return excelBuffer;
    }
    /**
     * Xuất dữ liệu ra CSV
     */
    exportToCSV(data) {
        const workbook = XLSX.utils.book_new();
        const wsData = [data.headers, ...data.rows];
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        const csvBuffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'csv',
        });
        return csvBuffer;
    }
    /**
     * Xuất báo cáo ra PDF
     */
    async exportToPDF(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Tiêu đề
            doc.fontSize(18).font('Helvetica-Bold').text(data.title, {
                align: 'center',
            });
            doc.moveDown(2);
            // Bảng dữ liệu
            const tableTop = doc.y;
            const columnWidth = (550 - 50) / data.headers.length;
            let x = 50;
            // Header
            doc.fontSize(10).font('Helvetica-Bold');
            data.headers.forEach((header) => {
                doc.text(header, x, tableTop, { width: columnWidth });
                x += columnWidth;
            });
            doc
                .moveTo(50, tableTop + 15)
                .lineTo(550, tableTop + 15)
                .stroke();
            // Dữ liệu
            doc.font('Helvetica').fontSize(9);
            let y = tableTop + 25;
            data.rows.forEach((row) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                x = 50;
                row.forEach((cell) => {
                    doc.text(String(cell || ''), x, y, { width: columnWidth });
                    x += columnWidth;
                });
                y += 20;
            });
            // Summary
            if (data.summary) {
                y += 20;
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 10;
                doc.font('Helvetica-Bold').fontSize(10);
                Object.entries(data.summary).forEach(([key, value]) => {
                    doc.text(`${key}: ${value}`, 50, y);
                    y += 20;
                });
            }
            doc.end();
        });
    }
    /**
     * Xuất báo cáo bán hàng
     */
    async exportSalesReport(sales, options) {
        const reportData = {
            title: 'BÁO CÁO BÁN HÀNG',
            headers: [
                'Mã đơn',
                'Ngày bán',
                'Khách hàng',
                'Tổng tiền',
                'Thanh toán',
                'Trạng thái',
            ],
            rows: sales.map((sale) => [
                sale.saleNumber,
                new Date(sale.saleDate).toLocaleDateString('vi-VN'),
                sale.customerName || 'Khách lẻ',
                sale.totalAmount.toLocaleString('vi-VN'),
                sale.paymentMethod,
                sale.status,
            ]),
            summary: {
                'Tổng số đơn': sales.length,
                'Tổng doanh thu': sales
                    .reduce((sum, s) => sum + s.totalAmount, 0)
                    .toLocaleString('vi-VN') + ' đ',
            },
        };
        if (options.format === 'excel') {
            return this.exportToExcel(reportData);
        }
        else if (options.format === 'csv') {
            return this.exportToCSV(reportData);
        }
        else {
            return this.exportToPDF(reportData);
        }
    }
    /**
     * Xuất báo cáo tồn kho
     */
    async exportInventoryReport(inventory, options) {
        const reportData = {
            title: 'BÁO CÁO TỒN KHO',
            headers: [
                'Mã SP',
                'Tên sản phẩm',
                'Danh mục',
                'Tồn kho',
                'Đơn vị',
                'Giá vốn',
                'Giá trị tồn',
            ],
            rows: inventory.map((item) => [
                item.sku || item.id,
                item.name,
                item.categoryName || '-',
                item.quantity,
                item.unit || 'cái',
                item.averageCost?.toLocaleString('vi-VN') || '0',
                (item.quantity * (item.averageCost || 0)).toLocaleString('vi-VN'),
            ]),
            summary: {
                'Tổng số sản phẩm': inventory.length,
                'Tổng giá trị tồn kho': inventory
                    .reduce((sum, i) => sum + i.quantity * (i.averageCost || 0), 0)
                    .toLocaleString('vi-VN') + ' đ',
            },
        };
        if (options.format === 'excel') {
            return this.exportToExcel(reportData);
        }
        else if (options.format === 'csv') {
            return this.exportToCSV(reportData);
        }
        else {
            return this.exportToPDF(reportData);
        }
    }
    /**
     * Xuất báo cáo nhập hàng
     */
    async exportPurchaseReport(purchases, options) {
        const reportData = {
            title: 'BÁO CÁO NHẬP HÀNG',
            headers: [
                'Mã đơn',
                'Ngày nhập',
                'Nhà cung cấp',
                'Tổng tiền',
                'Đã trả',
                'Còn nợ',
                'Trạng thái',
            ],
            rows: purchases.map((purchase) => [
                purchase.orderNumber,
                new Date(purchase.orderDate).toLocaleDateString('vi-VN'),
                purchase.supplierName,
                purchase.totalAmount.toLocaleString('vi-VN'),
                purchase.paidAmount?.toLocaleString('vi-VN') || '0',
                (purchase.totalAmount - (purchase.paidAmount || 0)).toLocaleString('vi-VN'),
                purchase.status,
            ]),
            summary: {
                'Tổng số đơn': purchases.length,
                'Tổng giá trị nhập': purchases
                    .reduce((sum, p) => sum + p.totalAmount, 0)
                    .toLocaleString('vi-VN') + ' đ',
                'Tổng đã trả': purchases
                    .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                    .toLocaleString('vi-VN') + ' đ',
                'Tổng còn nợ': purchases
                    .reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0)
                    .toLocaleString('vi-VN') + ' đ',
            },
        };
        if (options.format === 'excel') {
            return this.exportToExcel(reportData);
        }
        else if (options.format === 'csv') {
            return this.exportToCSV(reportData);
        }
        else {
            return this.exportToPDF(reportData);
        }
    }
    /**
     * Xuất danh sách sản phẩm
     */
    async exportProductList(products, options) {
        const reportData = {
            title: 'DANH SÁCH SẢN PHẨM',
            headers: [
                'Mã SP',
                'Tên sản phẩm',
                'Danh mục',
                'Giá vốn',
                'Giá bán',
                'Tồn kho',
                'Trạng thái',
            ],
            rows: products.map((product) => [
                product.sku || product.id,
                product.name,
                product.categoryName || '-',
                product.averageCost?.toLocaleString('vi-VN') || '0',
                product.sellingPrice.toLocaleString('vi-VN'),
                product.quantity || 0,
                product.status,
            ]),
            summary: {
                'Tổng số sản phẩm': products.length,
            },
        };
        if (options.format === 'excel') {
            return this.exportToExcel(reportData);
        }
        else if (options.format === 'csv') {
            return this.exportToCSV(reportData);
        }
        else {
            return this.exportToPDF(reportData);
        }
    }
}
exports.ExportService = ExportService;
exports.exportService = new ExportService();
//# sourceMappingURL=export-service.js.map