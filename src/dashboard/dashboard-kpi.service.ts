import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { Batch } from "../entities/Batch.entity";
import { DashboardKPIs } from "../interfaces/dashboard.interface";
import { PaymentStatus } from "../enum/payment-status.enum";
import { ProductStatus } from "../enum/product-status.enum";

@Injectable()
export class DashboardKPIService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  /**
   * Calculate KPIs for a given period
   */
  public async calculateKPIs(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardKPIs> {
    // Sales and revenue for period
    const periodSales = await this.saleRepository
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

    const periodRevenue = periodSales.reduce((sum, sale) => {
      // Use Sale.amount if available, otherwise calculate from lineItems
      if (sale.amount !== null && sale.amount !== undefined) {
        return sum + Number(sale.amount);
      }
      return (
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.finalPrice * item.requestedQuantity,
          0,
        )
      );
    }, 0);

    // All-time sales and revenue
    const allSales = await this.saleRepository
      .createQueryBuilder("sale")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      })
      .getMany();

    const totalRevenue = allSales.reduce((sum, sale) => {
      // Use Sale.amount if available, otherwise calculate from lineItems
      if (sale.amount !== null && sale.amount !== undefined) {
        return sum + Number(sale.amount);
      }
      return (
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.finalPrice * item.requestedQuantity,
          0,
        )
      );
    }, 0);

    // Products
    const allProducts = await this.productRepository.find({
      where: { deletedAt: IsNull() },
    });

    const activeProducts = allProducts.filter(
      p => p.status === ProductStatus.ACTIVE,
    ).length;

    const inactiveProducts = allProducts.length - activeProducts;

    // Batches
    const allBatches = await this.batchRepository.find({
      where: { deletedAt: IsNull() },
    });

    const activeBatches = allBatches.filter(b => b.isActive).length;

    // Inventory
    const productsWithBatches = await this.productRepository.find({
      where: { deletedAt: IsNull() },
      relations: ["batches"],
    });

    let totalInventoryValue = 0;
    let totalInventoryQuantity = 0;
    let lowStockItems = 0;

    for (const product of productsWithBatches) {
      const activeBatchStock = product.batches
        .filter(b => b.isActive && !b.deletedAt)
        .reduce((sum, b) => sum + b.quantity, 0);

      totalInventoryQuantity += activeBatchStock;
      totalInventoryValue += activeBatchStock * Number(product.wholesale);

      if (activeBatchStock > 0 && activeBatchStock < 100) {
        lowStockItems++;
      }
    }

    // Production vs sales
    const totalProduced = allBatches.reduce((sum, b) => sum + b.quantity, 0);
    const totalSold = allSales.reduce(
      (sum, sale) =>
        sum +
        sale.lineItems.reduce(
          (itemSum, item) => itemSum + item.requestedQuantity,
          0,
        ),
      0,
    );

    const utilizationRate =
      totalProduced > 0 ? (totalSold / totalProduced) * 100 : 0;

    return {
      revenue: {
        total: totalRevenue,
        period: periodRevenue,
      },
      sales: {
        total: allSales.length,
        period: periodSales.length,
      },
      products: {
        total: allProducts.length,
        active: activeProducts,
        inactive: inactiveProducts,
      },
      batches: {
        total: allBatches.length,
        active: activeBatches,
      },
      inventory: {
        totalValue: totalInventoryValue,
        totalQuantity: totalInventoryQuantity,
        lowStockItems,
      },
      production: {
        totalProduced,
        totalSold,
        utilizationRate,
      },
    };
  }

  /**
   * Calculate growth percentage
   */
  public calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
