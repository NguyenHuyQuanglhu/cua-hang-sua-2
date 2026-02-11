'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { useStore } from "@/contexts/store-context"
import { apiClient } from "@/lib/api-client"

interface LowStockProduct {
  id: string;
  name: string;
  currentStock: number;
  lowStockThreshold: number;
  unitName: string;
}

export function LowStockAlert() {
  const { currentStore } = useStore();
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore?.id) return;
    fetchData();
  }, [currentStore]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getInventoryReport({ lowStockOnly: false });
      const inventoryData = (response as any).data || [];
      
      const lowStock = inventoryData
        .filter((p: any) => p.closingStock <= (p.lowStockThreshold || 10))
        .slice(0, 5)
        .map((p: any) => ({
          id: p.productId,
          name: p.productName,
          currentStock: p.closingStock,
          lowStockThreshold: p.lowStockThreshold || 10,
          unitName: p.mainUnitName || p.baseUnitName || ''
        }));

      setProducts(lowStock);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cảnh báo tồn kho thấp
            </CardTitle>
            <CardDescription>Sản phẩm cần nhập thêm</CardDescription>
          </div>
          <Link href="/reports/inventory">
            <Button variant="ghost" size="sm">
              Xem tất cả
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-green-600">✓ Tất cả sản phẩm đều đủ hàng</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Còn: <span className="font-semibold text-amber-600">{product.currentStock}</span> {product.unitName}
                    {' '} (Tối thiểu: {product.lowStockThreshold})
                  </p>
                </div>
                <Link href={`/products`}>
                  <Button variant="outline" size="sm">
                    Nhập hàng
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
