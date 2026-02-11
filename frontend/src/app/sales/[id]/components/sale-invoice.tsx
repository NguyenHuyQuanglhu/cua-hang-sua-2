

'use client'

import { useRef, useEffect } from 'react'
import Link from "next/link"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ChevronLeft, File, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import Image from 'next/image'
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


  const getUnitInfo = (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  };

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

  const remainingDebt = sale.remainingDebt || 0;
  const isChange = remainingDebt < 0;

  const loyaltyTier = settings?.loyalty?.tiers.find(t => t.name === customer?.loyaltyTier);
  const paperSizeClass = settings?.invoiceFormat === 'A5' ? 'a5-page' : 'a4-page';


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
        <div className="printable-area">
        <Card className="p-6 sm:p-8" ref={invoiceRef}>
            <header className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                     {settings?.companyLogo ? (
                        <Image src={settings.companyLogo} alt="Company Logo" width={64} height={64} className="h-16 w-16 object-contain" />
                    ) : (
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Logo</span>
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-lg">{settings?.companyBusinessLine || 'CƠ SỞ SẢN XUẤT VÀ KINH DOANH GIỐNG CÂY TRỒNG'}</p>
                        <p className="font-bold text-2xl text-primary">{settings?.companyName || 'MINH PHÁT'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{settings?.companyAddress || '70 Ấp 1, X. Mỹ Thạnh, H. Thủ Thừa, T. Long an'}</p>
                    <p>Điện thoại: {settings?.companyPhone || '0915 582 447'}</p>
                </div>
            </header>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-wider">HÓA ĐƠN BÁN HÀNG</h1>
                <div className="flex justify-center items-center gap-4 text-sm mt-2">
                    <span>Ngày {new Date(sale.transactionDate).getDate()}</span>
                    <span>Tháng {new Date(sale.transactionDate).getMonth() + 1}</span>
                    <span>Năm {new Date(sale.transactionDate).getFullYear()}</span>
                    <span className="font-semibold">Số HĐ: {sale.invoiceNumber}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <p><span className="font-semibold">Khách hàng:</span> {customer?.name || 'Khách lẻ'}</p>
                <p><span className="font-semibold">Điện thoại:</span> {customer?.phone || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">Địa chỉ:</span> {customer?.address || 'N/A'}</p>
                <p className="col-span-2">
                  <span className="font-semibold">Thông tin ngân hàng:</span>{' '}
                  {customer && customer.bankName && customer.bankAccountNumber 
                    ? `${customer.bankName} - ${customer.bankAccountNumber}` 
                    : 'Chưa có thông tin'}
                </p>
            </div>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">STT</TableHead>
                        <TableHead>TÊN HÀNG</TableHead>
                        <TableHead className="text-right">BAO</TableHead>
                        <TableHead className="text-right">ĐVT</TableHead>
                        <TableHead className="text-right">SL</TableHead>
                        <TableHead className="text-right">ĐƠN GIÁ</TableHead>
                        <TableHead className="text-right">THÀNH TIỀN</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => {
                        const product = productsMap.get(item.productId);
                        if (!product) return null;
                        
                        const saleUnitInfo = getUnitInfo(product.unitId);
                        const baseUnit = saleUnitInfo.baseUnit || unitsMap.get(product.unitId);
                        
                        const quantityInSaleUnit = saleUnitInfo.conversionFactor 
                            ? item.quantity / saleUnitInfo.conversionFactor 
                            : item.quantity;
                        
                        const lineTotal = item.quantity * item.price;

                        return (
                             <TableRow key={item.id}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right">{quantityInSaleUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right">{baseUnit?.name}</TableCell>
                                <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(lineTotal)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium py-1">Tổng tiền hàng</TableCell>
                        <TableCell className="text-right font-semibold py-1">{formatCurrency(sale.totalAmount)}</TableCell>
                    </TableRow>
                    {sale.tierDiscountAmount && sale.tierDiscountAmount > 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-medium py-1">Ưu đãi hạng {loyaltyTier?.vietnameseName} ({sale.tierDiscountPercentage}%)</TableCell>
                            <TableCell className="text-right font-semibold py-1">-{formatCurrency(sale.tierDiscountAmount)}</TableCell>
                        </TableRow>
                    ) : null}
                    {sale.discount && sale.discount > 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-medium py-1">Giảm giá</TableCell>
                            <TableCell className="text-right font-semibold py-1">-{formatCurrency(sale.discount)}</TableCell>
                        </TableRow>
                    ) : null}
                     {sale.pointsDiscount && sale.pointsDiscount > 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-medium py-1">Giảm giá điểm thưởng ({sale.pointsUsed} điểm)</TableCell>
                            <TableCell className="text-right font-semibold py-1">-{formatCurrency(sale.pointsDiscount)}</TableCell>
                        </TableRow>
                    ) : null}
                     {sale.vatAmount && sale.vatAmount > 0 && settings?.vatRate ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-medium py-1">Thuế VAT ({settings.vatRate}%)</TableCell>
                            <TableCell className="text-right font-semibold py-1">{formatCurrency(sale.vatAmount)}</TableCell>
                        </TableRow>
                    ) : null}
                     <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium py-1">Tổng cộng</TableCell>
                        <TableCell className="text-right font-semibold py-1">{formatCurrency(sale.finalAmount)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium py-1">Nợ cũ</TableCell>
                        <TableCell className="text-right font-semibold py-1">{formatCurrency(sale.previousDebt || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-medium py-1">Khách thanh toán</TableCell>
                        <TableCell className="text-right font-semibold py-1">{formatCurrency(sale.customerPayment || 0)}</TableCell>
                    </TableRow>
                     <TableRow className="text-lg">
                        <TableCell colSpan={6} className={`text-right font-bold py-2 ${isChange ? 'text-green-600' : ''}`}>
                            {isChange ? 'Tiền thối lại' : 'Còn nợ lại'}
                        </TableCell>
                        <TableCell className={`text-right font-bold py-2 ${isChange ? 'text-green-600' : ''}`}>
                            {formatCurrency(Math.abs(remainingDebt))}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            
            <div className="mt-12 text-center text-sm">
                <p>Minh Phát chân thành cảm ơn quý khách hàng đã luôn tin tưởng và ủng hộ sản phẩm bên chúng tôi!</p>
            </div>
            
            <div className="flex justify-around mt-8 pt-8">
                <div className="text-center">
                    <p className="font-semibold">NGƯỜI GIAO HÀNG</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold">NGƯỜI NHẬN HÀNG</p>
                </div>
            </div>
        </Card>
        </div>
    </div>
  )
}
