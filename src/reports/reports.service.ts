import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import {
  BaseReportQueryDto,
  SalesReportQueryDto,
  TopProductsQueryDto,
  ComparativeReportQueryDto,
  InventoryReportQueryDto,
  TimeAggregation,
  SortOrder,
} from "../dto/reports.dto";
import {
  SalesReportResponse,
  ProductPerformanceResponse,
  CategoryReportResponse,
  BatchReportResponse,
  InventoryReportResponse,
  ComparativeMetrics,
  TopProductsResponse,
  StockMovementResponse,
  RevenueDistributionResponse,
  BatchAgingResponse,
  TimeSeriesDataPoint,
  SalesMetrics,
  ProductSalesData,
  CategorySalesData,
  BatchProductionData,
  InventoryItem,
  TopProduct,
  StockMovementData,
  RevenueByProductData,
  BatchAgingData,
} from "../interfaces/reports.interface";
import { PaymentStatus } from "../enum/payment-status.enum";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Generate comprehensive sales report with metrics and trends
   */
  public async getSalesReport(
    queryDto: SalesReportQueryDto,
  ): Promise<SalesReportResponse> {
    const {
      fromDate,
      toDate,
      category,
      productId,
      aggregation,
      includeTrends,
    } = queryDto;

    // Build base query
    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      });

    // Apply date filters
    if (fromDate && toDate) {
      queryBuilder.andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    }

    const sales = await queryBuilder.getMany();

    // Calculate metrics
    const metrics = await this.calculateSalesMetrics(
      sales,
      category,
      productId,
    );

    // Generate time series if aggregation specified
    let timeSeries: TimeSeriesDataPoint[] | undefined;
    if (aggregation && fromDate && toDate) {
      timeSeries = await this.generateSalesTimeSeries(
        sales,
        aggregation,
        category,
        productId,
      );
    }

    // Calculate trends if requested
    let trends;
    if (includeTrends && fromDate && toDate) {
      trends = await this.calculateSalesTrends(
        fromDate,
        toDate,
        category,
        productId,
      );
    }

    return {
      summary: metrics,
      timeSeries,
      trends,
    };
  }

  /**
   * Get sales by product
   */
  public async getSalesByProduct(
    queryDto: BaseReportQueryDto,
  ): Promise<ProductPerformanceResponse> {
    const { fromDate, toDate, category } = queryDto;

    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      });

    if (fromDate && toDate) {
      queryBuilder.andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    }

    const sales = await queryBuilder.getMany();

    // Aggregate by product
    const productMap = new Map<string, ProductSalesData>();

    for (const sale of sales) {
      for (const item of sale.lineItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });

        if (!product || (category && product.category !== category)) {
          continue;
        }

        const existing = productMap.get(item.productId);
        const revenue = item.finalPrice * item.requestedQuantity;

        if (existing) {
          existing.totalQuantitySold += item.requestedQuantity;
          existing.totalRevenue += revenue;
          existing.numberOfSales += 1;
          existing.averagePrice =
            existing.totalRevenue / existing.totalQuantitySold;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: product.name,
            category: product.category,
            totalQuantitySold: item.requestedQuantity,
            totalRevenue: revenue,
            numberOfSales: 1,
            averagePrice: item.finalPrice,
          });
        }
      }
    }

    const products = Array.from(productMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);

    return {
      summary: {
        totalProducts: products.length,
        totalRevenue,
        averageSalesPerProduct:
          products.length > 0 ? totalRevenue / products.length : 0,
      },
      products,
    };
  }

  /**
   * Get sales by category
   */
  public async getSalesByCategory(
    queryDto: BaseReportQueryDto,
  ): Promise<CategoryReportResponse> {
    const { fromDate, toDate } = queryDto;

    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      });

    if (fromDate && toDate) {
      queryBuilder.andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    }

    const sales = await queryBuilder.getMany();

    // Aggregate by category
    const categoryMap = new Map<string, CategorySalesData>();
    let totalRevenue = 0;

    for (const sale of sales) {
      for (const item of sale.lineItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });

        if (!product) continue;

        const revenue = item.finalPrice * item.requestedQuantity;
        totalRevenue += revenue;

        const existing = categoryMap.get(product.category);

        if (existing) {
          existing.totalRevenue += revenue;
          existing.totalQuantitySold += item.requestedQuantity;
          existing.numberOfSales += 1;
        } else {
          categoryMap.set(product.category, {
            category: product.category,
            totalRevenue: revenue,
            totalQuantitySold: item.requestedQuantity,
            numberOfSales: 1,
            percentageOfTotal: 0,
          });
        }
      }
    }

    // Calculate percentages
    const categories = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      percentageOfTotal:
        totalRevenue > 0 ? (cat.totalRevenue / totalRevenue) * 100 : 0,
    }));

    categories.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      summary: {
        totalCategories: categories.length,
        totalRevenue,
      },
      categories,
    };
  }

  /**
   * Get top selling products
   */
  public async getTopProducts(
    queryDto: TopProductsQueryDto,
  ): Promise<TopProductsResponse> {
    const {
      fromDate,
      toDate,
      category,
      limit = 10,
      sortOrder = SortOrder.DESC,
    } = queryDto;

    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      });

    if (fromDate && toDate) {
      queryBuilder.andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    }

    const sales = await queryBuilder.getMany();

    // Aggregate product sales
    const productMap = new Map<string, TopProduct>();

    for (const sale of sales) {
      for (const item of sale.lineItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });

        if (!product || (category && product.category !== category)) {
          continue;
        }

        const existing = productMap.get(item.productId);
        const revenue = item.finalPrice * item.requestedQuantity;

        if (existing) {
          existing.totalQuantitySold += item.requestedQuantity;
          existing.totalRevenue += revenue;
          existing.numberOfSales += 1;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: product.name,
            category: product.category,
            totalQuantitySold: item.requestedQuantity,
            totalRevenue: revenue,
            numberOfSales: 1,
            rank: 0,
          });
        }
      }
    }

    let topProducts = Array.from(productMap.values());

    // Sort by total revenue or quantity
    topProducts.sort((a, b) => {
      const comparison = b.totalRevenue - a.totalRevenue;
      return sortOrder === SortOrder.DESC ? comparison : -comparison;
    });

    // Limit results and add ranking
    topProducts = topProducts.slice(0, limit).map((product, index) => ({
      ...product,
      rank: index + 1,
    }));

    return {
      period: {
        from: fromDate || "all-time",
        to: toDate || "all-time",
      },
      topProducts,
    };
  }

  /**
   * Get batch production report
   */
  public async getBatchReport(
    queryDto: BaseReportQueryDto,
  ): Promise<BatchReportResponse> {
    const { fromDate, toDate, productId, category } = queryDto;

    const queryBuilder = this.batchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.deletedAt IS NULL");

    if (fromDate && toDate) {
      queryBuilder.andWhere(
        "batch.productionDate BETWEEN :fromDate AND :toDate",
        {
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
        },
      );
    }

    if (productId) {
      queryBuilder.andWhere("batch.product.id = :productId", { productId });
    }

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    const batches = await queryBuilder.getMany();

    // Calculate sold quantities
    const batchData: BatchProductionData[] = [];
    let totalProduction = 0;
    let totalSold = 0;
    let totalRemaining = 0;

    for (const batch of batches) {
      const soldQuantity = await this.calculateBatchSoldQuantity(batch.id);
      const remainingQuantity = batch.quantity - soldQuantity;
      const soldPercentage =
        batch.quantity > 0 ? (soldQuantity / batch.quantity) * 100 : 0;

      const daysUntilExpiry = batch.expiryDate
        ? Math.ceil(
            (new Date(batch.expiryDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      totalProduction += batch.quantity;
      totalSold += soldQuantity;
      totalRemaining += remainingQuantity;

      batchData.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        productId: batch.product.id,
        productName: batch.product.name,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
        initialQuantity: batch.quantity,
        remainingQuantity,
        soldQuantity,
        soldPercentage,
        daysUntilExpiry,
        isActive: batch.isActive,
      });
    }

    const averageUtilization =
      totalProduction > 0 ? (totalSold / totalProduction) * 100 : 0;

    return {
      summary: {
        totalBatches: batches.length,
        totalProduction,
        totalSold,
        totalRemaining,
        averageUtilization,
      },
      batches: batchData,
    };
  }

  /**
   * Get inventory report
   */
  public async getInventoryReport(
    queryDto: InventoryReportQueryDto,
  ): Promise<InventoryReportResponse> {
    const {
      category,
      productId,
      lowStockOnly = false,
      lowStockThreshold = 100,
    } = queryDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.batches", "batch")
      .where("product.deletedAt IS NULL")
      .andWhere("batch.deletedAt IS NULL")
      .andWhere("batch.isActive = :isActive", { isActive: true });

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    if (productId) {
      queryBuilder.andWhere("product.id = :productId", { productId });
    }

    const products = await queryBuilder.getMany();

    const inventoryItems: InventoryItem[] = [];
    let totalStockQuantity = 0;
    let totalInventoryValue = 0;
    let lowStockItems = 0;

    for (const product of products) {
      const activeBatches = product.batches.filter(
        b => b.isActive && !b.deletedAt,
      );

      if (activeBatches.length === 0) continue;

      const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
      const totalValue = totalStock * Number(product.wholesale);
      const isLowStock = totalStock < lowStockThreshold;

      if (lowStockOnly && !isLowStock) continue;

      const batchDates = activeBatches
        .map(b => new Date(b.productionDate))
        .sort((a, b) => a.getTime() - b.getTime());

      totalStockQuantity += totalStock;
      totalInventoryValue += totalValue;
      if (isLowStock) lowStockItems++;

      inventoryItems.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        totalStock,
        totalValue,
        numberOfBatches: activeBatches.length,
        oldestBatchDate: batchDates[0],
        newestBatchDate: batchDates[batchDates.length - 1],
        isLowStock,
      });
    }

    return {
      summary: {
        totalProducts: inventoryItems.length,
        totalStockQuantity,
        totalInventoryValue,
        lowStockItems,
      },
      inventory: inventoryItems,
    };
  }

  /**
   * Get comparative report (period over period)
   */
  public async getComparativeReport(
    queryDto: ComparativeReportQueryDto,
  ): Promise<ComparativeMetrics> {
    const {
      currentFromDate,
      currentToDate,
      previousFromDate,
      previousToDate,
      category,
    } = queryDto;

    // Get current period metrics
    const currentSales = await this.getSalesInPeriod(
      currentFromDate,
      currentToDate,
    );
    const currentMetrics = await this.calculateSalesMetrics(
      currentSales,
      category,
    );

    // Get previous period metrics
    const previousSales = await this.getSalesInPeriod(
      previousFromDate,
      previousToDate,
    );
    const previousMetrics = await this.calculateSalesMetrics(
      previousSales,
      category,
    );

    // Calculate growth
    const revenueGrowth =
      currentMetrics.totalRevenue - previousMetrics.totalRevenue;
    const revenueGrowthPercentage =
      previousMetrics.totalRevenue > 0
        ? (revenueGrowth / previousMetrics.totalRevenue) * 100
        : 0;

    const salesGrowth = currentMetrics.totalSales - previousMetrics.totalSales;
    const salesGrowthPercentage =
      previousMetrics.totalSales > 0
        ? (salesGrowth / previousMetrics.totalSales) * 100
        : 0;

    const averageOrderValueGrowth =
      currentMetrics.averageOrderValue - previousMetrics.averageOrderValue;
    const averageOrderValueGrowthPercentage =
      previousMetrics.averageOrderValue > 0
        ? (averageOrderValueGrowth / previousMetrics.averageOrderValue) * 100
        : 0;

    return {
      current: currentMetrics,
      previous: previousMetrics,
      growth: {
        revenueGrowth,
        revenueGrowthPercentage,
        salesGrowth,
        salesGrowthPercentage,
        averageOrderValueGrowth,
        averageOrderValueGrowthPercentage,
      },
    };
  }

  /**
   * Get stock movement report
   */
  public async getStockMovementReport(
    queryDto: BaseReportQueryDto,
  ): Promise<StockMovementResponse> {
    const {
      fromDate,
      toDate,
      productId,
      aggregation = TimeAggregation.DAILY,
    } = queryDto;

    if (!fromDate || !toDate) {
      throw new NotFoundException(
        "Date range is required for stock movement report",
      );
    }

    // Get all batches created in period
    const batchQuery = this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.deletedAt IS NULL")
      .andWhere("batch.productionDate BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });

    if (productId) {
      batchQuery.andWhere("batch.product.id = :productId", { productId });
    }

    const batches = await batchQuery.getMany();

    // Get all sales in period
    const salesQuery = this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });

    const sales = await salesQuery.getMany();

    // Aggregate movements
    const movements = await this.aggregateStockMovements(
      batches,
      sales,
      aggregation,
      productId,
    );

    const totalProduced = movements.reduce((sum, m) => sum + m.produced, 0);
    const totalSold = movements.reduce((sum, m) => sum + m.sold, 0);
    const netChange = totalProduced - totalSold;
    const currentStock =
      movements.length > 0 ? movements[movements.length - 1].closingStock : 0;

    return {
      summary: {
        totalProduced,
        totalSold,
        netChange,
        currentStock,
      },
      movements,
    };
  }

  /**
   * Get revenue distribution by product
   */
  public async getRevenueDistribution(
    queryDto: BaseReportQueryDto,
  ): Promise<RevenueDistributionResponse> {
    const productPerformance = await this.getSalesByProduct(queryDto);

    const totalRevenue = productPerformance.summary.totalRevenue;

    const distribution: RevenueByProductData[] =
      productPerformance.products.map(product => ({
        productId: product.productId,
        productName: product.productName,
        totalRevenue: product.totalRevenue,
        percentageOfTotal:
          totalRevenue > 0 ? (product.totalRevenue / totalRevenue) * 100 : 0,
      }));

    return {
      summary: {
        totalRevenue,
        numberOfProducts: distribution.length,
      },
      distribution,
    };
  }

  /**
   * Get batch aging report
   */
  public async getBatchAgingReport(
    queryDto: BaseReportQueryDto,
  ): Promise<BatchAgingResponse> {
    const { productId, category } = queryDto;

    const queryBuilder = this.batchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.deletedAt IS NULL")
      .andWhere("batch.isActive = :isActive", { isActive: true });

    if (productId) {
      queryBuilder.andWhere("batch.product.id = :productId", { productId });
    }

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    const batches = await queryBuilder.getMany();

    const batchAgingData: BatchAgingData[] = [];
    let freshBatches = 0;
    let agingBatches = 0;
    let criticalBatches = 0;
    let expiredBatches = 0;

    const now = Date.now();

    for (const batch of batches) {
      const soldQuantity = await this.calculateBatchSoldQuantity(batch.id);
      const remainingQuantity = batch.quantity - soldQuantity;

      if (remainingQuantity <= 0) continue;

      const productionDate = new Date(batch.productionDate);
      const expiryDate = batch.expiryDate ? new Date(batch.expiryDate) : null;

      const ageInDays = Math.floor(
        (now - productionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const daysUntilExpiry = expiryDate
        ? Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24))
        : 999999;

      let status: "fresh" | "aging" | "critical" | "expired";
      if (daysUntilExpiry < 0) {
        status = "expired";
        expiredBatches++;
      } else if (daysUntilExpiry <= 30) {
        status = "critical";
        criticalBatches++;
      } else if (daysUntilExpiry <= 90) {
        status = "aging";
        agingBatches++;
      } else {
        status = "fresh";
        freshBatches++;
      }

      batchAgingData.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        productName: batch.product.name,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
        daysUntilExpiry,
        remainingQuantity,
        ageInDays,
        status,
      });
    }

    // Sort by days until expiry (most urgent first)
    batchAgingData.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return {
      summary: {
        totalBatches: batchAgingData.length,
        freshBatches,
        agingBatches,
        criticalBatches,
        expiredBatches,
      },
      batches: batchAgingData,
    };
  }

  // ============ HELPER METHODS ============

  /**
   * Calculate sales metrics from sales array
   */
  private async calculateSalesMetrics(
    sales: Sale[],
    category?: string,
    productId?: string,
  ): Promise<SalesMetrics> {
    let totalRevenue = 0;
    let totalQuantitySold = 0;

    for (const sale of sales) {
      for (const item of sale.lineItems) {
        // Filter by product if specified
        if (productId && item.productId !== productId) {
          continue;
        }

        // Filter by category if specified
        if (category) {
          const product = await this.productRepository.findOne({
            where: { id: item.productId, deletedAt: IsNull() },
          });
          if (!product || product.category !== category) {
            continue;
          }
        }

        const itemRevenue = item.finalPrice * item.requestedQuantity;
        totalRevenue += itemRevenue;
        totalQuantitySold += item.requestedQuantity;
      }
    }

    return {
      totalRevenue,
      totalSales: sales.length,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      totalQuantitySold,
    };
  }

  /**
   * Generate time series data for sales
   */
  private async generateSalesTimeSeries(
    sales: Sale[],
    aggregation: TimeAggregation,
    category?: string,
    productId?: string,
  ): Promise<TimeSeriesDataPoint[]> {
    const dataMap = new Map<string, number>();

    for (const sale of sales) {
      const dateKey = this.getDateKey(sale.createdAt, aggregation);

      for (const item of sale.lineItems) {
        if (productId && item.productId !== productId) continue;

        if (category) {
          const product = await this.productRepository.findOne({
            where: { id: item.productId, deletedAt: IsNull() },
          });
          if (!product || product.category !== category) continue;
        }

        const revenue = item.finalPrice * item.requestedQuantity;
        dataMap.set(dateKey, (dataMap.get(dateKey) || 0) + revenue);
      }
    }

    return Array.from(dataMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate sales trends
   */
  private async calculateSalesTrends(
    fromDate: string,
    toDate: string,
    category?: string,
    productId?: string,
  ): Promise<{
    revenueGrowth: number;
    salesGrowth: number;
    averageOrderValueGrowth: number;
  }> {
    const periodLength =
      new Date(toDate).getTime() - new Date(fromDate).getTime();

    const previousFromDate = new Date(
      new Date(fromDate).getTime() - periodLength,
    ).toISOString();
    const previousToDate = fromDate;

    const currentSales = await this.getSalesInPeriod(fromDate, toDate);
    const previousSales = await this.getSalesInPeriod(
      previousFromDate,
      previousToDate,
    );

    const currentMetrics = await this.calculateSalesMetrics(
      currentSales,
      category,
      productId,
    );
    const previousMetrics = await this.calculateSalesMetrics(
      previousSales,
      category,
      productId,
    );

    return {
      revenueGrowth:
        previousMetrics.totalRevenue > 0
          ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
              previousMetrics.totalRevenue) *
            100
          : 0,
      salesGrowth:
        previousMetrics.totalSales > 0
          ? ((currentMetrics.totalSales - previousMetrics.totalSales) /
              previousMetrics.totalSales) *
            100
          : 0,
      averageOrderValueGrowth:
        previousMetrics.averageOrderValue > 0
          ? ((currentMetrics.averageOrderValue -
              previousMetrics.averageOrderValue) /
              previousMetrics.averageOrderValue) *
            100
          : 0,
    };
  }

  /**
   * Get sales in a specific period
   */
  private async getSalesInPeriod(
    fromDate: string,
    toDate: string,
  ): Promise<Sale[]> {
    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });

    return await queryBuilder.getMany();
  }

  /**
   * Calculate total sold quantity for a batch
   */
  private async calculateBatchSoldQuantity(batchId: string): Promise<number> {
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .getMany();

    let totalSold = 0;

    for (const sale of sales) {
      for (const item of sale.lineItems) {
        for (const allocation of item.batchAllocations) {
          if (allocation.batchId === batchId) {
            totalSold += allocation.quantity;
          }
        }
      }
    }

    return totalSold;
  }

  /**
   * Get date key for aggregation
   */
  private getDateKey(date: Date, aggregation: TimeAggregation): string {
    const d = new Date(date);

    switch (aggregation) {
      case TimeAggregation.DAILY:
        return d.toISOString().split("T")[0];

      case TimeAggregation.WEEKLY:
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split("T")[0];

      case TimeAggregation.MONTHLY:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      case TimeAggregation.YEARLY:
        return String(d.getFullYear());

      default:
        return d.toISOString().split("T")[0];
    }
  }

  /**
   * Aggregate stock movements by time period
   */
  private async aggregateStockMovements(
    batches: Batch[],
    sales: Sale[],
    aggregation: TimeAggregation,
    productId?: string,
  ): Promise<StockMovementData[]> {
    const movementMap = new Map<string, { produced: number; sold: number }>();

    // Aggregate production
    for (const batch of batches) {
      if (productId && batch.product.id !== productId) continue;

      const dateKey = this.getDateKey(
        new Date(batch.productionDate),
        aggregation,
      );
      const existing = movementMap.get(dateKey) || { produced: 0, sold: 0 };
      existing.produced += batch.quantity;
      movementMap.set(dateKey, existing);
    }

    // Aggregate sales
    for (const sale of sales) {
      const dateKey = this.getDateKey(sale.createdAt, aggregation);

      for (const item of sale.lineItems) {
        if (productId && item.productId !== productId) continue;

        const existing = movementMap.get(dateKey) || { produced: 0, sold: 0 };
        existing.sold += item.requestedQuantity;
        movementMap.set(dateKey, existing);
      }
    }

    // Convert to array and calculate running totals
    const movements = Array.from(movementMap.entries())
      .map(([date, { produced, sold }]) => ({
        date,
        produced,
        sold,
        netChange: produced - sold,
        closingStock: 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running stock
    let runningStock = 0;
    for (const movement of movements) {
      runningStock += movement.netChange;
      movement.closingStock = runningStock;
    }

    return movements;
  }
}
