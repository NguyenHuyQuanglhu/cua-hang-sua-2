'use client'

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Building2, ArrowRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DebtOverviewProps {
  customerDebt: number;
  supplierDebt: number;
}

export function DebtOverview({ customerDebt, supplierDebt }: DebtOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tổng quan công nợ</CardTitle>
            <CardDescription>Công nợ khách hàng và nhà cung cấp</CardDescription>
          </div>
          <Link href="/reports/debt">
            <Button variant="ghost" size="sm">
              Chi tiết
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Debt */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Khách hàng nợ</p>
              <p className="text-xs text-muted-foreground">Tổng công nợ phải thu</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(customerDebt)}</p>
            <Link href="/reports/debt">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                Xem chi tiết →
              </Button>
            </Link>
          </div>
        </div>

        {/* Supplier Debt */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Nợ nhà cung cấp</p>
              <p className="text-xs text-muted-foreground">Tổng công nợ phải trả</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-orange-600">{formatCurrency(supplierDebt)}</p>
            <Link href="/reports/supplier-debt">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                Xem chi tiết →
              </Button>
            </Link>
          </div>
        </div>

        {/* Net Position */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Vị thế ròng</p>
            <p className={`text-lg font-bold ${customerDebt - supplierDebt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(customerDebt - supplierDebt)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {customerDebt - supplierDebt >= 0 
              ? 'Khách hàng nợ nhiều hơn nợ NCC' 
              : 'Nợ NCC nhiều hơn khách hàng nợ'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
