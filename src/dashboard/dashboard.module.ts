import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { DashboardKPIService } from "./dashboard-kpi.service";
import { DashboardTrendsService } from "./dashboard-trends.service";
import { DashboardHighlightsService } from "./dashboard-highlights.service";
import { DashboardAlertsService } from "./dashboard-alerts.service";
import { DashboardActivityService } from "./dashboard-activity.service";

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product, Batch])],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardKPIService,
    DashboardTrendsService,
    DashboardHighlightsService,
    DashboardAlertsService,
    DashboardActivityService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
