

'use client'

import { useRef } from 'react'
import Link from "next/link"
import Image from 'next/image'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ChevronLeft, File, Printer, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { PurchaseOrder, PurchaseOrderItem, Product, Unit, ThemeSettings, Supplier, Contractor } from "@/lib/types"

interface PurchaseOrderInvoiceProps {
    purchaseOrder: PurchaseOrder;
    items: PurchaseOrderItem[];
    productsMap: Map<string, Product>;
    unitsMap: Map<string, Unit>;
    settings: ThemeSettings | null;
    supplier: Supplier | null;
    contractor: Contractor | null;
}

export function PurchaseOrderInvoice({ purchaseOrder, items, productsMap, unitsMap, settings, supplier, contractor }: PurchaseOrderInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContents = invoiceRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;

    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      // We need to reload to re-initialize React app and its event handlers
      location.reload(); 
    }
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
      pdf.save(`${purchaseOrder.orderNumber}.pdf`);
    });
  };

  const getUnitInfo = (unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/purchases">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
           <Button variant="outline" size="sm" asChild>
              <Link href={`/purchases/${purchaseOrder.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Sửa phiếu
              </Link>
            </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <File className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            In phiếu
          </Button>
        </div>
      </div>
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
                <h1 className="text-3xl font-bold tracking-wider">PHIẾU NHẬP HÀNG</h1>
                <div className="flex justify-center items-center gap-4 text-sm mt-2">
                    <span>Ngày {new Date(purchaseOrder.importDate).getDate()}</span>
                    <span>Tháng {new Date(purchaseOrder.importDate).getMonth() + 1}</span>
                    <span>Năm {new Date(purchaseOrder.importDate).getFullYear()}</span>
                    <span className="font-semibold">Số PN: {purchaseOrder.orderNumber}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <p><span className="font-semibold">Nhà cung cấp:</span> {supplier?.name || 'N/A'}</p>
                <p><span className="font-semibold">Nhà thầu:</span> {contractor?.name || 'Chưa gắn'}</p>
                <p><span className="font-semibold">Điện thoại:</span> {supplier?.phone || 'N/A'}</p>
                <p><span className="font-semibold">Liên hệ nhà thầu:</span> {contractor?.phone || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">Địa chỉ:</span> {supplier?.address || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">Địa chỉ nhà thầu:</span> {contractor?.address || 'N/A'}</p>
                <p className="col-span-2"><span className="font-semibold">Ghi chú:</span> {purchaseOrder.notes || 'Không có'}</p>
            </div>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">STT</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-center">Đơn vị</TableHead>
                        <TableHead className="text-right">Giá nhập</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => {
                        const product = productsMap.get(item.productId);
                        if (!product) return null;
                        
                        const importUnitInfo = getUnitInfo(item.unitId);
                        const baseUnitForCost = importUnitInfo.baseUnit || unitsMap.get(item.unitId);

                        const lineTotal = item.quantity * importUnitInfo.conversionFactor * item.cost;

                        return (
                             <TableRow key={index}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                                <TableCell className="text-center">{importUnitInfo.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.cost)} / {baseUnitForCost?.name}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(lineTotal)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                     <TableRow className="text-lg">
                        <TableCell colSpan={5} className="text-right font-bold">Tổng cộng</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(purchaseOrder.totalAmount)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            
            <div className="flex justify-around mt-12 pt-8">
                <div className="text-center">
                    <p className="font-semibold">Người lập phiếu</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold">Thủ kho</p>
                </div>
                 <div className="text-center">
                    <p className="font-semibold">Kế toán</p>
                </div>
            </div>
        </Card>
    </div>
  )
}
