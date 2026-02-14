/**
 * Response interfaces for reports
 */

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  totalQuantitySold: number;
}

export interface SalesReportResponse {
  summary: SalesMetrics;
  timeSeries?: TimeSeriesDataPoint[];
  trends?: {
    revenueGrowth: number;
    salesGrowth: number;
    averageOrderValueGrowth: number;
  };
}

export interface ProductSalesData {
  productId: string;
  productName: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  numberOfSales: number;
  averagePrice: number;
}

export interface ProductPerformanceResponse {
  summary: {
    totalProducts: number;
    totalRevenue: number;
    averageSalesPerProduct: number;
  };
  products: ProductSalesData[];
}

export interface CategorySalesData {
  category: string;
  totalRevenue: number;
  totalQuantitySold: number;
  numberOfSales: number;
  percentageOfTotal: number;
}

export interface CategoryReportResponse {
  summary: {
    totalCategories: number;
    totalRevenue: number;
  };
  categories: CategorySalesData[];
}

export interface BatchProductionData {
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  productionDate: Date;
  expiryDate: Date;
  initialQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
  soldPercentage: number;
  daysUntilExpiry: number;
  isActive: boolean;
}

export interface BatchReportResponse {
  summary: {
    totalBatches: number;
    totalProduction: number;
    totalSold: number;
    totalRemaining: number;
    averageUtilization: number;
  };
  batches: BatchProductionData[];
}

export interface InventoryItem {
  productId: string;
  productName: string;
  category: string;
  totalStock: number;
  totalValue: number;
  numberOfBatches: number;
  oldestBatchDate: Date;
  newestBatchDate: Date;
  isLowStock: boolean;
}

export interface InventoryReportResponse {
  summary: {
    totalProducts: number;
    totalStockQuantity: number;
    totalInventoryValue: number;
    lowStockItems: number;
  };
  inventory: InventoryItem[];
}

export interface ComparativeMetrics {
  current: SalesMetrics;
  previous: SalesMetrics;
  growth: {
    revenueGrowth: number;
    revenueGrowthPercentage: number;
    salesGrowth: number;
    salesGrowthPercentage: number;
    averageOrderValueGrowth: number;
    averageOrderValueGrowthPercentage: number;
  };
}

export interface TopProduct {
  productId: string;
  productName: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  numberOfSales: number;
  rank: number;
}

export interface TopProductsResponse {
  period: {
    from: string;
    to: string;
  };
  topProducts: TopProduct[];
}

export interface StockMovementData {
  date: string;
  produced: number;
  sold: number;
  netChange: number;
  closingStock: number;
}

export interface StockMovementResponse {
  summary: {
    totalProduced: number;
    totalSold: number;
    netChange: number;
    currentStock: number;
  };
  movements: StockMovementData[];
}

export interface RevenueByProductData {
  productId: string;
  productName: string;
  totalRevenue: number;
  percentageOfTotal: number;
  trend?: "up" | "down" | "stable";
}

export interface RevenueDistributionResponse {
  summary: {
    totalRevenue: number;
    numberOfProducts: number;
  };
  distribution: RevenueByProductData[];
}

export interface BatchAgingData {
  batchId: string;
  batchNumber: string;
  productName: string;
  productionDate: Date;
  expiryDate: Date;
  daysUntilExpiry: number;
  remainingQuantity: number;
  ageInDays: number;
  status: "fresh" | "aging" | "critical" | "expired";
}

export interface BatchAgingResponse {
  summary: {
    totalBatches: number;
    freshBatches: number;
    agingBatches: number;
    criticalBatches: number;
    expiredBatches: number;
  };
  batches: BatchAgingData[];
}

export interface DashboardSummaryResponse {
  sales: SalesMetrics;
  salesTrends?: {
    revenueGrowth: number;
    salesGrowth: number;
    averageOrderValueGrowth: number;
  };
  inventory: {
    totalProducts: number;
    totalStockQuantity: number;
    totalInventoryValue: number;
    lowStockItems: number;
  };
  production: {
    totalBatches: number;
    totalProduction: number;
    totalSold: number;
    totalRemaining: number;
    averageUtilization: number;
  };
  topProducts: TopProduct[];
  timestamp: string;
}

export interface DeliveryFeeData {
  country: string;
  region?: string;
  totalOrders: number;
  totalDeliveryFees: number;
  averageDeliveryFee: number;
  ordersWithDelivery: number;
  ordersWithoutDelivery: number;
}

export interface DeliveryReportResponse {
  summary: {
    totalOrders: number;
    totalDeliveryRevenue: number;
    averageDeliveryFee: number;
    ordersAwaitingDeliveryCalc: number;
    ordersWithDelivery: number;
    ordersWithoutDelivery: number;
  };
  byLocation: DeliveryFeeData[];
  timeSeries?: TimeSeriesDataPoint[];
}
