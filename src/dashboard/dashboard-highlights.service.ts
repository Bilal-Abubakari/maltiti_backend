import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Product } from "../entities/Product.entity";
import { ProductHighlight } from "../interfaces/dashboard.interface";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";

type ProductRevenueData = {
  name: string;
  category: string;
  current: number;
  previous: number;
};

@Injectable()
export class DashboardHighlightsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Get product performance with comparison
   */
  public async getProductPerformance(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<ProductHighlight[]> {
    const currentSales = await this.getSalesForPeriod(startDate, endDate);
    const previousSales = await this.getSalesForPeriod(
      prevStartDate,
      prevEndDate,
    );

    const productMap = new Map<string, ProductRevenueData>();

    await this.aggregateProductRevenue(currentSales, productMap, true);
    await this.aggregateProductRevenue(previousSales, productMap, false);

    return this.computeHighlights(productMap);
  }

  private async getSalesForPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<Sale[]> {
    return this.saleRepository
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
  }

  private async aggregateProductRevenue(
    sales: Sale[],
    productMap: Map<string, ProductRevenueData>,
    isCurrent: boolean,
  ): Promise<void> {
    for (const sale of sales) {
      for (const item of sale.lineItems) {
        await this.processLineItem(item, productMap, isCurrent);
      }
    }
  }

  private async processLineItem(
    item: SaleLineItem,
    productMap: Map<string, ProductRevenueData>,
    isCurrent: boolean,
  ): Promise<void> {
    const revenue = item.finalPrice * item.requestedQuantity;

    if (isCurrent) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, deletedAt: IsNull() },
      });

      if (!product) return;

      const existing = productMap.get(item.productId);

      if (existing) {
        existing.current += revenue;
      } else {
        productMap.set(item.productId, {
          name: product.name,
          category: product.category,
          current: revenue,
          previous: 0,
        });
      }
    } else {
      const existing = productMap.get(item.productId);

      if (existing) {
        existing.previous += revenue;
      }
    }
  }

  private computeHighlights(
    productMap: Map<string, ProductRevenueData>,
  ): ProductHighlight[] {
    const highlights: ProductHighlight[] = [];

    for (const [productId, data] of productMap.entries()) {
      const change = data.current - data.previous;
      const changePercentage =
        data.previous > 0 ? (change / data.previous) * 100 : 0;

      highlights.push({
        productId,
        productName: data.name,
        category: data.category,
        metric: data.current,
        change,
        changePercentage,
      });
    }

    return highlights;
  }
}
