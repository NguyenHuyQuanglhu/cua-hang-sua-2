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
  const [lastFetchedStore, setLastFetchedStore] = useState<string | null>(null);

  useEffect(() => {
    if (!currentStore?.id) return;
    
    // Only fetch if store changed or timeRange changed
    if (lastFetchedStore !== currentStore.id) {
      setLastFetchedStore(currentStore.id);
      fetchDashboardData();
    }
  }, [currentStore?.id]);

  useEffect(() => {
    // Fetch when timeRange changes (but only if we have a store)
    if (currentStore?.id && lastFetchedStore === currentStore.id) {
      fetchDashboardData();
    }
  }, [timeRange]);

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
    <div className="space-y-8 pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border shadow-sm">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bảng điều khiển
            </h1>
            <p className="text-base text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Tổng quan hoạt động kinh doanh của {currentStore?.name}
            </p>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList className="bg-background/50 backdrop-blur-sm">
              <TabsTrigger value="7d" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">7 ngày</TabsTrigger>
              <TabsTrigger value="30d" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">30 ngày</TabsTrigger>
              <TabsTrigger value="90d" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">90 ngày</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats Cards with Enhanced Design */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card className="group relative overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background" onClick={() => router.push('/reports/income-statement')}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Doanh thu tháng này</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{formatCurrency(stats?.revenue.thisMonth || 0)}</div>
            <div className="flex items-center gap-2 mt-3">
              {stats && stats.revenue.percentChange >= 0 ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">+{stats.revenue.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10">
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">{stats?.revenue.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              )}
              <span className="text-xs text-muted-foreground">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="group relative overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-500/10 via-green-500/5 to-background" onClick={() => router.push('/reports/profit')}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Lợi nhuận tháng này</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{formatCurrency(stats?.profit.thisMonth || 0)}</div>
            <div className="flex items-center gap-2 mt-3">
              {stats && stats.profit.percentChange >= 0 ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">+{stats.profit.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10">
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">{stats?.profit.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              )}
              <span className="text-xs text-muted-foreground">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Sales Card */}
        <Card className="group relative overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background" onClick={() => router.push('/sales')}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Đơn hàng tháng này</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{stats?.sales.thisMonth || 0}</div>
            <div className="flex items-center gap-2 mt-3">
              {stats && stats.sales.percentChange >= 0 ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">+{stats.sales.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10">
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">{stats?.sales.percentChange.toFixed(1)}%</span>
                  </div>
                </>
              )}
              <span className="text-xs text-muted-foreground">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Card */}
        <Card className="group relative overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background" onClick={() => router.push('/reports/inventory')}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Tồn kho</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight">{stats?.inventory.totalProducts || 0}</div>
            <div className="flex items-center gap-2 mt-3">
              {stats && stats.inventory.lowStockCount > 0 ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{stats.inventory.lowStockCount} sắp hết</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">Tồn kho ổn định</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables with Enhanced Design */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-0 shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader className="bg-gradient-to-br from-muted/50 to-background">
            <CardTitle className="text-xl font-bold">Doanh thu</CardTitle>
            <CardDescription className="text-sm">Biểu đồ doanh thu theo thời gian</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pt-6">
            <RevenueChart timeRange={timeRange} />
          </CardContent>
        </Card>

        <Card className="col-span-3 border-0 shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <CardHeader className="bg-gradient-to-br from-muted/50 to-background">
            <CardTitle className="text-xl font-bold">Top sản phẩm bán chạy</CardTitle>
            <CardDescription className="text-sm">Sản phẩm có doanh số cao nhất</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <TopProductsTable timeRange={timeRange} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="transform transition-all duration-300 hover:scale-[1.02]">
          <LowStockAlert />
        </div>
      </div>
    </div>
  )
}
