'use client'

import { useEffect, useState } from "react"
import { useStore } from "@/contexts/store-context"
import { apiClient } from "@/lib/api-client"
import { formatCurrency } from "@/lib/utils"

interface RevenueChartProps {
  timeRange: '7d' | '30d' | '90d';
}

export function RevenueChart({ timeRange }: RevenueChartProps) {
  const { currentStore } = useStore();
  const [data, setData] = useState<Array<{ date: string; revenue: number }>>([]);
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

      const response = await apiClient.getSalesReport({
        dateFrom: startDate.toISOString().split('T')[0],
        dateTo: endDate.toISOString().split('T')[0],
        includeDetails: false
      });

      // Use dailySummary from API response
      const dailySummary = (response as any).dailySummary || [];
      
      const chartData = dailySummary.map((day: any) => ({
        date: day.date,
        revenue: day.totalRevenue || 0
      })).sort((a: any, b: any) => a.date.localeCompare(b.date));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center">Đang tải...</div>;
  }

  if (data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div>;
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <div className="h-[300px]">
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((item, index) => {
          const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center" style={{ height: '250px' }}>
                <div 
                  className="w-full bg-primary rounded-t hover:bg-primary/80 transition-all cursor-pointer relative group"
                  style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                  title={`${new Date(item.date).toLocaleDateString('vi-VN')}: ${formatCurrency(item.revenue)}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
