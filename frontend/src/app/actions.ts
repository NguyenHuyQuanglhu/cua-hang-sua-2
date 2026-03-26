'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: Record<string, unknown>;
  stores?: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
  error?: string;
}> {
  try {
    const result = await apiClient.login(email, password);
    return { 
      success: true, 
      user: result.user as Record<string, unknown>,
      stores: result.stores,
    };
  } catch (error: unknown) {
    console.error('Error logging in:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đăng nhập thất bại' 
    };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.logout();
    return { success: true };
  } catch (error: unknown) {
    console.error('Error logging out:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đăng xuất thất bại' 
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{
  success: boolean;
  user?: Record<string, unknown>;
  stores?: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
  error?: string;
}> {
  try {
    const result = await apiClient.getMe();
    return { 
      success: true, 
      user: result.user as Record<string, unknown>,
      stores: result.stores,
    };
  } catch (error: unknown) {
    console.error('Error getting current user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể lấy thông tin người dùng' 
    };
  }
}

/**
 * Set current store
 */
export function setCurrentStore(storeId: string): void {
  apiClient.setStoreId(storeId);
}

/**
 * Get stores for current user
 */
export async function getStores(): Promise<{
  success: boolean;
  stores?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const stores = await apiClient.getStores();
    return { success: true, stores: stores as unknown as Array<Record<string, unknown>> };
  } catch (error: unknown) {
    console.error('Error fetching stores:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách cửa hàng' 
    };
  }
}

/**
 * Get sales forecast based on actual sales history
 * Uses moving average algorithm to predict future sales
 */
export async function getSalesForecast(
  params: string | {
    historicalSalesData?: string;
    currentInventoryLevels?: string;
    forecastPeriodDays?: number;
    marketContext?: string;
  }
): Promise<{
  success: boolean;
  data?: {
    forecastedProducts: Array<{
      productId: string;
      productName: string;
      currentStock: number;
      forecastedSales: number;
      suggestion: string;
      suggestedReorderQuantity: number;
    }>;
    analysisSummary: string;
  };
  forecast?: Array<{ date: string; quantity: number }>;
  error?: string;
}> {
  try {
    // Handle old API (single product forecast)
    if (typeof params === 'string' || (typeof params === 'object' && 'productId' in params)) {
      const productId = typeof params === 'string' ? params : (params as any).productId;
      const days = typeof params === 'object' && 'days' in params ? (params as any).days : 30;
      
      // Fetch actual sales data for this product
      const salesResponse = await apiClient.request<{
        data: Array<{
          id: string;
          transactionDate: string;
          items?: Array<{ productId: string; quantity: number }>;
        }>;
      }>('/sales?pageSize=1000');

      const sales = (salesResponse as any).data || salesResponse || [];

      // Calculate daily sales for the past 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailySales: Map<string, number> = new Map();

      for (const sale of sales) {
        const saleDate = new Date(sale.transactionDate);
        if (saleDate >= thirtyDaysAgo && saleDate <= today) {
          const dateKey = saleDate.toISOString().split('T')[0];
          const items = sale.items || [];
          const productQty = items
            .filter((item: { productId: string }) => item.productId === productId)
            .reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);

          dailySales.set(dateKey, (dailySales.get(dateKey) || 0) + productQty);
        }
      }

      // Calculate 7-day moving average
      const salesValues = Array.from(dailySales.values());
      const avgDailySales = salesValues.length > 0
        ? salesValues.reduce((a, b) => a + b, 0) / salesValues.length
        : 0;

      // Generate forecast using simple moving average with slight variation
      const forecast = [];
      for (let i = 1; i <= days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        // Add small variation based on day of week (weekends may have different sales)
        const dayOfWeek = date.getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;

        forecast.push({
          date: date.toISOString().split('T')[0],
          quantity: Math.max(0, Math.round(avgDailySales * weekendFactor)),
        });
      }

      return { success: true, forecast };
    }

    // Handle new API (multi-product forecast with inventory)
    const historicalSalesData = params.historicalSalesData ? JSON.parse(params.historicalSalesData) : [];
    const currentInventoryLevels = params.currentInventoryLevels ? JSON.parse(params.currentInventoryLevels) : [];
    const forecastPeriodDays = params.forecastPeriodDays || 30;

    // Group sales by product
    const productSales: Map<string, Array<{ quantity: number; date: string }>> = new Map();
    
    console.log('[getSalesForecast] Processing historical sales:', historicalSalesData.length, 'items');
    
    historicalSalesData.forEach((sale: any) => {
      if (!productSales.has(sale.productId)) {
        productSales.set(sale.productId, []);
      }
      productSales.get(sale.productId)!.push({
        quantity: sale.quantity,
        date: sale.date,
      });
    });
    
    console.log('[getSalesForecast] Products with sales:', productSales.size);

    // Calculate forecast for each product
    const forecastedProducts = currentInventoryLevels.map((inventory: any) => {
      const sales = productSales.get(inventory.productId) || [];
      
      console.log(`[Product ${inventory.productName}] Sales records:`, sales.length);
      
      // Calculate date range from sales data
      const salesDates = sales.map(s => new Date(s.date).getTime()).filter(d => !isNaN(d));
      const today = Date.now();
      const thirtyDaysAgo = today - (30 * 24 * 60 * 60 * 1000);
      
      // Filter sales within last 30 days
      const recentSales = sales.filter(s => {
        const saleDate = new Date(s.date).getTime();
        return !isNaN(saleDate) && saleDate >= thirtyDaysAgo && saleDate <= today;
      });
      
      console.log(`[Product ${inventory.productName}] Recent sales (30d):`, recentSales.length);
      
      // Calculate average daily sales based on actual days with data
      const totalSales = recentSales.reduce((sum, s) => sum + s.quantity, 0);
      const daysWithData = recentSales.length > 0 ? 30 : 0; // Use 30 days as period
      const avgDailySales = daysWithData > 0 ? totalSales / daysWithData : 0;
      
      console.log(`[Product ${inventory.productName}] Total sales: ${totalSales}, Avg daily: ${avgDailySales}`);
      
      // Forecast for the period
      const forecastedSales = Math.round(avgDailySales * forecastPeriodDays);
      
      console.log(`[Product ${inventory.productName}] Forecasted sales (${forecastPeriodDays}d): ${forecastedSales}`);
      
      // Determine if reorder is needed
      const currentStock = inventory.quantityInStock || 0;
      const shortfall = forecastedSales - currentStock;
      
      let suggestion = 'Đủ hàng';
      let suggestedReorderQuantity = 0;
      
      // Handle negative inventory (over-sold items) - URGENT priority
      if (currentStock < 0) {
        suggestion = 'Khẩn cấp - Âm kho';
        // Need to cover the negative amount + forecasted sales + safety buffer
        suggestedReorderQuantity = Math.ceil((-currentStock + forecastedSales) * 1.3); // 30% buffer for urgent cases
      } else if (shortfall > 0) {
        suggestion = 'Cần nhập';
        // Add 20% buffer for normal cases
        suggestedReorderQuantity = Math.ceil(shortfall * 1.2);
      } else if (currentStock < avgDailySales * 7) {
        // Less than 1 week stock
        suggestion = 'Sắp hết';
        suggestedReorderQuantity = Math.ceil(avgDailySales * 14); // 2 weeks supply
      }
      
      return {
        productId: inventory.productId,
        productName: inventory.productName,
        currentStock,
        forecastedSales,
        suggestion,
        suggestedReorderQuantity,
      };
    });

    // Generate summary
    const needReorder = forecastedProducts.filter((p: any) => p.suggestedReorderQuantity > 0);
    const totalReorderQty = needReorder.reduce((sum: number, p: any) => sum + p.suggestedReorderQuantity, 0);
    
    const analysisSummary = `Phân tích ${currentInventoryLevels.length} sản phẩm cho ${forecastPeriodDays} ngày tới. ` +
      `Có ${needReorder.length} sản phẩm cần nhập thêm với tổng số lượng ${totalReorderQty.toLocaleString()} đơn vị. ` +
      (params.marketContext ? `Bối cảnh thị trường: ${params.marketContext}` : '');

    return {
      success: true,
      data: {
        forecastedProducts,
        analysisSummary,
      },
    };
  } catch (error: unknown) {
    console.error('Error generating sales forecast:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo dự báo bán hàng'
    };
  }
}

/**
 * Get product info suggestion (AI-powered)
 */
export async function getProductInfoSuggestion(
  params: string | {
    productName: string;
    categoryName?: string;
    unitName?: string;
    avgCost?: number;
  }
): Promise<{
  success: boolean;
  data?: {
    description: string;
    suggestedSellingPrice: number;
  };
  error?: string;
}> {
  try {
    // Parse params
    const productName = typeof params === 'string' ? params : params.productName;
    const categoryName = typeof params === 'object' ? params.categoryName : '';
    const unitName = typeof params === 'object' ? params.unitName : '';
    const avgCost = typeof params === 'object' ? params.avgCost : 0;

    if (!productName) {
      return {
        success: false,
        error: 'Tên sản phẩm không được để trống',
      };
    }

    // Generate description based on product name and category
    let description = `${productName}`;
    
    if (categoryName) {
      description += ` thuộc danh mục ${categoryName}`;
    }
    
    if (unitName) {
      description += `, đơn vị tính: ${unitName}`;
    }
    
    description += '. Sản phẩm chất lượng cao, phù hợp cho nhu cầu sử dụng hàng ngày.';

    // Calculate suggested selling price
    // Rule: Selling price = Cost * 1.3 (30% markup)
    // If no cost, suggest based on product type
    let suggestedSellingPrice = 0;
    
    if (avgCost && avgCost > 0) {
      suggestedSellingPrice = Math.round(avgCost * 1.3);
    } else {
      // Default pricing based on category
      if (categoryName?.toLowerCase().includes('sữa')) {
        suggestedSellingPrice = 25000;
      } else if (categoryName?.toLowerCase().includes('phô mai')) {
        suggestedSellingPrice = 45000;
      } else if (categoryName?.toLowerCase().includes('bơ')) {
        suggestedSellingPrice = 95000;
      } else {
        suggestedSellingPrice = 20000; // Default
      }
    }

    return {
      success: true,
      data: {
        description,
        suggestedSellingPrice,
      },
    };
  } catch (error) {
    console.error('Error generating product suggestion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo gợi ý sản phẩm',
    };
  }
}


/**
 * Get customer segments based on actual customer data
 * Segments customers by RFM analysis (Recency, Frequency, Monetary)
 */
export async function getCustomerSegments(
  _params?: Record<string, unknown>
): Promise<{
  success: boolean;
  segments?: Array<Record<string, unknown>>;
  data?: {
    segments: Array<{
      customerId: string;
      customerName: string;
      segment: string;
      reason: string;
      suggestedAction: string;
    }>;
    analysisSummary: string;
  };
  error?: string;
}> {
  try {
    // Fetch actual customers with their spending data
    const customersResponse = await apiClient.getCustomers();
    const customers = ((customersResponse as any).data || customersResponse || []) as Array<{
      id: string;
      name: string;
      totalSales?: number;
      totalSpent?: number;
      loyaltyTier?: string;
      createdAt: string;
    }>;

    // Fetch sales data for recency and frequency analysis
    const salesResponse = await apiClient.getSales({ pageSize: 10000 });
    const sales = ((salesResponse as any).data || salesResponse || []) as Array<{
      id: string;
      customerId?: string;
      transactionDate: string;
      finalAmount: number;
    }>;

    // Build customer RFM data
    const now = new Date();
    const customerRFM: Map<string, {
      recency: number; // Days since last purchase
      frequency: number; // Number of purchases
      monetary: number; // Total spent
      lastPurchaseDate: Date | null;
    }> = new Map();

    // Initialize all customers
    customers.forEach(c => {
      customerRFM.set(c.id, {
        recency: 9999, // Default to very old if no purchases
        frequency: 0,
        monetary: c.totalSales || c.totalSpent || 0,
        lastPurchaseDate: null,
      });
    });

    // Process sales to calculate RFM
    sales.forEach(sale => {
      if (!sale.customerId) return;
      const rfm = customerRFM.get(sale.customerId);
      if (rfm) {
        const saleDate = new Date(sale.transactionDate);
        const daysSincePurchase = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

        if (rfm.lastPurchaseDate === null || saleDate > rfm.lastPurchaseDate) {
          rfm.recency = daysSincePurchase;
          rfm.lastPurchaseDate = saleDate;
        }
        rfm.frequency++;
        rfm.monetary += sale.finalAmount || 0;
      }
    });

    // Define segment thresholds
    const vipMonetary = 10000000; // 10 million VND
    const loyalMonetary = 3000000; // 3 million VND
    const recentDays = 30; // 30 days
    const atRiskDays = 60; // 60 days
    const inactiveDays = 90; // 90 days

    // Segment each customer
    const segmentedCustomers: Array<{
      customerId: string;
      customerName: string;
      segment: string;
      reason: string;
      suggestedAction: string;
    }> = [];

    const segmentCounts: Record<string, number> = {
      'VIP': 0,
      'Trung thành': 0,
      'Tiềm năng': 0,
      'Nguy cơ rời bỏ': 0,
      'Mới': 0,
      'Không hoạt động': 0,
    };

    // Helper function to format money
    const formatMoney = (amount: number): string => {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(0)}tr ${((amount % 1000000) / 1000).toFixed(0)}k`.replace(' 0k', '');
      } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(0)}k`;
      } else {
        return `${amount.toFixed(0)}đ`;
      }
    };

    customers.forEach(customer => {
      const rfm = customerRFM.get(customer.id);
      if (!rfm) return;

      let segment = 'Mới';
      let reason = '';
      let suggestedAction = '';

      if (rfm.frequency === 0) {
        // No purchases yet
        segment = 'Mới';
        reason = 'Chưa có giao dịch nào (0đ)';
        suggestedAction = 'Gửi ưu đãi chào mừng, giới thiệu sản phẩm bán chạy';
      } else if (rfm.recency > inactiveDays) {
        // Inactive customer
        segment = 'Không hoạt động';
        reason = `Không giao dịch trong ${rfm.recency} ngày, ${rfm.frequency} lần mua với tổng ${formatMoney(rfm.monetary)}`;
        suggestedAction = 'Gửi email/SMS kích hoạt, ưu đãi đặc biệt để quay lại';
      } else if (rfm.recency > atRiskDays) {
        // At risk customer
        segment = 'Nguy cơ rời bỏ';
        reason = `${rfm.recency} ngày chưa quay lại, từng mua ${rfm.frequency} lần với tổng ${formatMoney(rfm.monetary)}`;
        suggestedAction = 'Liên hệ trực tiếp, tìm hiểu lý do và đề xuất ưu đãi';
      } else if (rfm.monetary >= vipMonetary && rfm.frequency >= 5) {
        // VIP customer
        segment = 'VIP';
        reason = `Tổng chi tiêu ${formatMoney(rfm.monetary)}, ${rfm.frequency} lần mua, mua gần nhất ${rfm.recency} ngày trước`;
        suggestedAction = 'Ưu tiên chăm sóc, gửi thông báo sản phẩm mới đầu tiên';
      } else if (rfm.monetary >= loyalMonetary || rfm.frequency >= 3) {
        // Loyal customer
        segment = 'Trung thành';
        reason = `${rfm.frequency} lần mua, chi tiêu ${formatMoney(rfm.monetary)}`;
        suggestedAction = 'Tặng điểm thưởng, mời tham gia chương trình VIP';
      } else if (rfm.recency <= recentDays && rfm.frequency <= 2) {
        // Potential customer
        segment = 'Tiềm năng';
        reason = `Khách hàng mới (${rfm.frequency} lần mua trong ${rfm.recency} ngày gần đây), chi tiêu ${formatMoney(rfm.monetary)}`;
        suggestedAction = 'Gửi ưu đãi lần mua tiếp theo, giới thiệu sản phẩm liên quan';
      } else {
        segment = 'Tiềm năng';
        reason = `${rfm.frequency} lần mua, chi tiêu ${formatMoney(rfm.monetary)}`;
        suggestedAction = 'Tăng cường marketing, gửi ưu đãi định kỳ';
      }

      segmentCounts[segment]++;
      segmentedCustomers.push({
        customerId: customer.id,
        customerName: customer.name,
        segment,
        reason,
        suggestedAction,
      });
    });

    // Generate analysis summary
    const totalCustomers = customers.length;
    const summaryParts: string[] = [];

    if (segmentCounts['VIP'] > 0) {
      summaryParts.push(`${segmentCounts['VIP']} khách VIP (${((segmentCounts['VIP'] / totalCustomers) * 100).toFixed(1)}%)`);
    }
    if (segmentCounts['Trung thành'] > 0) {
      summaryParts.push(`${segmentCounts['Trung thành']} khách trung thành`);
    }
    if (segmentCounts['Nguy cơ rời bỏ'] > 0) {
      summaryParts.push(`${segmentCounts['Nguy cơ rời bỏ']} khách có nguy cơ rời bỏ cần chú ý`);
    }
    if (segmentCounts['Không hoạt động'] > 0) {
      summaryParts.push(`${segmentCounts['Không hoạt động']} khách không hoạt động`);
    }

    const analysisSummary = `Phân tích ${totalCustomers} khách hàng: ${summaryParts.join(', ')}. ` +
      `Đề xuất: Tập trung chăm sóc nhóm VIP và Trung thành để duy trì doanh thu, ` +
      `đồng thời có chiến lược kích hoạt lại nhóm Nguy cơ rời bỏ.`;

    // Sort by segment priority: VIP > Nguy cơ > Trung thành > Tiềm năng > Mới > Không hoạt động
    const segmentOrder = ['VIP', 'Nguy cơ rời bỏ', 'Trung thành', 'Tiềm năng', 'Mới', 'Không hoạt động'];
    segmentedCustomers.sort((a, b) => {
      return segmentOrder.indexOf(a.segment) - segmentOrder.indexOf(b.segment);
    });

    return {
      success: true,
      data: {
        segments: segmentedCustomers,
        analysisSummary,
      },
    };
  } catch (error: unknown) {
    console.error('Error fetching customer segments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể phân tích phân khúc khách hàng'
    };
  }
}

/**
 * Get market basket analysis based on actual order data
 * Finds products that are frequently bought together (Association Rule Mining)
 */
export async function getMarketBasketAnalysis(
  _params?: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: {
    productPairs: Array<{
      productA_name: string;
      productB_name: string;
      frequency: number;
      support: number;
      confidence: number;
      lift: number;
      suggestion: string;
    }>;
    productClusters: Array<{
      products: string[];
      frequency: number;
      suggestion: string;
    }>;
    analysisSummary: string;
  };
  error?: string;
}> {
  try {
    // Fetch all sales items using optimized endpoint
    const itemsResponse = await apiClient.request<{
      data: Array<{ salesTransactionId: string; productId: string; productName?: string }>;
    }>('/sales/items/all');

    const allItems = ((itemsResponse as any).data || itemsResponse || []) as Array<{
      salesTransactionId: string;
      productId: string;
      productName?: string;
    }>;

    // Fetch products for name mapping
    const productsResponse = await apiClient.getProducts();
    const products = ((productsResponse as any).data || productsResponse || []) as Array<{
      id: string;
      name: string;
    }>;
    const productMap = new Map(products.map(p => [p.id, p.name]));

    // Group items by transaction
    const transactionItems: Map<string, string[]> = new Map();
    for (const item of allItems) {
      const items = transactionItems.get(item.salesTransactionId) || [];
      if (!items.includes(item.productId)) {
        items.push(item.productId);
      }
      transactionItems.set(item.salesTransactionId, items);
    }

    // Build product pair frequency
    const pairCount: Map<string, number> = new Map();
    const productCount: Map<string, number> = new Map();
    const clusterCount: Map<string, number> = new Map(); // For 3+ products
    let totalTransactions = 0;

    for (const [, productIds] of transactionItems) {
      if (productIds.length < 2) continue;

      totalTransactions++;

      // Count individual products
      for (const pid of productIds) {
        productCount.set(pid, (productCount.get(pid) || 0) + 1);
      }

      // Count product pairs
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const pairKey = [productIds[i], productIds[j]].sort().join('|');
          pairCount.set(pairKey, (pairCount.get(pairKey) || 0) + 1);
        }
      }

      // Count product clusters (3+ products)
      if (productIds.length >= 3) {
        const clusterKey = [...productIds].sort().join('|');
        clusterCount.set(clusterKey, (clusterCount.get(clusterKey) || 0) + 1);
      }
    }

    if (totalTransactions === 0) {
      return {
        success: true,
        data: {
          productPairs: [],
          productClusters: [],
          analysisSummary: 'Không có đủ dữ liệu giao dịch để phân tích. Cần ít nhất giao dịch có 2 sản phẩm trở lên.',
        },
      };
    }

    // Calculate support and confidence for each pair
    const minSupport = 0.01; // Minimum 1% of transactions
    const minConfidence = 0.2; // Minimum 20% confidence
    const productPairs: Array<{
      productA_name: string;
      productB_name: string;
      frequency: number;
      support: number;
      confidence: number;
      lift: number;
      suggestion: string;
    }> = [];

    for (const [pairKey, count] of pairCount.entries()) {
      const [pid1, pid2] = pairKey.split('|');
      const support = count / totalTransactions;

      if (support < minSupport) continue;

      const count1 = productCount.get(pid1) || 0;
      const count2 = productCount.get(pid2) || 0;

      // Confidence: P(B|A) = P(A,B) / P(A)
      const confidence1 = count1 > 0 ? count / count1 : 0;
      const confidence2 = count2 > 0 ? count / count2 : 0;
      const confidence = Math.max(confidence1, confidence2);

      if (confidence < minConfidence) continue;

      // Lift: P(A,B) / (P(A) * P(B))
      const prob1 = count1 / totalTransactions;
      const prob2 = count2 / totalTransactions;
      const lift = prob1 * prob2 > 0 ? support / (prob1 * prob2) : 0;

      const name1 = productMap.get(pid1) || pid1;
      const name2 = productMap.get(pid2) || pid2;

      // Generate suggestion based on lift
      let suggestion = '';
      if (lift > 3) {
        suggestion = `Tạo combo "${name1} + ${name2}" với giá ưu đãi. Khách hàng rất thường mua cùng nhau.`;
      } else if (lift > 2) {
        suggestion = `Đặt hai sản phẩm này gần nhau trên kệ hoặc trang web để tăng doanh số.`;
      } else if (lift > 1.5) {
        suggestion = `Gợi ý "${name2}" khi khách hàng thêm "${name1}" vào giỏ hàng.`;
      } else {
        suggestion = `Có thể xem xét khuyến mãi kèm theo khi mua một trong hai sản phẩm.`;
      }

      productPairs.push({
        productA_name: name1,
        productB_name: name2,
        frequency: count,
        support: Math.round(support * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        lift: Math.round(lift * 100) / 100,
        suggestion,
      });
    }

    // Sort by frequency (most bought together first)
    productPairs.sort((a, b) => b.frequency - a.frequency);

    // Build product clusters (top combinations of 3+ products)
    const productClusters: Array<{
      products: string[];
      frequency: number;
      suggestion: string;
    }> = [];

    const sortedClusters = [...clusterCount.entries()]
      .filter(([, count]) => count >= 2) // At least 2 occurrences
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 clusters

    for (const [clusterKey, count] of sortedClusters) {
      const productIds = clusterKey.split('|');
      const productNames = productIds.map(pid => productMap.get(pid) || pid);

      productClusters.push({
        products: productNames,
        frequency: count,
        suggestion: `Tạo bộ combo "${productNames.slice(0, 3).join(' + ')}" cho khách hàng mua nhiều.`,
      });
    }

    // Generate analysis summary
    const topPair = productPairs[0];
    const analysisSummary = productPairs.length > 0
      ? `Phân tích ${totalTransactions} giao dịch có nhiều sản phẩm. Tìm thấy ${productPairs.length} cặp sản phẩm thường mua cùng nhau.` +
        (topPair ? ` Cặp phổ biến nhất: "${topPair.productA_name}" và "${topPair.productB_name}" (${topPair.frequency} lần).` : '') +
        (productClusters.length > 0 ? ` Có ${productClusters.length} nhóm sản phẩm (3+) được mua cùng.` : '')
      : 'Chưa tìm thấy cặp sản phẩm nào có mối liên hệ đủ mạnh. Cần thêm dữ liệu bán hàng.';

    return {
      success: true,
      data: {
        productPairs: productPairs.slice(0, 20), // Top 20 pairs
        productClusters,
        analysisSummary,
      },
    };
  } catch (error: unknown) {
    console.error('Error analyzing market basket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể phân tích giỏ hàng'
    };
  }
}


/**
 * Get debt risk prediction based on actual customer data
 * Analyzes customer debt history and payment behavior
 */
export async function getDebtRiskPrediction(
  _input: string | Record<string, unknown>
): Promise<{
  success: boolean;
  data?: {
    riskAssessment: string;
    riskFactors: string;
    recommendations: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    riskScore?: number;
  };
  error?: string;
}> {
  try {
    // Parse input - can be customerId string or object with customer data
    let customerId: string | undefined;
    let customerName: string | undefined;
    let creditLimit: number | undefined;
    let outstandingBalance: number | undefined;
    
    if (typeof _input === 'string') {
      customerId = _input;
    } else {
      customerId = (_input as any).customerId;
      customerName = (_input as any).customerName;
      creditLimit = (_input as any).creditLimit;
      outstandingBalance = (_input as any).outstandingBalance;
    }

    // If we don't have customer data in input, fetch it
    let customer: {
      id: string;
      name: string;
      currentDebt?: number;
      totalDebt?: number;
      creditLimit?: number;
      totalSales?: number;
      totalPayments?: number;
      createdAt: string;
    } | null = null;

    if (customerId) {
      try {
        const customerResponse = await apiClient.getCustomer(customerId);
        customer = customerResponse as any;
      } catch (err) {
        console.warn('Could not fetch customer data:', err);
      }
    }

    // Use provided data or fallback to fetched customer data
    const name = customerName || customer?.name || 'Khách hàng';
    const currentDebt = outstandingBalance ?? customer?.currentDebt ?? customer?.totalDebt ?? 0;
    const limit = creditLimit ?? customer?.creditLimit ?? 0;
    const totalSales = customer?.totalSales ?? 0;
    const totalPayments = customer?.totalPayments ?? 0;

    // Calculate risk factors
    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Factor 1: Debt to credit limit ratio
    if (limit > 0) {
      const debtRatio = currentDebt / limit;
      if (debtRatio > 1) {
        riskScore += 0.4;
        factors.push(`Nợ vượt quá hạn mức tín dụng (${(debtRatio * 100).toFixed(0)}% hạn mức)`);
        recommendations.push('Yêu cầu thanh toán một phần nợ trước khi tiếp tục mua hàng');
      } else if (debtRatio > 0.8) {
        riskScore += 0.2;
        factors.push(`Nợ gần đạt hạn mức tín dụng (${(debtRatio * 100).toFixed(0)}% hạn mức)`);
        recommendations.push('Nhắc nhở khách hàng về hạn mức tín dụng');
      } else if (debtRatio > 0.5) {
        riskScore += 0.1;
        factors.push(`Nợ ở mức trung bình (${(debtRatio * 100).toFixed(0)}% hạn mức)`);
      }
    } else if (currentDebt > 0) {
      // No credit limit set but has debt
      riskScore += 0.15;
      factors.push('Chưa thiết lập hạn mức tín dụng');
      recommendations.push('Thiết lập hạn mức tín dụng phù hợp cho khách hàng');
    }

    // Factor 2: Payment history ratio
    if (totalSales > 0) {
      const paymentRatio = totalPayments / totalSales;
      if (paymentRatio < 0.5) {
        riskScore += 0.3;
        factors.push(`Tỷ lệ thanh toán thấp (${(paymentRatio * 100).toFixed(0)}%)`);
        recommendations.push('Xem xét yêu cầu đặt cọc cho đơn hàng mới');
      } else if (paymentRatio < 0.8) {
        riskScore += 0.15;
        factors.push(`Tỷ lệ thanh toán trung bình (${(paymentRatio * 100).toFixed(0)}%)`);
        recommendations.push('Khuyến khích thanh toán đúng hạn bằng ưu đãi');
      } else {
        factors.push(`Tỷ lệ thanh toán tốt (${(paymentRatio * 100).toFixed(0)}%)`);
      }
    }

    // Factor 3: Absolute debt amount
    if (currentDebt > 50000000) { // Over 50 million VND
      riskScore += 0.2;
      factors.push(`Số nợ tuyệt đối cao (${formatCurrency(currentDebt)})`);
      recommendations.push('Thiết lập kế hoạch thanh toán định kỳ');
    } else if (currentDebt > 20000000) { // Over 20 million VND
      riskScore += 0.1;
      factors.push(`Số nợ khá cao (${formatCurrency(currentDebt)})`);
    } else if (currentDebt > 0) {
      factors.push(`Số nợ ở mức chấp nhận được (${formatCurrency(currentDebt)})`);
    }

    // Factor 4: Account age (if customer data available)
    if (customer?.createdAt) {
      const accountAge = (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAge < 30 && currentDebt > 5000000) {
        riskScore += 0.15;
        factors.push('Tài khoản mới với nợ cao');
        recommendations.push('Theo dõi sát sao các đơn hàng mới');
      } else if (accountAge < 90) {
        factors.push(`Tài khoản còn mới (${Math.floor(accountAge)} ngày)`);
      }
    }

    // Normalize risk score
    riskScore = Math.min(1, riskScore);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let riskLevelText: string;
    
    if (riskScore >= 0.7) {
      riskLevel = 'critical';
      riskLevelText = 'RỦI RO CAO (Nguy hiểm)';
      if (recommendations.length === 0) {
        recommendations.push('Ngừng cấp tín dụng cho đến khi nợ được thanh toán');
      }
    } else if (riskScore >= 0.5) {
      riskLevel = 'high';
      riskLevelText = 'RỦI RO CAO';
      if (recommendations.length === 0) {
        recommendations.push('Giám sát chặt chẽ và giới hạn tín dụng');
      }
    } else if (riskScore >= 0.25) {
      riskLevel = 'medium';
      riskLevelText = 'RỦI RO TRUNG BÌNH';
      if (recommendations.length === 0) {
        recommendations.push('Tiếp tục theo dõi thường xuyên');
      }
    } else {
      riskLevel = 'low';
      riskLevelText = 'RỦI RO THẤP';
      if (factors.length === 0) {
        factors.push('Không có yếu tố rủi ro đáng kể');
      }
      if (recommendations.length === 0) {
        recommendations.push('Duy trì quan hệ tốt với khách hàng');
      }
    }

    // Build formatted strings for the component
    const riskAssessment = `Mức độ rủi ro: ${riskLevelText}\n\n` +
      `Khách hàng "${name}" có điểm rủi ro ${(riskScore * 100).toFixed(0)}/100. ` +
      (currentDebt > 0 
        ? `Hiện tại đang nợ ${formatCurrency(currentDebt)}` + (limit > 0 ? ` trên hạn mức ${formatCurrency(limit)}.` : '.')
        : 'Hiện không có công nợ.');

    const riskFactors = factors.length > 0
      ? factors.map((f, i) => `${i + 1}. ${f}`).join('\n')
      : 'Không có yếu tố rủi ro đáng kể.';

    const recommendationsText = recommendations.length > 0
      ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'Tiếp tục duy trì quan hệ tốt với khách hàng.';

    return {
      success: true,
      data: {
        riskAssessment,
        riskFactors,
        recommendations: recommendationsText,
        riskLevel,
        riskScore,
      },
    };
  } catch (error: unknown) {
    console.error('Error predicting debt risk:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể dự đoán rủi ro công nợ'
    };
  }
}

/**
 * Get related products suggestion (placeholder for AI feature)
 */
export async function getRelatedProductsSuggestion(
  _input: string[] | Record<string, unknown>
): Promise<{
  success: boolean;
  suggestions?: Array<{
    productId: string;
    productName: string;
    relevanceScore: number;
    reason: string;
  }>;
  error?: string;
}> {
  // Placeholder - return empty suggestions
  return {
    success: true,
    suggestions: [],
  };
}
