import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import {
  BaseReportQueryDto,
  InventoryReportQueryDto,
  TimeAggregation,
} from "../dto/reports.dto";
import {
  BatchReportResponse,
  InventoryReportResponse,
  StockMovementResponse,
  BatchAgingResponse,
  BatchProductionData,
  InventoryItem,
  StockMovementData,
  BatchAgingData,
} from "../interfaces/reports.interface";
import { PaymentStatus } from "../enum/payment-status.enum";

@Injectable()
export class InventoryReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

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
        newestBatchDate: batchDates.at(-1),
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
      movements.length > 0 ? movements.at(-1).closingStock : 0;

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

  // ============ PRIVATE HELPER METHODS ============

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
