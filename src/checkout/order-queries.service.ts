import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { Customer } from "../entities/Customer.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { ordersPagination } from "../interfaces/general";
@Injectable()
export class OrderQueriesService {
  constructor(
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}
  public async getOrders(id: string): Promise<Checkout[]> {
    const customer = await this.customerRepository.findOne({
      where: { user: { id: id } },
    });
    if (!customer) {
      return [];
    }
    return this.checkoutRepository.find({
      where: { sale: { customer: { id: customer.id } } },
      relations: ["sale", "sale.customer", "carts", "carts.product"],
      order: { createdAt: "DESC" },
    });
  }
  public async getOrder(id: string): Promise<Checkout> {
    const checkout = await this.checkoutRepository.findOne({
      where: { id },
      relations: ["sale", "sale.customer", "carts", "carts.product"],
    });
    if (!checkout) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Order not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return checkout;
  }
  public async getAllOrders(
    page: number = 1,
    limit: number = 10,
    searchTerm: string = "",
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<ordersPagination> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.checkoutRepository.createQueryBuilder("checkout");
    queryBuilder.leftJoinAndSelect("checkout.carts", "carts");
    queryBuilder.leftJoinAndSelect("carts.product", "product");
    queryBuilder.leftJoinAndSelect("checkout.sale", "sale");
    queryBuilder.leftJoinAndSelect("sale.customer", "customer");
    if (searchTerm) {
      queryBuilder.where("LOWER(customer.name) LIKE LOWER(:searchTerm)", {
        searchTerm: `%${searchTerm.toLowerCase()}%`,
      });
    }
    if (orderStatus) {
      queryBuilder.andWhere("LOWER(sale.orderStatus) = LOWER(:orderStatus)", {
        orderStatus,
      });
    }
    if (paymentStatus) {
      queryBuilder.andWhere(
        "LOWER(sale.paymentStatus) = LOWER(:paymentStatus)",
        {
          paymentStatus,
        },
      );
    }
    queryBuilder.orderBy("checkout.createdAt", "DESC");
    const [orders, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      orders,
    };
  }
  public async getOrderStatus(
    checkoutId: string,
    email: string,
  ): Promise<Checkout> {
    const checkout = await this.checkoutRepository.findOne({
      where: { id: checkoutId },
      relations: ["sale", "sale.customer", "carts", "carts.product"],
    });
    if (!checkout) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Order not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }
    // Check if the email matches either guest email or customer email
    const customerEmail = checkout.sale.customer.email;
    const guestEmail = checkout.guestEmail;
    if (
      email.toLowerCase() !== customerEmail?.toLowerCase() &&
      email.toLowerCase() !== guestEmail?.toLowerCase()
    ) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: "Email does not match order records",
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return checkout;
  }
}
