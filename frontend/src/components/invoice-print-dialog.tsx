'use client'

import { useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ThemeSettings } from '@/lib/types'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  unitName?: string
}

interface InvoicePrintDialogProps {
  saleId: string
  open: boolean
  onClose: () => void
  invoiceNumber: string
  transactionDate: Date
  items: CartItem[]
  totalAmount: number
  discount: number
  vatAmount: number
  finalAmount: number
  customerPayment: number
  customerName?: string
  customerPhone?: string
  settings: ThemeSettings | null
}

export function InvoicePrintDialog({
  saleId,
  open,
  onClose,
  invoiceNumber,
  transactionDate,
  items,
  totalAmount,
  discount,
  vatAmount,
  finalAmount,
  customerPayment,
  customerName,
  customerPhone,
  settings,
}: InvoicePrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = async () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt chặn pop-up.')
      return
    }

    const invoiceFormat = settings?.invoiceFormat || 'A4'
    const pageSize = invoiceFormat === 'A5' ? 'A5' : invoiceFormat === '80mm' ? '80mm 297mm' : invoiceFormat === '58mm' ? '58mm 297mm' : 'A4'
    const pageWidth = invoiceFormat === '80mm' ? '80mm' : invoiceFormat === '58mm' ? '58mm' : invoiceFormat === 'A5' ? '148mm' : '210mm'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn ${invoiceNumber}</title>
        <style>
          @page { size: ${pageSize}; margin: 10mm; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            max-width: ${pageWidth};
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #ff6600; }
          .company-info { font-size: 12px; color: #666; }
          .invoice-title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; }
          .customer-info { margin-bottom: 15px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { margin-top: 15px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .totals-row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .thermal { font-family: monospace; font-size: 10px; }
          .thermal .header { border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .thermal table { border: none; }
          .thermal th, .thermal td { border: none; padding: 2px 0; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body class="${invoiceFormat === '80mm' || invoiceFormat === '58mm' ? 'thermal' : ''}">
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
    
    // Update sale status to 'printed' after opening print dialog
    try {
      const { updateSaleStatus } = await import('@/app/sales/actions')
      await updateSaleStatus(saleId, 'printed')
    } catch (error) {
      console.error('Failed to update sale status:', error)
    }
  }

  const change = customerPayment - finalAmount
  const invoiceFormat = settings?.invoiceFormat || 'A4'
  const isThermal = invoiceFormat === '80mm' || invoiceFormat === '58mm'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Xem trước hóa đơn</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm">
                <Printer className="w-4 h-4 mr-2" />
                In hóa đơn
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className={`bg-white p-6 ${isThermal ? 'max-w-[80mm] mx-auto font-mono text-xs' : ''}`}>
          {/* Header */}
          <div className="header text-center mb-6">
            {settings?.companyBusinessLine && (
              <p className="text-sm text-gray-600">{settings.companyBusinessLine}</p>
            )}
            <h1 className="company-name text-2xl font-bold text-orange-500">
              {settings?.companyName || 'TÊN DOANH NGHIỆP'}
            </h1>
            {settings?.companyAddress && (
              <p className="company-info text-sm text-gray-600">{settings.companyAddress}</p>
            )}
            {settings?.companyPhone && (
              <p className="company-info text-sm text-gray-600">ĐT: {settings.companyPhone}</p>
            )}
          </div>

          {/* Invoice Title */}
          <h2 className="invoice-title text-xl font-bold text-center my-4">HÓA ĐƠN BÁN HÀNG</h2>

          {/* Invoice Info */}
          <div className="invoice-info flex justify-between text-sm mb-4">
            <span>Số HĐ: {invoiceNumber}</span>
            <span>Ngày: {transactionDate.toLocaleString('vi-VN')}</span>
          </div>

          {/* Customer Info */}
          <div className="customer-info text-sm mb-4">
            <p><strong>Khách hàng:</strong> {customerName || 'Khách lẻ'}</p>
            {customerPhone && <p><strong>SĐT:</strong> {customerPhone}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">STT</th>
                <th className="border p-2 text-left">Sản phẩm</th>
                <th className="border p-2 text-right">SL</th>
                <th className="border p-2 text-right">Đơn giá</th>
                <th className="border p-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2 text-right">{item.quantity}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals border-t pt-4">
            <div className="totals-row flex justify-between py-1">
              <span>Tổng tiền hàng:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row flex justify-between py-1">
                <span>Giảm giá:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            {vatAmount > 0 && (
              <div className="totals-row flex justify-between py-1">
                <span>VAT ({settings?.vatRate || 0}%):</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
            )}
            <div className="totals-row final flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg">
              <span>Tổng cộng:</span>
              <span>{formatCurrency(finalAmount)}</span>
            </div>
            <div className="totals-row flex justify-between py-1">
              <span>Khách thanh toán:</span>
              <span>{formatCurrency(customerPayment)}</span>
            </div>
            {change > 0 && (
              <div className="totals-row flex justify-between py-1 text-green-600">
                <span>Tiền thối lại:</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="footer text-center mt-8 text-sm text-gray-600">
            <p>Cảm ơn quý khách đã mua hàng!</p>
            <p>Hẹn gặp lại!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
