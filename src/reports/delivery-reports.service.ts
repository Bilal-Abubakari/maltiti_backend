import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { BaseReportQueryDto } from "../dto/reports.dto";
import {
  DeliveryReportResponse,
  DeliveryFeeData,
} from "../interfaces/reports.interface";
import { PaymentStatus } from "../enum/payment-status.enum";

type LocationData = {
  country: string;
  region: string;
  totalOrders: number;
  totalDeliveryFees: number;
  ordersWithDelivery: number;
  ordersWithoutDelivery: number;
};

@Injectable()
export class DeliveryReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
  ) {}

  /**
   * Get delivery report
   */
  public async getDeliveryReport(
    queryDto: BaseReportQueryDto,
  ): Promise<DeliveryReportResponse> {
    const { fromDate, toDate } = queryDto;

    const sales = await this.getSalesForDeliveryReport(fromDate, toDate);

    const {
      locationMap,
      totalDeliveryRevenue,
      ordersAwaitingDeliveryCalc,
      totalOrdersWithDelivery,
      totalOrdersWithoutDelivery,
    } = this.aggregateDeliveryData(sales);

    const byLocation = this.computeByLocation(locationMap);

    const summary = this.computeSummary(
      sales,
      totalDeliveryRevenue,
      ordersAwaitingDeliveryCalc,
      totalOrdersWithDelivery,
      totalOrdersWithoutDelivery,
    );

    return {
      summary,
      byLocation,
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async getSalesForDeliveryReport(
    fromDate?: string,
    toDate?: string,
  ): Promise<Sale[]> {
    const queryBuilder = this.saleRepository
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .where("sale.deletedAt IS NULL")
      .andWhere("sale.paymentStatus = :paymentStatus", {
        paymentStatus: PaymentStatus.PAID,
      });

    if (fromDate && toDate) {
      queryBuilder.andWhere("sale.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    }

    return await queryBuilder.getMany();
  }

  private aggregateDeliveryData(sales: Sale[]): {
    locationMap: Map<string, LocationData>;
    totalDeliveryRevenue: number;
    ordersAwaitingDeliveryCalc: number;
    totalOrdersWithDelivery: number;
    totalOrdersWithoutDelivery: number;
  } {
    const locationMap = new Map<string, LocationData>();

    const totals = {
      totalDeliveryRevenue: 0,
      ordersAwaitingDeliveryCalc: 0,
      totalOrdersWithDelivery: 0,
      totalOrdersWithoutDelivery: 0,
    };

    for (const sale of sales) {
      this.processSale(sale, locationMap, totals);
    }

    return {
      locationMap,
      ...totals,
    };
  }

  private processSale(
    sale: Sale,
    locationMap: Map<string, LocationData>,
    totals: {
      totalDeliveryRevenue: number;
      ordersAwaitingDeliveryCalc: number;
      totalOrdersWithDelivery: number;
      totalOrdersWithoutDelivery: number;
    },
  ): void {
    const country = sale.customer.country || "Unknown";
    const region = sale.customer.region || "";
    const key = `${country}|${region}`;

    const deliveryFee = sale.deliveryFee ? Number(sale.deliveryFee) : 0;
    totals.totalDeliveryRevenue += deliveryFee;

    if (sale.paymentStatus === PaymentStatus.AWAITING_DELIVERY) {
      totals.ordersAwaitingDeliveryCalc++;
    }

    const hasDelivery = deliveryFee > 0;
    if (hasDelivery) {
      totals.totalOrdersWithDelivery++;
    } else {
      totals.totalOrdersWithoutDelivery++;
    }

    const existing = locationMap.get(key);
    if (existing) {
      existing.totalOrders++;
      existing.totalDeliveryFees += deliveryFee;
      if (hasDelivery) {
        existing.ordersWithDelivery++;
      } else {
        existing.ordersWithoutDelivery++;
      }
    } else {
      locationMap.set(key, {
        country,
        region,
        totalOrders: 1,
        totalDeliveryFees: deliveryFee,
        ordersWithDelivery: hasDelivery ? 1 : 0,
        ordersWithoutDelivery: hasDelivery ? 0 : 1,
      });
    }
  }

  private computeByLocation(
    locationMap: Map<string, LocationData>,
  ): DeliveryFeeData[] {
    return Array.from(locationMap.values())
      .map(loc => ({
        country: loc.country,
        region: loc.region || undefined,
        totalOrders: loc.totalOrders,
        totalDeliveryFees: loc.totalDeliveryFees,
        averageDeliveryFee:
          loc.ordersWithDelivery > 0
            ? loc.totalDeliveryFees / loc.ordersWithDelivery
            : 0,
        ordersWithDelivery: loc.ordersWithDelivery,
        ordersWithoutDelivery: loc.ordersWithoutDelivery,
      }))
      .sort((a, b) => b.totalDeliveryFees - a.totalDeliveryFees);
  }

  private computeSummary(
    sales: Sale[],
    totalDeliveryRevenue: number,
    ordersAwaitingDeliveryCalc: number,
    totalOrdersWithDelivery: number,
    totalOrdersWithoutDelivery: number,
  ): DeliveryReportResponse["summary"] {
    return {
      totalOrders: sales.length,
      totalDeliveryRevenue,
      averageDeliveryFee:
        totalOrdersWithDelivery > 0
          ? totalDeliveryRevenue / totalOrdersWithDelivery
          : 0,
      ordersAwaitingDeliveryCalc,
      ordersWithDelivery: totalOrdersWithDelivery,
      ordersWithoutDelivery: totalOrdersWithoutDelivery,
    };
  }
}
