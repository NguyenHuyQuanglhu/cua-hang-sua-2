import PDFDocument from 'pdfkit';
import { query } from '../db/index';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitName: string;
  unitPrice: number;
  discount: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  notes?: string;
}

// Format currency in Vietnamese format
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

// Format date in Vietnamese format
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Get sale data for invoice
export async function getSaleForInvoice(
  saleId: number,
  storeId: string,
  tenantId: string
): Promise<InvoiceData | null> {
  // Get sale header
  const saleResult = await query<any>(
    `SELECT
      s.SaleID, s.InvoiceNumber, s.SaleDate, s.SubTotal, s.DiscountAmount,
      s.TaxAmount, s.TotalAmount, s.PaymentMethod, s.Notes,
      c.CustomerName, c.Phone as CustomerPhone, c.Address as CustomerAddress,
      u.FullName as CashierName,
      st.StoreName, st.Address as StoreAddress, st.Phone as StorePhone
    FROM Sales s
    LEFT JOIN Customers c ON s.CustomerID = c.CustomerID
    LEFT JOIN Users u ON s.UserID = u.UserID
    LEFT JOIN Stores st ON s.StoreID = st.StoreID
    WHERE s.SaleID = @saleId AND s.StoreID = @storeId AND s.TenantID = @tenantId`,
    { saleId, storeId, tenantId }
  );

  if (!saleResult || saleResult.length === 0) {
    return null;
  }

  const sale = saleResult[0];

  // Get sale items
  const itemsResult = await query<any>(
    `SELECT
      p.ProductName, si.Quantity, u.UnitName, si.UnitPrice,
      ISNULL(si.DiscountAmount, 0) as Discount, si.TotalPrice
    FROM SaleItems si
    LEFT JOIN Products p ON si.ProductID = p.ProductID
    LEFT JOIN Units u ON si.UnitID = u.UnitID
    WHERE si.SaleID = @saleId`,
    { saleId }
  );

  const items: InvoiceItem[] = (itemsResult || []).map((item: any) => ({
    productName: item.ProductName || 'Unknown Product',
    quantity: item.Quantity,
    unitName: item.UnitName || '',
    unitPrice: item.UnitPrice,
    discount: item.Discount,
    total: item.TotalPrice,
  }));

  return {
    invoiceNumber: sale.InvoiceNumber || `INV-${sale.SaleID}`,
    invoiceDate: new Date(sale.SaleDate),
    storeName: sale.StoreName || 'Store',
    storeAddress: sale.StoreAddress || '',
    storePhone: sale.StorePhone || '',
    customerName: sale.CustomerName || 'Khách lẻ',
    customerPhone: sale.CustomerPhone,
    customerAddress: sale.CustomerAddress,
    items,
    subtotal: sale.SubTotal || 0,
    discount: sale.DiscountAmount || 0,
    tax: sale.TaxAmount || 0,
    total: sale.TotalAmount || 0,
    paymentMethod: sale.PaymentMethod || 'Cash',
    cashierName: sale.CashierName || 'N/A',
    notes: sale.Notes,
  };
}

// Generate PDF invoice
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: data.storeName,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header - Store info
      doc.fontSize(20).font('Helvetica-Bold').text(data.storeName, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(data.storeAddress, { align: 'center' });
      doc.text(`Tel: ${data.storePhone}`, { align: 'center' });

      doc.moveDown();

      // Invoice title
      doc.fontSize(16).font('Helvetica-Bold').text('HOA DON BAN HANG', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`So: ${data.invoiceNumber}`, { align: 'center' });
      doc.text(`Ngay: ${formatDate(data.invoiceDate)}`, { align: 'center' });

      doc.moveDown();

      // Customer info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Khach hang: ${data.customerName}`);
      if (data.customerPhone) {
        doc.text(`SDT: ${data.customerPhone}`);
      }
      if (data.customerAddress) {
        doc.text(`Dia chi: ${data.customerAddress}`);
      }

      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 300;
      const col4 = 360;
      const col5 = 420;
      const col6 = 500;

      doc.font('Helvetica-Bold');
      doc.text('San pham', col1, tableTop);
      doc.text('SL', col2, tableTop);
      doc.text('DVT', col3, tableTop);
      doc.text('Don gia', col4, tableTop);
      doc.text('CK', col5, tableTop);
      doc.text('T.Tien', col6, tableTop);

      // Draw header line
      doc.moveTo(col1, tableTop + 15).lineTo(560, tableTop + 15).stroke();

      // Table rows
      let y = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      for (const item of data.items) {
        // Handle long product names
        const productName = item.productName.length > 30
          ? item.productName.substring(0, 30) + '...'
          : item.productName;

        doc.text(productName, col1, y, { width: 195 });
        doc.text(item.quantity.toString(), col2, y);
        doc.text(item.unitName, col3, y);
        doc.text(formatCurrency(item.unitPrice), col4, y);
        doc.text(formatCurrency(item.discount), col5, y);
        doc.text(formatCurrency(item.total), col6, y);

        y += 20;

        // Add new page if needed
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Draw footer line
      doc.moveTo(col1, y).lineTo(560, y).stroke();
      y += 15;

      // Totals
      doc.fontSize(10);
      doc.text(`Tam tinh:`, 400, y);
      doc.text(formatCurrency(data.subtotal), col6, y);
      y += 15;

      if (data.discount > 0) {
        doc.text(`Giam gia:`, 400, y);
        doc.text(`-${formatCurrency(data.discount)}`, col6, y);
        y += 15;
      }

      if (data.tax > 0) {
        doc.text(`Thue:`, 400, y);
        doc.text(formatCurrency(data.tax), col6, y);
        y += 15;
      }

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`TONG CONG:`, 400, y);
      doc.text(formatCurrency(data.total), col6, y);

      y += 30;

      // Payment info
      doc.font('Helvetica').fontSize(10);
      doc.text(`Phuong thuc thanh toan: ${data.paymentMethod}`, col1, y);
      y += 15;
      doc.text(`Thu ngan: ${data.cashierName}`, col1, y);

      if (data.notes) {
        y += 20;
        doc.text(`Ghi chu: ${data.notes}`, col1, y);
      }

      // Footer
      y += 40;
      doc.fontSize(10).text('Cam on quy khach!', { align: 'center' });
      doc.fontSize(8).text('Vui long kiem tra hang truoc khi roi cua hang', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
