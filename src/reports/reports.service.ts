import { Injectable } from "@nestjs/common";
import { SalesReportsService } from "./sales-reports.service";
import { InventoryReportsService } from "./inventory-reports.service";
import { DeliveryReportsService } from "./delivery-reports.service";
import {
  BaseReportQueryDto,
  SalesReportQueryDto,
  TopProductsQueryDto,
  ComparativeReportQueryDto,
  InventoryReportQueryDto,
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
  DeliveryReportResponse,
  DashboardSummaryResponse,
} from "../interfaces/reports.interface";

@Injectable()
export class ReportsService {
  constructor(
    private readonly salesReportsService: SalesReportsService,
    private readonly inventoryReportsService: InventoryReportsService,
    private readonly deliveryReportsService: DeliveryReportsService,
  ) {}

  /**
   * Generate comprehensive sales report with metrics and trends
   */
  public async getSalesReport(
    queryDto: SalesReportQueryDto,
  ): Promise<SalesReportResponse> {
    return await this.salesReportsService.getSalesReport(queryDto);
  }

  /**
   * Get sales by product
   */
  public async getSalesByProduct(
    queryDto: BaseReportQueryDto,
  ): Promise<ProductPerformanceResponse> {
    return await this.salesReportsService.getSalesByProduct(queryDto);
  }

  /**
   * Get sales by category
   */
  public async getSalesByCategory(
    queryDto: BaseReportQueryDto,
  ): Promise<CategoryReportResponse> {
    return await this.salesReportsService.getSalesByCategory(queryDto);
  }

  /**
   * Get top selling products
   */
  public async getTopProducts(
    queryDto: TopProductsQueryDto,
  ): Promise<TopProductsResponse> {
    return await this.salesReportsService.getTopProducts(queryDto);
  }

  /**
   * Get revenue distribution by product
   */
  public async getRevenueDistribution(
    queryDto: BaseReportQueryDto,
  ): Promise<RevenueDistributionResponse> {
    return await this.salesReportsService.getRevenueDistribution(queryDto);
  }

  /**
   * Get comparative report (period over period)
   */
  public async getComparativeReport(
    queryDto: ComparativeReportQueryDto,
  ): Promise<ComparativeMetrics> {
    return await this.salesReportsService.getComparativeReport(queryDto);
  }

  /**
   * Get batch production report
   */
  public async getBatchReport(
    queryDto: BaseReportQueryDto,
  ): Promise<BatchReportResponse> {
    return await this.inventoryReportsService.getBatchReport(queryDto);
  }

  /**
   * Get inventory report
   */
  public async getInventoryReport(
    queryDto: InventoryReportQueryDto,
  ): Promise<InventoryReportResponse> {
    return await this.inventoryReportsService.getInventoryReport(queryDto);
  }

  /**
   * Get stock movement report
   */
  public async getStockMovementReport(
    queryDto: BaseReportQueryDto,
  ): Promise<StockMovementResponse> {
    return await this.inventoryReportsService.getStockMovementReport(queryDto);
  }

  /**
   * Get batch aging report
   */
  public async getBatchAgingReport(
    queryDto: BaseReportQueryDto,
  ): Promise<BatchAgingResponse> {
    return await this.inventoryReportsService.getBatchAgingReport(queryDto);
  }

  /**
   * Get delivery report
   */
  public async getDeliveryReport(
    queryDto: BaseReportQueryDto,
  ): Promise<DeliveryReportResponse> {
    return await this.deliveryReportsService.getDeliveryReport(queryDto);
  }

  /**
   * Get dashboard summary with key metrics
   */
  public async getDashboardSummary(
    queryDto: BaseReportQueryDto,
  ): Promise<DashboardSummaryResponse> {
    // Get all key metrics in parallel for performance
    const [salesReport, inventoryReport, batchReport, topProducts] =
      await Promise.all([
        this.salesReportsService.getSalesReport({
          ...queryDto,
          includeTrends: true,
        }),
        this.inventoryReportsService.getInventoryReport({
          lowStockOnly: false,
          lowStockThreshold: 100,
        }),
        this.inventoryReportsService.getBatchReport(queryDto),
        this.salesReportsService.getTopProducts({ ...queryDto, limit: 5 }),
      ]);

    return {
      sales: salesReport.summary,
      salesTrends: salesReport.trends,
      inventory: inventoryReport.summary,
      production: batchReport.summary,
      topProducts: topProducts.topProducts,
      timestamp: new Date().toISOString(),
    };
  }
}
