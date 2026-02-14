import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import {
  BaseReportQueryDto,
  SalesReportQueryDto,
  TopProductsQueryDto,
  ComparativeReportQueryDto,
  TimeAggregation,
  SortOrder,
} from "../dto/reports.dto";
import {
  SalesReportResponse,
  ProductPerformanceResponse,
  CategoryReportResponse,
  TopProductsResponse,
  RevenueDistributionResponse,
  ComparativeMetrics,
  TimeSeriesDataPoint,
  SalesMetrics,
  ProductSalesData,
  CategorySalesData,
  TopProduct,
  RevenueByProductData,
} from "../interfaces/reports.interface";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";

@Injectable()
export class SalesReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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

  // ============ PRIVATE HELPER METHODS ============

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
      const { revenue, quantity } = await this.processSaleForMetrics(
        sale,
        category,
        productId,
      );
      totalRevenue += revenue;
      totalQuantitySold += quantity;
    }

    return {
      totalRevenue,
      totalSales: sales.length,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      totalQuantitySold,
    };
  }

  private async processSaleForMetrics(
    sale: Sale,
    category?: string,
    productId?: string,
  ): Promise<{ revenue: number; quantity: number }> {
    if (
      sale.amount !== null &&
      sale.amount !== undefined &&
      !category &&
      !productId
    ) {
      let quantity = 0;
      for (const item of sale.lineItems) {
        quantity += item.requestedQuantity;
      }
      return { revenue: Number(sale.amount), quantity };
    } else {
      let revenue = 0;
      let quantity = 0;
      for (const item of sale.lineItems) {
        const { revenue: itemRevenue, quantity: itemQuantity } =
          await this.processLineItemForMetrics(item, category, productId);
        revenue += itemRevenue;
        quantity += itemQuantity;
      }
      return { revenue, quantity };
    }
  }

  private async processLineItemForMetrics(
    item: SaleLineItem,
    category?: string,
    productId?: string,
  ): Promise<{ revenue: number; quantity: number }> {
    if (productId && item.productId !== productId) {
      return { revenue: 0, quantity: 0 };
    }

    if (category) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, deletedAt: IsNull() },
      });
      if (product?.category !== category) {
        return { revenue: 0, quantity: 0 };
      }
    }

    const itemRevenue = item.finalPrice * item.requestedQuantity;
    return { revenue: itemRevenue, quantity: item.requestedQuantity };
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
          if (product?.category !== category) continue;
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
   * Get date key for aggregation
   */
  private getDateKey(date: Date, aggregation: TimeAggregation): string {
    const d = new Date(date);

    switch (aggregation) {
      case TimeAggregation.DAILY:
        return d.toISOString().split("T")[0];

      case TimeAggregation.WEEKLY: {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split("T")[0];
      }

      case TimeAggregation.MONTHLY:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      case TimeAggregation.YEARLY:
        return String(d.getFullYear());

      default:
        return d.toISOString().split("T")[0];
    }
  }
}
