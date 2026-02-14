import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Batch } from "../entities/Batch.entity";
import { TrendDataPoint } from "../interfaces/dashboard.interface";
import { PaymentStatus } from "../enum/payment-status.enum";

@Injectable()
export class DashboardTrendsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Get sales trend data
   */
  public async getSalesTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    return this.aggregateByDay(sales, startDate, endDate, () => 1);
  }

  /**
   * Get revenue trend data
   */
  public async getRevenueTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    return this.aggregateByDay(sales, startDate, endDate, sale => {
      // Use Sale.amount if available, otherwise calculate from lineItems
      if (sale.amount !== null && sale.amount !== undefined) {
        return Number(sale.amount);
      }
      return sale.lineItems.reduce(
        (sum, item) => sum + item.finalPrice * item.requestedQuantity,
        0,
      );
    });
  }

  /**
   * Get production vs sales trend
   */
  public async getProductionVsSalesTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<{ produced: TrendDataPoint[]; sold: TrendDataPoint[] }> {
    // Production
    const batches = await this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.deletedAt IS NULL")
      .andWhere("batch.productionDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    const produced = this.aggregateByDay(
      batches,
      startDate,
      endDate,
      batch => batch.quantity,
      "productionDate",
    );

    // Sales
    const sales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere("sale.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();

    const sold = this.aggregateByDay(sales, startDate, endDate, sale =>
      sale.lineItems.reduce((sum, item) => sum + item.requestedQuantity, 0),
    );

    return { produced, sold };
  }

  /**
   * Calculate trend direction
   */
  public calculateTrendDirection(data: TrendDataPoint[]): {
    direction: "up" | "down" | "stable";
    changePercentage: number;
  } {
    if (data.length < 2) {
      return { direction: "stable", changePercentage: 0 };
    }

    const halfPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, halfPoint);
    const secondHalf = data.slice(halfPoint);

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercentage = firstAvg > 0 ? (change / firstAvg) * 100 : 0;

    let direction: "up" | "down" | "stable" = "stable";
    if (Math.abs(changePercentage) > 5) {
      direction = changePercentage > 0 ? "up" : "down";
    }

    return { direction, changePercentage };
  }

  /**
   * Aggregate data by day
   */
  private aggregateByDay<T>(
    items: T[],
    startDate: Date,
    endDate: Date,
    getValue: (item: T) => number,
    dateField: keyof T = "createdAt" as keyof T,
  ): TrendDataPoint[] {
    const dateMap = new Map<string, number>();

    // Initialize all days with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate values
    for (const item of items) {
      const date = new Date(item[dateField] as unknown as string);
      const dateKey = date.toISOString().split("T")[0];

      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, dateMap.get(dateKey)! + getValue(item));
      }
    }

    // Convert to array
    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
