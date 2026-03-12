'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/contexts/store-context"
import { apiClient } from "@/lib/api-client"
import { RevenueChart } from "./components/revenue-chart"
import { TopProductsTable } from "./components/top-products-table"
import { LowStockAlert } from "./components/low-stock-alert"

interface DashboardStats {
  revenue: {
    today: number;
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  profit: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  sales: {
    today: number;
    thisMonth: number;
    percentChange: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    totalValue: number;
  };
  debt: {
    customerDebt: number;
    supplierDebt: number;
  };
}

export default function DashboardPage() {
  const { currentStore } = useStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!currentStore?.id) return;
    
    fetchDashboardData();
  }, [currentStore, timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const [
        salesThisMonth,
        salesLastMonth,
        inventoryReport,
        debtReport,
        supplierDebtReport,
        profitReport,
        profitLastMonth
      ] = await Promise.all([
        apiClient.getSalesReport({ 
          dateFrom: startOfMonth.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0]
        }),
        apiClient.getSalesReport({ 
          dateFrom: startOfLastMonth.toISOString().split('T')[0],
          dateTo: endOfLastMonth.toISOString().split('T')[0]
        }),
        apiClient.getInventoryReport({ lowStockOnly: false }),
        apiClient.getDebtReport({ hasDebtOnly: false }),
        apiClient.getSupplierDebtReport(),
        apiClient.getProfitReport({
          dateFrom: startOfMonth.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0]
        }),
        apiClient.getProfitReport({
          dateFrom: startOfLastMonth.toISOString().split('T')[0],
          dateTo: endOfLastMonth.toISOString().split('T')[0]
        })
      ]);

      // Calculate stats
      const thisMonthRevenue = (salesThisMonth as any).summary?.totalRevenue || 0;
      const lastMonthRevenue = (salesLastMonth as any).summary?.totalRevenue || 0;
      const revenueChange = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const thisMonthProfit = (profitReport as any).summary?.totalProfit || 0;
      const lastMonthProfit = (profitLastMonth as any).summary?.totalProfit || 0;
      const profitChange = lastMonthProfit > 0
        ? ((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100
        : 0;

      const thisMonthSales = (salesThisMonth as any).summary?.totalOrders || 0;
      const lastMonthSales = (salesLastMonth as any).summary?.totalOrders || 0;
      const salesChange = lastMonthSales > 0
        ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100
        : 0;

      const inventoryData = (inventoryReport as any).data || [];
      const lowStockProducts = inventoryData.filter((p: any) => 
        p.closingStock <= (p.lowStockThreshold || 10)
      );

      // Calculate total inventory value, but ignore negative stock values
      const totalInventoryValue = inventoryData.reduce((sum: number, p: any) => {
        const stockValue = (p.closingStock || 0) * (p.avgCost || 0);
        return sum + (stockValue > 0 ? stockValue : 0);
      }, 0);

      // Count products with valid inventory (non-negative)
      const validProductsCount = inventoryData.filter((p: any) => 
        p.closingStock !== null && p.closingStock !== undefined
      ).length;

      const customerDebt = (debtReport as any).totals?.totalDebt || 0;
      const supplierDebt = (supplierDebtReport as any).data?.reduce((sum: number, s: any) => 
        sum + (s.totalDebt || 0), 0
      ) || 0;

      setStats({
        revenue: {
          today: 0, // Would need today's sales
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          percentChange: revenueChange
        },
        profit: {
          thisMonth: thisMonthProfit,
          lastMonth: lastMonthProfit,
          percentChange: profitChange
        },
        sales: {
          today: 0,
          thisMonth: thisMonthSales,
          percentChange: salesChange
        },
        inventory: {
          totalProducts: validProductsCount,
          lowStockCount: lowStockProducts.length,
          totalValue: totalInventoryValue
        },
        debt: {
          customerDebt,
          supplierDebt
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Tổng quan hoạt động kinh doanh của {currentStore?.name}
          </p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 ngày</TabsTrigger>
            <TabsTrigger value="30d">30 ngày</TabsTrigger>
            <TabsTrigger value="90d">90 ngày</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/reports/income-statement')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng này</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.revenue.thisMonth || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats && stats.revenue.percentChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">+{stats.revenue.percentChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{stats?.revenue.percentChange.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">so với tháng trước</span>
            </p>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/reports/profit')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi nhuận tháng này</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.profit.thisMonth || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats && stats.profit.percentChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">+{stats.profit.percentChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{stats?.profit.percentChange.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">so với tháng trước</span>
            </p>
          </CardContent>
        </Card>

        {/* Sales Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/sales')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng tháng này</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sales.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats && stats.sales.percentChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">+{stats.sales.percentChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500">{stats?.sales.percentChange.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">so với tháng trước</span>
            </p>
          </CardContent>
        </Card>

        {/* Inventory Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/reports/inventory')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tồn kho</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inventory.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats && stats.inventory.lowStockCount > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
                  <span className="text-amber-500">{stats.inventory.lowStockCount} sản phẩm sắp hết</span>
                </>
              ) : (
                <span className="text-green-500">Tồn kho ổn định</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Doanh thu</CardTitle>
            <CardDescription>Biểu đồ doanh thu theo thời gian</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart timeRange={timeRange} />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top sản phẩm bán chạy</CardTitle>
            <CardDescription>Sản phẩm có doanh số cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsTable timeRange={timeRange} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LowStockAlert />
      </div>
    </div>
  )
}
