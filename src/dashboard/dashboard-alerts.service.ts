import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import {
  DashboardAlertsResponse,
  InventoryAlert,
} from "../interfaces/dashboard.interface";

@Injectable()
export class DashboardAlertsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Get inventory alerts
   */
  public async getAlerts(
    lowStockThreshold: number,
    expiryWarningDays: number,
  ): Promise<DashboardAlertsResponse> {
    const products = await this.productRepository.find({
      where: { deletedAt: IsNull() },
      relations: ["batches"],
    });

    const lowStockAlerts = await this.getLowStockAlerts(
      products,
      lowStockThreshold,
    );
    const expiringAlerts = await this.getExpiringBatchAlerts(expiryWarningDays);

    const alerts = [...lowStockAlerts, ...expiringAlerts];

    this.sortAlerts(alerts);

    const { critical, warnings } = this.getSeverityCounts(alerts);

    return {
      total: alerts.length,
      critical,
      warnings,
      alerts,
    };
  }

  private async getLowStockAlerts(
    products: Product[],
    lowStockThreshold: number,
  ): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];

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

    return alerts;
  }

  private async getExpiringBatchAlerts(
    expiryWarningDays: number,
  ): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];

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

      let severity: "critical" | "warning";
      if (isExpired) {
        severity = "critical";
      } else if (daysUntilExpiry <= 7) {
        severity = "critical";
      } else {
        severity = "warning";
      }

      alerts.push({
        type: isExpired ? "expired" : "expiring_soon",
        severity,
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

    return alerts;
  }

  private sortAlerts(alerts: InventoryAlert[]): void {
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
  }

  private getSeverityCounts(alerts: InventoryAlert[]): {
    critical: number;
    warnings: number;
  } {
    const critical = alerts.filter(a => a.severity === "critical").length;
    const warnings = alerts.filter(a => a.severity === "warning").length;

    return { critical, warnings };
  }
}
