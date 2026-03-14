
'use client'

import React, { useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print';
import type { Customer, Sale, SalesItem, Product, Unit, ThemeSettings } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { updateSaleStatus } from '../../actions';

interface ThermalReceiptProps {
    sale: Sale;
    items: SalesItem[];
    customer: Customer | null;
    productsMap: Map<string, Product>;
    unitsMap: Map<string, Unit>;
    settings: ThemeSettings | null;
    storeName?: string;
}

const ThermalReceipt = (props: ThermalReceiptProps) => {
    const { sale, items, customer, productsMap, unitsMap, settings, storeName } = props;
    const componentRef = useRef<HTMLDivElement>(null);

    const onAfterPrint = async () => {
        if (sale.status !== 'printed') {
            await updateSaleStatus(sale.id, 'printed');
        }
        window.close();
    }

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: onAfterPrint,
    });
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handlePrint();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handlePrint]);

    const paperWidth = settings?.invoiceFormat === '58mm' ? 'w-[58mm]' : 'w-[80mm]';
    const isChange = (sale.remainingDebt || 0) < 0;

    return (
        <div className="bg-gray-100 p-4 flex flex-col items-center">
            {/* Component to be printed */}
           

            <div ref={componentRef} className={`p-1 font-mono text-[10px] bg-white text-black ${paperWidth}`}>
                <div className="text-center space-y-1">
                    {settings?.companyBusinessLine && <p className="font-bold">{settings.companyBusinessLine}</p>}
                    {storeName && <p className="text-lg font-bold" style={{ color: '#f97316' }}>{storeName}</p>}
                    {settings?.companyAddress && <p>{settings.companyAddress}</p>}
                    {settings?.companyPhone && <p>ĐT: {settings.companyPhone}</p>}
                </div>

                <hr className="my-2 border-t border-dashed border-black" />

                <div className="text-center">
                    <p className="text-lg font-bold">HOÁ ĐƠN BÁN HÀNG</p>
                    <p>Số: {sale.invoiceNumber}</p>
                    <p>Ngày: {new Date(sale.transactionDate).toLocaleString('vi-VN')}</p>
                </div>

                <hr className="my-2 border-t border-dashed border-black" />

                <div>
                    <p>KH: {customer?.name || 'Khách lẻ'}</p>
                    {customer?.phone && <p>ĐT: {customer.phone}</p>}
                </div>

                <table className="w-full mt-2">
                    <thead>
                        <tr>
                            <th className="text-left font-bold">Tên hàng</th>
                            <th className="text-right font-bold">SL</th>
                            <th className="text-right font-bold">Đ.Giá</th>
                            <th className="text-right font-bold">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const product = productsMap.get(item.productId);
                            if (!product) return null;
                            const lineTotal = item.quantity * item.price;
                            return (
                                <React.Fragment key={index}>
                                    <tr>
                                        <td className="text-left" colSpan={4}>{product.name}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-left"></td>
                                        <td className="text-right">{item.quantity}</td>
                                        <td className="text-right">{formatCurrency(item.price)}</td>
                                        <td className="text-right">{formatCurrency(lineTotal)}</td>
                                    </tr>
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>

                <hr className="my-2 border-t border-dashed border-black" />

                <div className="space-y-1">
                    <div className="flex justify-between"><span>Tổng tiền hàng:</span> <span>{formatCurrency(sale.totalAmount)}</span></div>
                    {sale.tierDiscountAmount && sale.tierDiscountAmount > 0 ? (
                        <div className="flex justify-between"><span>Ưu đãi hạng:</span> <span>-{formatCurrency(sale.tierDiscountAmount)}</span></div>
                    ) : null}
                    {sale.discount && sale.discount > 0 ? (
                        <div className="flex justify-between"><span>Giảm giá:</span> <span>-{formatCurrency(sale.discount)}</span></div>
                    ) : null}
                    {sale.pointsDiscount && sale.pointsDiscount > 0 ? (
                        <div className="flex justify-between"><span>Giảm điểm:</span> <span>-{formatCurrency(sale.pointsDiscount)}</span></div>
                    ) : null}
                    {sale.vatAmount && sale.vatAmount > 0 ? (
                        <div className="flex justify-between"><span>VAT:</span> <span>{formatCurrency(sale.vatAmount)}</span></div>
                    ) : null}
                    <div className="flex justify-between font-bold text-lg"><p>TỔNG CỘNG:</p> <p>{formatCurrency(sale.finalAmount)}</p></div>
                    <div className="flex justify-between"><span>Nợ cũ:</span> <span>{formatCurrency(sale.previousDebt || 0)}</span></div>
                    <div className="flex justify-between"><span>Khách trả:</span> <span>{formatCurrency(sale.customerPayment || 0)}</span></div>
                    <div className="flex justify-between font-bold text-lg">
                        <p>{isChange ? 'Tiền thối lại:' : 'Còn lại:'}</p>
                        <p>{formatCurrency(Math.abs(sale.remainingDebt || 0))}</p>
                    </div>
                </div>

                <hr className="my-2 border-t border-dashed border-black" />

                <div className="text-center mt-2">
                    <p>Cảm ơn quý khách!</p>
                </div>
            </div>
          

            {/* Print trigger */}
            <div className="mt-4 flex justify-center no-print">
                 <Button onClick={handlePrint} autoFocus>
                    <Printer className="mr-2 h-4 w-4" /> In hóa đơn (Enter)
                </Button>
            </div>
        </div>
    );
};

ThermalReceipt.displayName = 'ThermalReceipt';

export { ThermalReceipt };
