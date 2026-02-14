import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, ILike, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { ListSalesDto } from "../dto/listSales.dto";
import { ListSalesByEmailDto } from "../dto/sales/listSalesByEmail.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { IPagination } from "../interfaces/general";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";

@Injectable()
export class SaleQueryService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}
  public async listSales(
    query: ListSalesDto,
  ): Promise<IPagination<SaleResponseDto>> {
    const {
      orderStatus,
      paymentStatus,
      customerId,
      customerName,
      page = 1,
      limit = 10,
    } = query;
    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (customerId) {
      where.customer = { id: customerId };
    } else if (customerName) {
      where.customer = { name: ILike(`%${customerName}%`) };
    }
    const [items, totalItems] = await this.saleRepository.findAndCount({
      where,
      relations: [
        "customer",
        "checkout",
        "checkout.carts",
        "checkout.carts.product",
      ],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(sale => transformSaleToResponseDto(sale)),
      totalItems,
      currentPage: page,
      totalPages,
    };
  }
  public async listSalesByEmail(
    query: ListSalesByEmailDto,
  ): Promise<IPagination<SaleResponseDto>> {
    const { email, orderStatus, paymentStatus, page = 1, limit = 10 } = query;
    // First, find the customer by email
    const customer = await this.customerRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException(`No customer found with email "${email}"`);
    }
    // Build the query filters
    const where: Record<string, unknown> = {
      deletedAt: IsNull(),
      customer: { id: customer.id },
    };
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    const [items, totalItems] = await this.saleRepository.findAndCount({
      where,
      relations: ["customer"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map(sale => transformSaleToResponseDto(sale)),
      totalItems,
      currentPage: page,
      totalPages,
    };
  }
  public async getSaleDetails(saleId: string): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }
    return transformSaleToResponseDto(sale);
  }
}
