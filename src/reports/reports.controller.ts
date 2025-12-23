import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
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
  DashboardSummaryResponse,
} from "../interfaces/reports.interface";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/sales
   * Comprehensive sales report with metrics, trends, and time series
   * Use cases: Dashboard KPIs, sales performance tracking, trend analysis
   */
  @Get("sales")
  @ApiOperation({
    summary: "Get comprehensive sales report",
    description:
      "Returns total revenue, sales count, average order value, and optional time series data. " +
      "Supports filtering by date range, product, and category. Perfect for dashboard KPIs and charts.",
  })
  @ApiResponse({
    status: 200,
    description: "Sales report generated successfully",
  })
  public async getSalesReport(
    @Query() queryDto: SalesReportQueryDto,
  ): Promise<SalesReportResponse> {
    return await this.reportsService.getSalesReport(queryDto);
  }

  /**
   * GET /reports/sales/by-product
   * Sales breakdown by individual products
   * Use cases: Product performance tables, identifying best performers
   */
  @Get("sales/by-product")
  @ApiOperation({
    summary: "Get sales breakdown by product",
    description:
      "Returns sales metrics for each product including quantity sold, revenue, and number of sales. " +
      "Useful for product performance tables and identifying top/bottom performers.",
  })
  @ApiResponse({
    status: 200,
    description: "Product sales report generated successfully",
  })
  public async getSalesByProduct(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<ProductPerformanceResponse> {
    return await this.reportsService.getSalesByProduct(queryDto);
  }

  /**
   * GET /reports/sales/by-category
   * Sales breakdown by product categories
   * Use cases: Category performance pie charts, revenue distribution
   */
  @Get("sales/by-category")
  @ApiOperation({
    summary: "Get sales breakdown by category",
    description:
      "Returns sales metrics aggregated by product category with percentage of total revenue. " +
      "Perfect for pie charts and understanding category performance.",
  })
  @ApiResponse({
    status: 200,
    description: "Category sales report generated successfully",
  })
  public async getSalesByCategory(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<CategoryReportResponse> {
    return await this.reportsService.getSalesByCategory(queryDto);
  }

  /**
   * GET /reports/products/top
   * Top selling products
   * Use cases: Best sellers list, featured products, performance rankings
   */
  @Get("products/top")
  @ApiOperation({
    summary: "Get top selling products",
    description:
      "Returns ranked list of best-selling products by revenue or quantity. " +
      "Configurable limit and sort order. Great for leaderboards and highlights.",
  })
  @ApiResponse({
    status: 200,
    description: "Top products report generated successfully",
  })
  public async getTopProducts(
    @Query() queryDto: TopProductsQueryDto,
  ): Promise<TopProductsResponse> {
    return await this.reportsService.getTopProducts(queryDto);
  }

  /**
   * GET /reports/products/revenue-distribution
   * Revenue contribution by product
   * Use cases: Revenue breakdown charts, identifying revenue drivers
   */
  @Get("products/revenue-distribution")
  @ApiOperation({
    summary: "Get revenue distribution by product",
    description:
      "Shows percentage contribution of each product to total revenue. " +
      "Ideal for understanding which products drive the most revenue.",
  })
  @ApiResponse({
    status: 200,
    description: "Revenue distribution report generated successfully",
  })
  public async getRevenueDistribution(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<RevenueDistributionResponse> {
    return await this.reportsService.getRevenueDistribution(queryDto);
  }

  /**
   * GET /reports/batches
   * Batch production and utilization report
   * Use cases: Production efficiency tracking, batch yield analysis
   */
  @Get("batches")
  @ApiOperation({
    summary: "Get batch production report",
    description:
      "Returns batch production volumes, sold quantities, and utilization rates. " +
      "Helps track production efficiency and batch performance.",
  })
  @ApiResponse({
    status: 200,
    description: "Batch report generated successfully",
  })
  public async getBatchReport(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<BatchReportResponse> {
    return await this.reportsService.getBatchReport(queryDto);
  }

  /**
   * GET /reports/batches/aging
   * Batch shelf-life and aging report
   * Use cases: Expiry tracking, inventory prioritization, waste prevention
   */
  @Get("batches/aging")
  @ApiOperation({
    summary: "Get batch aging and expiry report",
    description:
      "Tracks batch age, days until expiry, and categorizes batches by urgency. " +
      "Critical for managing perishable inventory and preventing waste.",
  })
  @ApiResponse({
    status: 200,
    description: "Batch aging report generated successfully",
  })
  public async getBatchAgingReport(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<BatchAgingResponse> {
    return await this.reportsService.getBatchAgingReport(queryDto);
  }

  /**
   * GET /reports/inventory
   * Current inventory levels and valuation
   * Use cases: Stock level monitoring, inventory value tracking, low stock alerts
   */
  @Get("inventory")
  @ApiOperation({
    summary: "Get inventory report",
    description:
      "Shows current stock levels, inventory value, and identifies low-stock items. " +
      "Essential for inventory management and reorder planning.",
  })
  @ApiResponse({
    status: 200,
    description: "Inventory report generated successfully",
  })
  public async getInventoryReport(
    @Query() queryDto: InventoryReportQueryDto,
  ): Promise<InventoryReportResponse> {
    return await this.reportsService.getInventoryReport(queryDto);
  }

  /**
   * GET /reports/stock-movement
   * Stock movement over time (production vs sales)
   * Use cases: Inventory flow visualization, stock trend analysis
   */
  @Get("stock-movement")
  @ApiOperation({
    summary: "Get stock movement report",
    description:
      "Tracks stock changes over time showing production, sales, and net movement. " +
      "Perfect for line charts showing inventory flow and trends.",
  })
  @ApiResponse({
    status: 200,
    description: "Stock movement report generated successfully",
  })
  public async getStockMovementReport(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<StockMovementResponse> {
    return await this.reportsService.getStockMovementReport(queryDto);
  }

  /**
   * GET /reports/comparative
   * Period-over-period comparison
   * Use cases: Growth tracking, performance comparison, trend identification
   */
  @Get("comparative")
  @ApiOperation({
    summary: "Get period-over-period comparison",
    description:
      "Compares two time periods showing growth metrics and percentage changes. " +
      "Useful for month-over-month, year-over-year comparisons.",
  })
  @ApiResponse({
    status: 200,
    description: "Comparative report generated successfully",
  })
  public async getComparativeReport(
    @Query() queryDto: ComparativeReportQueryDto,
  ): Promise<ComparativeMetrics> {
    return await this.reportsService.getComparativeReport(queryDto);
  }

  /**
   * GET /reports/dashboard-summary
   * All-in-one dashboard summary
   * Use cases: Main dashboard page, executive summary
   */
  @Get("dashboard-summary")
  @ApiOperation({
    summary: "Get dashboard summary with key metrics",
    description:
      "Returns a comprehensive summary of key business metrics for dashboard display. " +
      "Includes sales, inventory, and production KPIs in a single response.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard summary generated successfully",
  })
  public async getDashboardSummary(
    @Query() queryDto: BaseReportQueryDto,
  ): Promise<DashboardSummaryResponse> {
    // Get all key metrics in parallel for performance
    const [salesReport, inventoryReport, batchReport, topProducts] =
      await Promise.all([
        this.reportsService.getSalesReport({
          ...queryDto,
          includeTrends: true,
        }),
        this.reportsService.getInventoryReport({
          lowStockOnly: false,
          lowStockThreshold: 100,
        }),
        this.reportsService.getBatchReport(queryDto),
        this.reportsService.getTopProducts({ ...queryDto, limit: 5 }),
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
