import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { SalesReportsService } from "./sales-reports.service";
import { InventoryReportsService } from "./inventory-reports.service";
import { DeliveryReportsService } from "./delivery-reports.service";
import { DailyReportService } from "./daily-report.service";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { DailyReportLog } from "../entities/DailyReportLog.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product, Batch, DailyReportLog])],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    SalesReportsService,
    InventoryReportsService,
    DeliveryReportsService,
    DailyReportService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
