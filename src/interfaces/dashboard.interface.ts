/**
 * Dashboard-specific response interfaces
 * Lightweight, pre-aggregated data optimized for fast dashboard rendering
 */

export interface DashboardKPIs {
  revenue: {
    total: number;
    period: number;
    previousPeriod?: number;
    growthPercentage?: number;
  };
  sales: {
    total: number;
    period: number;
    previousPeriod?: number;
    growthPercentage?: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  batches: {
    total: number;
    active: number;
  };
  inventory: {
    totalValue: number;
    totalQuantity: number;
    lowStockItems: number;
  };
  production: {
    totalProduced: number;
    totalSold: number;
    utilizationRate: number;
  };
}

export interface DashboardSummaryResponse {
  kpis: DashboardKPIs;
  period: {
    from: string;
    to: string;
  };
  comparisonPeriod?: {
    from: string;
    to: string;
  };
  lastUpdated: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface DashboardTrendsResponse {
  period: string;
  sales: {
    label: string;
    data: TrendDataPoint[];
    total: number;
    trend: "up" | "down" | "stable";
    changePercentage: number;
  };
  revenue: {
    label: string;
    data: TrendDataPoint[];
    total: number;
    trend: "up" | "down" | "stable";
    changePercentage: number;
  };
  productionVsSales: {
    produced: TrendDataPoint[];
    sold: TrendDataPoint[];
  };
}

export interface ProductHighlight {
  productId: string;
  productName: string;
  category: string;
  metric: number;
  change?: number;
  changePercentage?: number;
}

export interface DashboardHighlightsResponse {
  topSellers: ProductHighlight[];
  bottomPerformers: ProductHighlight[];
  fastestGrowing: ProductHighlight[];
  declining: ProductHighlight[];
}

export interface InventoryAlert {
  type: "low_stock" | "overstock" | "expiring_soon" | "expired";
  severity: "critical" | "warning" | "info";
  productId?: string;
  productName?: string;
  batchId?: string;
  batchNumber?: string;
  message: string;
  value: number;
  threshold?: number;
  daysUntilExpiry?: number;
}

export interface DashboardAlertsResponse {
  total: number;
  critical: number;
  warnings: number;
  alerts: InventoryAlert[];
}

export interface RecentSale {
  saleId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  createdAt: string;
}

export interface RecentBatch {
  batchId: string;
  batchNumber: string;
  productName: string;
  quantity: number;
  productionDate: string;
}

export interface RecentInventoryChange {
  type: "production" | "sale" | "adjustment";
  productName: string;
  quantityChange: number;
  timestamp: string;
}

export interface DashboardActivityResponse {
  recentSales: RecentSale[];
  recentBatches: RecentBatch[];
  recentChanges: RecentInventoryChange[];
}
