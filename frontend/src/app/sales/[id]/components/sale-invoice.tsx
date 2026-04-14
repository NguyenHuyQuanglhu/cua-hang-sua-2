

'use client'

import { useRef, useEffect } from 'react'
import Link from "next/link"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ChevronLeft, File, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import type { Customer, Sale, SalesItem, Product, Unit, ThemeSettings } from "@/lib/types"

interface SaleInvoiceProps {
    sale: Sale;
    items: SalesItem[];
    customer: Customer | null;
    productsMap: Map<string, Product>;
    unitsMap: Map<string, Unit>;
    settings: ThemeSettings | null;
    autoPrint?: boolean;
}

export function SaleInvoice({ sale, items, customer, productsMap, unitsMap, settings, autoPrint = false }: SaleInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    window.print();
    
    // Update status to 'printed' after printing
    if (sale.status !== 'printed') {
      try {
        const { updateSaleStatus } = await import('../../actions');
        await updateSaleStatus(sale.id, 'printed');
      } catch (error) {
        console.error('Failed to update sale status:', error);
      }
    }
  };

  useEffect(() => {
    if (autoPrint) {
      setTimeout(() => {
        handlePrint();
        // Optional: Redirect or close after printing
        // For example, to go back to sales list after a delay
        // setTimeout(() => router.push('/sales'), 2000);
      }, 500); // Delay to ensure content is fully rendered
    }
  }, [autoPrint]);

  const handleExportPDF = () => {
    const input = invoiceRef.current;
    if (!input) {
      return;
    }

    // Hide buttons before capturing
    const buttons = input.querySelectorAll('button');
    const links = input.querySelectorAll('a');
    links.forEach(link => link.style.display = 'none');
    buttons.forEach(btn => btn.style.display = 'none');

    html2canvas(input, {
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
      links.forEach(link => link.style.display = '');
      buttons.forEach(btn => btn.style.display = '');
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      let renderWidth = pdfWidth;
      let renderHeight = renderWidth / canvasAspectRatio;
      
      if(renderHeight > pdfHeight){
        renderHeight = pdfHeight;
        renderWidth = renderHeight * canvasAspectRatio;
      }

      const xOffset = (pdfWidth - renderWidth) / 2;

      pdf.addImage(imgData, "PNG", xOffset, 0, renderWidth, renderHeight);
      pdf.save(`${sale.invoiceNumber}.pdf`);
    });
  };

  const paperSizeClass = settings?.invoiceFormat === 'A5' ? 'a5-page' : 'a4-page';
  const paidAmount = sale.customerPayment ?? sale.finalAmount;
  const change = Math.max(0, paidAmount - sale.finalAmount);


  return (
    <div className={paperSizeClass}>
       <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
          .a4-page {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          .a5-page {
            width: 148mm;
            height: 210mm;
            margin: 0;
            padding: 0;
          }
           @page {
            size: ${settings?.invoiceFormat === 'A5' ? 'A5' : 'A4'};
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        .a5-page {
          width: 148mm;
          margin: 0 auto;
        }
        .a4-page {
          width: 210mm;
           margin: 0 auto;
        }
      `}</style>
      <div className="flex items-center gap-4 mb-4 no-print">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/sales">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <File className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            In hóa đơn
          </Button>
        </div>
      </div>
        <div className="printable-area" ref={invoiceRef}>
          <div className="bg-white p-6 sm:p-8 border rounded-lg">
            <div className="text-center mb-6">
              {settings?.companyBusinessLine && (
                <p className="text-sm text-gray-600">{settings.companyBusinessLine}</p>
              )}
              <h1 className="text-3xl font-bold text-orange-500 mb-2">
                {settings?.companyName || 'Milk Shop'}
              </h1>
              {settings?.companyAddress && (
                <p className="text-sm text-gray-600">{settings.companyAddress}</p>
              )}
              {settings?.companyPhone && (
                <p className="text-sm text-gray-600">ĐT: {settings.companyPhone}</p>
              )}
            </div>

            <h2 className="text-xl font-bold text-center my-4">HÓA ĐƠN BÁN HÀNG</h2>

            <div className="flex justify-between text-sm mb-6">
              <span>Số HĐ: {sale.invoiceNumber}</span>
              <span>Ngày: {new Date(sale.transactionDate).toLocaleString('vi-VN')}</span>
            </div>

            <div className="text-sm mb-6">
              <p><strong>Khách hàng:</strong> {customer?.name || 'Khách lẻ'}</p>
              {customer?.phone && <p><strong>SĐT:</strong> {customer.phone}</p>}
              {sale.projectName && <p><strong>Công trình:</strong> {sale.projectName}</p>}
            </div>

            <table className="w-full border-collapse mb-6 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">STT</th>
                  <th className="border p-3 text-left">Sản phẩm</th>
                  <th className="border p-3 text-right">SL</th>
                  <th className="border p-3 text-right">Đơn giá</th>
                  <th className="border p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = productsMap.get(item.productId);
                  if (!product) return null;

                  return (
                    <tr key={item.id}>
                      <td className="border p-3">{index + 1}</td>
                      <td className="border p-3">{product.name}</td>
                      <td className="border p-3 text-right">{item.quantity}</td>
                      <td className="border p-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="border p-3 text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t pt-4 text-sm">
              <div className="flex justify-between py-1">
                <span>Tổng tiền hàng:</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>
              {sale.discount && sale.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.vatAmount && sale.vatAmount > 0 && (
                <div className="flex justify-between py-1">
                  <span>VAT ({settings?.vatRate || 0}%):</span>
                  <span>{formatCurrency(sale.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg mt-2">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(sale.finalAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Khách thanh toán:</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between py-1 text-green-600">
                  <span>Tiền thối lại:</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            <div className="text-center mt-10 text-sm text-gray-600">
              <p>Cảm ơn quý khách đã mua hàng!</p>
              <p>Hẹn gặp lại!</p>
            </div>
          </div>
        </div>
    </div>
  )
}
