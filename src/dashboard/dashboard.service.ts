import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import {
  DashboardSummaryQueryDto,
  DashboardTrendsQueryDto,
  DashboardHighlightsQueryDto,
  DashboardAlertsQueryDto,
  DashboardActivityQueryDto,
  TrendPeriod,
} from "../dto/dashboard.dto";
import {
  DashboardSummaryResponse,
  DashboardTrendsResponse,
  DashboardHighlightsResponse,
  DashboardAlertsResponse,
  DashboardActivityResponse,
  DashboardKPIs,
  TrendDataPoint,
  ProductHighlight,
  InventoryAlert,
  RecentSale,
  RecentBatch,
  RecentInventoryChange,
} from "../interfaces/dashboard.interface";
import { SaleStatus } from "../enum/sale-status.enum";
import { ProductStatus } from "../enum/product-status.enum";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Get dashboard summary with high-level KPIs
   */
  public async getSummary(
    queryDto: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    const { fromDate, toDate, includeComparison } = queryDto;

    // Determine period dates
    const periodEnd = toDate ? new Date(toDate) : new Date();
    const periodStart = fromDate
      ? new Date(fromDate)
      : new Date(new Date().setDate(periodEnd.getDate() - 30));

    // Get KPIs
    const kpis = await this.calculateKPIs(periodStart, periodEnd);

    // Calculate comparison if requested
    if (includeComparison) {
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      const comparisonEnd = new Date(periodStart.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - periodLength);

      const previousKPIs = await this.calculateKPIs(
        comparisonStart,
        comparisonEnd,
      );

      // Add growth percentages
      kpis.revenue.previousPeriod = previousKPIs.revenue.period;
      kpis.revenue.growthPercentage = this.calculateGrowth(
        kpis.revenue.period,
        previousKPIs.revenue.period,
      );

      kpis.sales.previousPeriod = previousKPIs.sales.period;
      kpis.sales.growthPercentage = this.calculateGrowth(
        kpis.sales.period,
        previousKPIs.sales.period,
      );
    }

    return {
      kpis,
      period: {
        from: periodStart.toISOString(),
        to: periodEnd.toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get dashboard trends for preview charts
   */
  public async getTrends(
    queryDto: DashboardTrendsQueryDto,
  ): Promise<DashboardTrendsResponse> {
    const period = queryDto.period || TrendPeriod.LAST_30_DAYS;
    const days = parseInt(period, 10);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get sales trend
    const salesTrend = await this.getSalesTrend(startDate, endDate);
    const revenueTrend = await this.getRevenueTrend(startDate, endDate);
    const productionVsSales = await this.getProductionVsSalesTrend(
      startDate,
      endDate,
    );

    // Calculate trend direction
    const salesTrendDirection = this.calculateTrendDirection(salesTrend);
    const revenueTrendDirection = this.calculateTrendDirection(revenueTrend);

    return {
      period: `${days}`,
      sales: {
        label: "Sales Count",
        data: salesTrend,
        total: salesTrend.reduce((sum, d) => sum + d.value, 0),
        trend: salesTrendDirection.direction,
        changePercentage: salesTrendDirection.changePercentage,
      },
      revenue: {
        label: "Revenue",
        data: revenueTrend,
        total: revenueTrend.reduce((sum, d) => sum + d.value, 0),
        trend: revenueTrendDirection.direction,
        changePercentage: revenueTrendDirection.changePercentage,
      },
      productionVsSales,
    };
  }

  /**
   * Get top and bottom performers
   */
  public async getHighlights(
    queryDto: DashboardHighlightsQueryDto,
  ): Promise<DashboardHighlightsResponse> {
    const limit = queryDto.limit || 5;

    // Calculate for last 30 days for current period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Previous 30 days for comparison
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - 30);

    const productPerformance = await this.getProductPerformance(
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
    );

    // Sort and categorize
    const sorted = productPerformance.sort((a, b) => b.metric - a.metric);

    const topSellers = sorted.slice(0, limit);
    const bottomPerformers = sorted.slice(-limit).reverse();

    const withGrowth = productPerformance.filter(p => p.changePercentage);
    const fastestGrowing = withGrowth
      .sort((a, b) => (b.changePercentage || 0) - (a.changePercentage || 0))
      .slice(0, limit);

    const declining = withGrowth
      .filter(p => (p.changePercentage || 0) < 0)
      .sort((a, b) => (a.changePercentage || 0) - (b.changePercentage || 0))
      .slice(0, limit);

    return {
      topSellers,
      bottomPerformers,
      fastestGrowing,
      declining,
    };
  }

  /**
   * Get inventory alerts
   */
  public async getAlerts(
    queryDto: DashboardAlertsQueryDto,
  ): Promise<DashboardAlertsResponse> {
    const lowStockThreshold = queryDto.lowStockThreshold || 100;
    const expiryWarningDays = queryDto.expiryWarningDays || 30;

    const alerts: InventoryAlert[] = [];

    // Low stock alerts
    const products = await this.productRepository.find({
      where: { deletedAt: IsNull() },
      relations: ["batches"],
    });

    for (const product of products) {
      const activeBatches = product.batches.filter(
        b => b.isActive && !b.deletedAt,
      );
      const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

      if (totalStock > 0 && totalStock < lowStockThreshold) {
        alerts.push({
          type: "low_stock",
          severity: totalStock < lowStockThreshold / 2 ? "critical" : "warning",
          productId: product.id,
          productName: product.name,
          message: `Low stock: ${totalStock} units remaining`,
          value: totalStock,
          threshold: lowStockThreshold,
        });
      }
    }

    // Expiring batches
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(now.getDate() + expiryWarningDays);

    const expiringBatches = await this.batchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.deletedAt IS NULL")
      .andWhere("batch.isActive = :isActive", { isActive: true })
      .andWhere("batch.expiryDate IS NOT NULL")
      .andWhere("batch.expiryDate <= :warningDate", { warningDate })
      .andWhere("batch.quantity > 0")
      .getMany();

    for (const batch of expiringBatches) {
      const daysUntilExpiry = Math.ceil(
        (new Date(batch.expiryDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const isExpired = daysUntilExpiry < 0;

      alerts.push({
        type: isExpired ? "expired" : "expiring_soon",
        severity: isExpired
          ? "critical"
          : daysUntilExpiry <= 7
            ? "critical"
            : "warning",
        productId: batch.product.id,
        productName: batch.product.name,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        message: isExpired
          ? `Batch expired ${Math.abs(daysUntilExpiry)} days ago`
          : `Batch expiring in ${daysUntilExpiry} days`,
        value: batch.quantity,
        daysUntilExpiry,
      });
    }

    // Sort by severity and days until expiry
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      if (a.daysUntilExpiry !== undefined && b.daysUntilExpiry !== undefined) {
        return a.daysUntilExpiry - b.daysUntilExpiry;
      }

      return 0;
    });

    const critical = alerts.filter(a => a.severity === "critical").length;
    const warnings = alerts.filter(a => a.severity === "warning").length;

    return {
      total: alerts.length,
      critical,
      warnings,
      alerts,
    };
  }

  /**
   * Get recent activity
   */
  public async getActivity(
    queryDto: DashboardActivityQueryDto,
  ): Promise<DashboardActivityResponse> {
    const limit = queryDto.limit || 10;

    // Recent sales
    const recentSalesData = await this.saleRepository
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .where("sale.deletedAt IS NULL")
      .orderBy("sale.createdAt", "DESC")
      .take(limit)
      .getMany();

    const recentSales: RecentSale[] = recentSalesData.map(sale => ({
      saleId: sale.id,
      customerName: sale.customer.name,
      totalAmount: sale.lineItems.reduce(
        (sum, item) => sum + item.finalPrice * item.requestedQuantity,
        0,
      ),
      itemCount: sale.lineItems.length,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
    }));

    // Recent batches
    const recentBatchesData = await this.batchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.deletedAt IS NULL")
      .orderBy("batch.createdAt", "DESC")
      .take(limit)
      .getMany();

    const recentBatches: RecentBatch[] = recentBatchesData.map(batch => ({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.product.name,
      quantity: batch.quantity,
      productionDate: batch.productionDate.toISOString(),
    }));

    // Recent inventory changes (combined from batches and sales)
    const recentChanges: RecentInventoryChange[] = [];

    // Add batch creations as production
    recentBatchesData.slice(0, 5).forEach(batch => {
      recentChanges.push({
        type: "production",
        productName: batch.product.name,
        quantityChange: batch.quantity,
        timestamp: batch.createdAt.toISOString(),
      });
    });

    // Add sales
    recentSalesData.slice(0, 5).forEach(sale => {
      const totalQuantity = sale.lineItems.reduce(
        (sum, item) => sum + item.requestedQuantity,
        0,
      );
      recentChanges.push({
        type: "sale",
        productName: `${sale.lineItems.length} products`,
        quantityChange: -totalQuantity,
        timestamp: sale.createdAt.toISOString(),
      });
    });

    // Sort by timestamp
    recentChanges.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      recentSales,
      recentBatches,
      recentChanges: recentChanges.slice(0, limit),
    };
  }

  // ============ HELPER METHODS ============

  /**
   * Calculate KPIs for a given period
   */
  private async calculateKPIs(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardKPIs> {
    // Sales and revenue for period
    const periodSales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    const periodRevenue = periodSales.reduce(
      (sum, sale) =>
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.finalPrice * item.requestedQuantity,
          0,
        ),
      0,
    );

    // All-time sales and revenue
    const allSales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .getMany();

    const totalRevenue = allSales.reduce(
      (sum, sale) =>
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.finalPrice * item.requestedQuantity,
          0,
        ),
      0,
    );

    // Products
    const allProducts = await this.productRepository.find({
      where: { deletedAt: IsNull() },
    });

    const activeProducts = allProducts.filter(
      p => p.status === ProductStatus.ACTIVE,
    ).length;

    const inactiveProducts = allProducts.length - activeProducts;

    // Batches
    const allBatches = await this.batchRepository.find({
      where: { deletedAt: IsNull() },
    });

    const activeBatches = allBatches.filter(b => b.isActive).length;

    // Inventory
    const productsWithBatches = await this.productRepository.find({
      where: { deletedAt: IsNull() },
      relations: ["batches"],
    });

    let totalInventoryValue = 0;
    let totalInventoryQuantity = 0;
    let lowStockItems = 0;

    for (const product of productsWithBatches) {
      const activeBatchStock = product.batches
        .filter(b => b.isActive && !b.deletedAt)
        .reduce((sum, b) => sum + b.quantity, 0);

      totalInventoryQuantity += activeBatchStock;
      totalInventoryValue += activeBatchStock * Number(product.wholesale);

      if (activeBatchStock > 0 && activeBatchStock < 100) {
        lowStockItems++;
      }
    }

    // Production vs sales
    const totalProduced = allBatches.reduce((sum, b) => sum + b.quantity, 0);
    const totalSold = allSales.reduce(
      (sum, sale) =>
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.requestedQuantity,
          0,
        ),
      0,
    );

    const utilizationRate =
      totalProduced > 0 ? (totalSold / totalProduced) * 100 : 0;

    return {
      revenue: {
        total: totalRevenue,
        period: periodRevenue,
      },
      sales: {
        total: allSales.length,
        period: periodSales.length,
      },
      products: {
        total: allProducts.length,
        active: activeProducts,
        inactive: inactiveProducts,
      },
      batches: {
        total: allBatches.length,
        active: activeBatches,
      },
      inventory: {
        totalValue: totalInventoryValue,
        totalQuantity: totalInventoryQuantity,
        lowStockItems,
      },
      production: {
        totalProduced,
        totalSold,
        utilizationRate,
      },
    };
  }

  /**
   * Get sales trend data
   */
  private async getSalesTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    return this.aggregateByDay(sales, startDate, endDate, () => 1);
  }

  /**
   * Get revenue trend data
   */
  private async getRevenueTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    return this.aggregateByDay(sales, startDate, endDate, sale =>
      sale.lineItems.reduce(
        (sum, item) => sum + item.finalPrice * item.requestedQuantity,
        0,
      ),
    );
  }

  /**
   * Get production vs sales trend
   */
  private async getProductionVsSalesTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<{ produced: TrendDataPoint[]; sold: TrendDataPoint[] }> {
    // Production
    const batches = await this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.deletedAt IS NULL")
      .andWhere("batch.productionDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    const produced = this.aggregateByDay(
      batches,
      startDate,
      endDate,
      batch => batch.quantity,
      "productionDate",
    );

    // Sales
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    const sold = this.aggregateByDay(sales, startDate, endDate, sale =>
      sale.lineItems.reduce((sum, item) => sum + item.requestedQuantity, 0),
    );

    return { produced, sold };
  }

  /**
   * Get product performance with comparison
   */
  private async getProductPerformance(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<ProductHighlight[]> {
    // Current period sales
    const currentSales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    // Previous period sales
    const previousSales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.status IN (:...statuses)", {
        statuses: [SaleStatus.DELIVERED, SaleStatus.PAID],
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate: prevStartDate,
        endDate: prevEndDate,
      })
      .getMany();

    // Aggregate by product
    const productMap = new Map<
      string,
      {
        name: string;
        category: string;
        current: number;
        previous: number;
      }
    >();

    for (const sale of currentSales) {
      for (const item of sale.lineItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });

        if (!product) continue;

        const existing = productMap.get(item.productId);
        const revenue = item.finalPrice * item.requestedQuantity;

        if (existing) {
          existing.current += revenue;
        } else {
          productMap.set(item.productId, {
            name: product.name,
            category: product.category,
            current: revenue,
            previous: 0,
          });
        }
      }
    }

    for (const sale of previousSales) {
      for (const item of sale.lineItems) {
        const existing = productMap.get(item.productId);
        const revenue = item.finalPrice * item.requestedQuantity;

        if (existing) {
          existing.previous += revenue;
        }
      }
    }

    // Convert to ProductHighlight
    const highlights: ProductHighlight[] = [];

    for (const [productId, data] of productMap.entries()) {
      const change = data.current - data.previous;
      const changePercentage =
        data.previous > 0 ? (change / data.previous) * 100 : 0;

      highlights.push({
        productId,
        productName: data.name,
        category: data.category,
        metric: data.current,
        change,
        changePercentage,
      });
    }

    return highlights;
  }

  /**
   * Aggregate data by day
   */
  private aggregateByDay<T>(
    items: T[],
    startDate: Date,
    endDate: Date,
    getValue: (item: T) => number,
    dateField: keyof T = "createdAt" as keyof T,
  ): TrendDataPoint[] {
    const dateMap = new Map<string, number>();

    // Initialize all days with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate values
    for (const item of items) {
      const date = new Date(item[dateField] as unknown as string);
      const dateKey = date.toISOString().split("T")[0];

      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, dateMap.get(dateKey)! + getValue(item));
      }
    }

    // Convert to array
    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(data: TrendDataPoint[]): {
    direction: "up" | "down" | "stable";
    changePercentage: number;
  } {
    if (data.length < 2) {
      return { direction: "stable", changePercentage: 0 };
    }

    const halfPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, halfPoint);
    const secondHalf = data.slice(halfPoint);

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercentage = firstAvg > 0 ? (change / firstAvg) * 100 : 0;

    let direction: "up" | "down" | "stable" = "stable";
    if (Math.abs(changePercentage) > 5) {
      direction = changePercentage > 0 ? "up" : "down";
    }

    return { direction, changePercentage };
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
