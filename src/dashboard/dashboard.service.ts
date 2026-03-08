import { Injectable } from "@nestjs/common";
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
} from "../interfaces/dashboard.interface";
import { DashboardKPIService } from "./dashboard-kpi.service";
import { DashboardTrendsService } from "./dashboard-trends.service";
import { DashboardHighlightsService } from "./dashboard-highlights.service";
import { DashboardAlertsService } from "./dashboard-alerts.service";
import { DashboardActivityService } from "./dashboard-activity.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly kpiService: DashboardKPIService,
    private readonly trendsService: DashboardTrendsService,
    private readonly highlightsService: DashboardHighlightsService,
    private readonly alertsService: DashboardAlertsService,
    private readonly activityService: DashboardActivityService,
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
    const kpis = await this.kpiService.calculateKPIs(periodStart, periodEnd);

    // Calculate comparison if requested
    if (includeComparison) {
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      const comparisonEnd = new Date(periodStart.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - periodLength);

      const previousKPIs = await this.kpiService.calculateKPIs(
        comparisonStart,
        comparisonEnd,
      );

      // Add growth percentages
      kpis.revenue.previousPeriod = previousKPIs.revenue.period;
      kpis.revenue.growthPercentage = this.kpiService.calculateGrowth(
        kpis.revenue.period,
        previousKPIs.revenue.period,
      );

      kpis.sales.previousPeriod = previousKPIs.sales.period;
      kpis.sales.growthPercentage = this.kpiService.calculateGrowth(
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
    const days = Number.parseInt(period, 10);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get sales trend
    const salesTrend = await this.trendsService.getSalesTrend(
      startDate,
      endDate,
    );
    const revenueTrend = await this.trendsService.getRevenueTrend(
      startDate,
      endDate,
    );
    const productionVsSales =
      await this.trendsService.getProductionVsSalesTrend(startDate, endDate);

    // Calculate trend direction
    const salesTrendDirection =
      this.trendsService.calculateTrendDirection(salesTrend);
    const revenueTrendDirection =
      this.trendsService.calculateTrendDirection(revenueTrend);

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

    const productPerformance =
      await this.highlightsService.getProductPerformance(
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
    return this.alertsService.getAlerts(
      queryDto.lowStockThreshold || 100,
      queryDto.expiryWarningDays || 30,
    );
  }

  /**
   * Get recent activity
   */
  public async getActivity(
    queryDto: DashboardActivityQueryDto,
  ): Promise<DashboardActivityResponse> {
    return this.activityService.getActivity(queryDto.limit || 10);
  }
}
