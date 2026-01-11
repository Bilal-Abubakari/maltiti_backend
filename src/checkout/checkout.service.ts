import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Cart } from "../entities/Cart.entity";
import { DataSource, IsNull, QueryRunner, Repository } from "typeorm";
import axios from "axios";
import * as process from "process";
import { InitializeTransaction } from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
  ordersPagination,
} from "../interfaces/general";
import { NotificationService } from "../notification/notification.service";
import { Sale } from "../entities/Sale.entity";
import { SaleStatus } from "../enum/sale-status.enum";
import { User } from "../entities/User.entity";
import { Customer } from "../entities/Customer.entity";
import { GetDeliveryCostDto } from "../dto/checkout/getDeliveryCost.dto";

@Injectable()
export class CheckoutService {
  private logger = new Logger("CheckoutService");
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  public async getDeliveryCost(
    id: string,
    dto: GetDeliveryCostDto,
  ): Promise<number> {
    const user = await this.userService.findOne(id);
    const cart = await this.cartRepository.findBy({ user });

    let boxes = 0;

    cart.forEach(cartItem => {
      boxes += cartItem.quantity / cartItem.product.quantityInBox;
    });

    if (boxes < 1) {
      boxes = 1;
    }

    // Delivery charges per box in cedis
    const deliveryCharges = {
      tamale: 25,
      northern: 35,
      other: 60,
    };

    if (dto.country.toLowerCase() !== "ghana") {
      return -1;
    }

    let charge = deliveryCharges.other;

    if (dto.city.toLowerCase() === "tamale") {
      charge = deliveryCharges.tamale;
    } else if (dto.region.toLowerCase() === "northern") {
      charge = deliveryCharges.northern;
    }

    return boxes * charge;
  }

  private async calculateCartAmount(carts: Cart[]): Promise<number> {
    let totalAmount = 0;

    for (const cart of carts) {
      const product = cart.product;
      const itemTotal = product.retail * cart.quantity;
      totalAmount += itemTotal;
    }

    return Number(totalAmount.toFixed(2));
  }

  public async initializeTransaction(
    id: string,
    data: InitializeTransaction,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const user = await this.userService.findOne(id);
    const cartsToUpdate = await this.cartRepository.findBy({
      user,
      checkout: IsNull(),
    });

    if (!cartsToUpdate || cartsToUpdate.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "No items in cart to checkout",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customer = await this.findOrCreateCustomer(user, data, queryRunner);

      const deliverCost = await this.getDeliveryCost(user.id, {
        city: data.city,
        country: data.country,
        region: data.region,
      });

      const productTotal = await this.calculateCartAmount(cartsToUpdate);
      const totalAmount =
        deliverCost === -1 ? productTotal : productTotal + deliverCost;

      const sale = await this.createSale(customer, cartsToUpdate, queryRunner);

      const checkout = await this.createCheckout(
        sale,
        totalAmount,
        queryRunner,
      );

      await this.linkCartsToCheckout(cartsToUpdate, checkout, queryRunner);

      const response = await this.initializePaystack(
        checkout,
        user,
        totalAmount,
      );

      checkout.paystackReference = response.data.data.reference;
      await queryRunner.manager.save(checkout);

      await queryRunner.commitTransaction();

      await this.sendOrderNotifications(user);

      return response.data;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error initializing transaction", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  public async confirmPayment(
    userId: string,
    checkoutId: string,
  ): Promise<Checkout> {
    try {
      await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${userId}=${checkoutId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );
      const checkout = await this.checkoutRepository.findOne({
        where: { id: checkoutId },
        relations: ["sale", "sale.customer", "sale.customer.user"],
      });

      if (!checkout) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "Checkout not found",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const sale = checkout.sale;
      const user = sale.customer.user;
      sale.status = SaleStatus.PAID;
      await this.saleRepository.save(sale);

      await this.notificationService.sendEmail(
        "Your payment has been received, your order is already in progress",
        user.email,
        "Payment Confirmation",
        user.name,
        process.env.APP_URL,
        "Go",
        "Go",
      );
      return this.checkoutRepository.save(checkout);
    } catch (error) {
      this.logger.error("Error confirming payment", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async getOrders(id: string): Promise<Checkout[]> {
    const user = await this.userService.findOne(id);
    const customer = await this.customerRepository.findOne({
      where: { user: { id: user.id } },
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
    saleStatus: SaleStatus,
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

    if (saleStatus) {
      queryBuilder.andWhere("LOWER(sale.status) = LOWER(:saleStatus)", {
        saleStatus,
      });
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

  public async updateSaleStatus(id: string, status: SaleStatus): Promise<Sale> {
    const checkout = await this.checkoutRepository.findOne({
      where: { id },
      relations: ["sale", "sale.customer", "sale.customer.user"],
    });

    if (!checkout) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Checkout not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const sale = checkout.sale;
    sale.status = status;

    const customer = sale.customer;
    const user = customer.user;

    if (user) {
      await this.notificationService.sendSms(
        user.phoneNumber,
        `Your order status has been updated to: ${status}`,
      );
      await this.notificationService.sendEmail(
        `Your order status has been updated to: ${status}`,
        user.email,
        "Order Status Update",
        user.name,
        process.env.APP_URL,
        "Go",
        "Go",
      );
    }

    return await this.saleRepository.save(sale);
  }

  public async cancelOrder(id: string): Promise<Checkout> {
    const order = await this.checkoutRepository.findOne({
      where: { id },
      relations: ["sale", "sale.customer", "sale.customer.user", "carts"],
    });

    if (!order) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Order not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const sale = order.sale;
    const customer = sale.customer;
    const user = customer.user;

    if (sale.status === SaleStatus.CANCELLED) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (sale.status === SaleStatus.DELIVERED) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already delivered and cannot be cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (sale.status === SaleStatus.IN_TRANSIT) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already in transit and cannot be cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (
      sale.status === SaleStatus.PAID ||
      sale.status === SaleStatus.PACKAGING
    ) {
      try {
        await axios.post(
          `${process.env.PAYSTACK_BASE_URL}/refund/`,
          { transaction: order.paystackReference || `${user?.id}=${id}` },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          },
        );
        sale.status = SaleStatus.CANCELLED;
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: error.response?.data?.message || "Refund failed",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    sale.status = SaleStatus.CANCELLED;
    sale.deletedAt = new Date();
    await this.saleRepository.save(sale);

    if (user) {
      await this.notificationService.sendSms(
        "233557309018",
        `${user.name} has cancelled the order with id ${order.id}`,
      );
      await this.notificationService.sendEmail(
        `${user.name} has cancelled the order with id ${order.id}`,
        "bilal.abubakari@maltitiaenterprise.com",
        "Order Cancelled",
        user.name,
        process.env.ADMIN_URL,
        "Go",
        "Go",
      );
      await this.notificationService.sendSms(
        user.phoneNumber,
        "Your order has been cancelled successfully, please do order again",
      );
      await this.notificationService.sendEmail(
        "Your order has been cancelled successfully, please do order again",
        user.email,
        "Order Cancelled",
        user.name,
        process.env.APP_URL,
        "Go",
        "Go",
      );
    }

    return await this.checkoutRepository.save(order);
  }

  private async findOrCreateCustomer(
    user: User,
    data: InitializeTransaction,
    queryRunner: QueryRunner,
  ): Promise<Customer> {
    let customer = await queryRunner.manager.findOne(Customer, {
      where: { user: { id: user.id } },
      relations: ["user"],
    });

    if (!customer) {
      customer = new Customer();
      customer.user = user;
      customer.name = user.name;
      customer.email = user.email;
      customer.phone = user.phoneNumber;
    }

    customer.country = data.country;
    customer.region = data.region;
    customer.city = data.city;
    customer.phoneNumber = data.phoneNumber;
    customer.extraInfo = data.extraInfo || null;
    customer.address = `${data.country}, ${data.region}, ${data.city}${data.extraInfo ? ", " + data.extraInfo : ""}`;

    customer = await queryRunner.manager.save(customer);

    return customer;
  }

  private async createSale(
    customer: Customer,
    carts: Cart[],
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    const sale = new Sale();
    sale.customer = customer;
    sale.status = SaleStatus.PENDING_PAYMENT;
    sale.lineItems = carts.map(cart => ({
      productId: cart.product.id,
      batchAllocations: [],
      requestedQuantity: cart.quantity,
      customPrice: undefined,
      finalPrice: cart.product.retail * cart.quantity,
    }));

    return await queryRunner.manager.save(sale);
  }

  private async createCheckout(
    sale: Sale,
    totalAmount: number,
    queryRunner: QueryRunner,
  ): Promise<Checkout> {
    const checkout = new Checkout();
    checkout.sale = sale;
    checkout.amount = totalAmount;

    return await queryRunner.manager.save(checkout);
  }

  private async linkCartsToCheckout(
    carts: Cart[],
    checkout: Checkout,
    queryRunner: QueryRunner,
  ): Promise<void> {
    carts.forEach(cart => {
      cart.checkout = checkout;
    });

    await queryRunner.manager.save(carts);
  }

  private async initializePaystack(
    checkout: Checkout,
    user: User,
    totalAmount: number,
  ): Promise<{
    data: IInitializeTransactionResponse<IInitalizeTransactionData>;
  }> {
    return await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(totalAmount * 100),
        email: user.email,
        reference: `${user.id}=${checkout.id}`,
        callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${checkout.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }

  private async sendOrderNotifications(user: User): Promise<void> {
    await this.notificationService.sendEmail(
      "A new order has been placed. Please visit the admin dashboard",
      [
        "bilal.abubakari@maltitiaenterprise.com",
        "mohammed.abubakari@maltitiaenterprise.com",
      ],
      "Order Received",
      user.name,
      process.env.FRONTEND_URL_ADMIN,
      "Go",
      "Go",
    );
  }
}
