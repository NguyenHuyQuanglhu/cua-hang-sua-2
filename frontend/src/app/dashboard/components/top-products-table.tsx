'use client'

import { useEffect, useState } from "react"
import { useStore } from "@/contexts/store-context"
import { apiClient } from "@/lib/api-client"
import { formatCurrency } from "@/lib/utils"

interface TopProductsTableProps {
  timeRange: '7d' | '30d' | '90d';
}

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export function TopProductsTable({ timeRange }: TopProductsTableProps) {
  const { currentStore } = useStore();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore?.id) return;
    fetchData();
  }, [currentStore, timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log('[TopProductsTable] Fetching data:', {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        timeRange
      });

      const response = await apiClient.getSoldProductsReport(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      console.log('[TopProductsTable] API response:', response);

      // API returns flat array, not {data: [...]}
      const soldProducts = Array.isArray(response) ? response : [];
      console.log('[TopProductsTable] Sold products:', soldProducts);
      
      const topProducts = soldProducts
        .sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        .slice(0, 5)
        .map((p: any) => ({
          productId: p.id,
          productName: p.name,
          quantity: p.totalSold || 0,
          revenue: p.totalRevenue || 0
        }));

      console.log('[TopProductsTable] Top products:', topProducts);
      setProducts(topProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (products.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</div>;
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <div key={product.productId} className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{product.productName}</p>
            <p className="text-xs text-muted-foreground">Đã bán: {product.quantity}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{formatCurrency(product.revenue)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
