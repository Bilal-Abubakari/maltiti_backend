import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Batch } from "../entities/Batch.entity";
import {
  DashboardActivityResponse,
  RecentSale,
  RecentBatch,
  RecentInventoryChange,
} from "../interfaces/dashboard.interface";

@Injectable()
export class DashboardActivityService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Get recent activity
   */
  public async getActivity(limit: number): Promise<DashboardActivityResponse> {
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
      paymentStatus: sale.orderStatus,
      orderStatus: sale.paymentStatus,
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
      productionDate: new Date(batch.productionDate).toISOString(),
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
}
