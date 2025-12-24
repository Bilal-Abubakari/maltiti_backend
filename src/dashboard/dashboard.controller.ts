import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import {
  DashboardSummaryQueryDto,
  DashboardTrendsQueryDto,
  DashboardHighlightsQueryDto,
  DashboardAlertsQueryDto,
  DashboardActivityQueryDto,
} from "../dto/dashboard.dto";
import {
  DashboardSummaryResponse,
  DashboardTrendsResponse,
  DashboardHighlightsResponse,
  DashboardAlertsResponse,
  DashboardActivityResponse,
} from "../interfaces/dashboard.interface";

@ApiTags("Dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/summary
   * High-level KPIs for dashboard overview
   * Fast-loading, pre-aggregated business health metrics
   */
  @Get("summary")
  @ApiOperation({
    summary: "Get dashboard summary with KPIs",
    description:
      "Returns high-level KPIs including revenue, sales, products, batches, and inventory metrics. " +
      "Optimized for fast dashboard loading. Supports optional date range and period comparison.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard summary retrieved successfully",
  })
  public async getSummary(
    @Query() queryDto: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    return await this.dashboardService.getSummary(queryDto);
  }

  /**
   * GET /dashboard/trends
   * Lightweight trend data for preview charts
   * Returns small datasets for line and bar charts
   */
  @Get("trends")
  @ApiOperation({
    summary: "Get dashboard trend data",
    description:
      "Returns sales and revenue trends for the last 7, 30, or 90 days. " +
      "Includes production vs sales comparison. Optimized for chart rendering.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard trends retrieved successfully",
  })
  public async getTrends(
    @Query() queryDto: DashboardTrendsQueryDto,
  ): Promise<DashboardTrendsResponse> {
    return await this.dashboardService.getTrends(queryDto);
  }

  /**
   * GET /dashboard/highlights
   * Top and bottom performers with growth indicators
   * Quick insights into product performance
   */
  @Get("highlights")
  @ApiOperation({
    summary: "Get top and bottom performers",
    description:
      "Returns top sellers, bottom performers, fastest growing, and declining products. " +
      "Provides quick performance insights for dashboard highlights.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard highlights retrieved successfully",
  })
  public async getHighlights(
    @Query() queryDto: DashboardHighlightsQueryDto,
  ): Promise<DashboardHighlightsResponse> {
    return await this.dashboardService.getHighlights(queryDto);
  }

  /**
   * GET /dashboard/alerts
   * Inventory alerts and critical notifications
   * Low stock, expiring batches, and operational warnings
   */
  @Get("alerts")
  @ApiOperation({
    summary: "Get inventory alerts",
    description:
      "Returns low stock alerts, expiring batches, and other critical inventory notifications. " +
      "Sorted by severity and urgency for immediate action.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard alerts retrieved successfully",
  })
  public async getAlerts(
    @Query() queryDto: DashboardAlertsQueryDto,
  ): Promise<DashboardAlertsResponse> {
    return await this.dashboardService.getAlerts(queryDto);
  }

  /**
   * GET /dashboard/activity
   * Recent system activity
   * Latest sales, batches, and inventory changes
   */
  @Get("activity")
  @ApiOperation({
    summary: "Get recent activity",
    description:
      "Returns recent sales, newly created batches, and latest inventory changes. " +
      "Provides a quick overview of recent system activity.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard activity retrieved successfully",
  })
  public async getActivity(
    @Query() queryDto: DashboardActivityQueryDto,
  ): Promise<DashboardActivityResponse> {
    return await this.dashboardService.getActivity(queryDto);
  }
}
