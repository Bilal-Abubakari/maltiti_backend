import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Cart } from "../entities/Cart.entity";
import { DataSource, IsNull, QueryRunner, Repository } from "typeorm";
import axios from "axios";
import * as process from "process";
import {
  InitializeTransaction,
  PlaceOrderDto,
  UpdateDeliveryCostDto,
  GuestInitializeTransactionDto,
  GuestPlaceOrderDto,
  GuestGetDeliveryCostDto,
} from "../dto/checkout.dto";
import { Checkout } from "../entities/Checkout.entity";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
  ordersPagination,
} from "../interfaces/general";
import { NotificationService } from "../notification/notification.service";
import { Sale } from "../entities/Sale.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
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

  public async placeOrder(id: string, data: PlaceOrderDto): Promise<Checkout> {
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
      sale.orderStatus = OrderStatus.PENDING;
      sale.paymentStatus = PaymentStatus.INVOICE_REQUESTED;
      await queryRunner.manager.save(sale);

      const checkout = await this.createCheckout(
        sale,
        totalAmount,
        queryRunner,
      );

      await this.linkCartsToCheckout(cartsToUpdate, checkout, queryRunner);

      await queryRunner.commitTransaction();

      await this.sendOrderNotifications(user);

      await this.notificationService.sendEmail(
        "Your order has been placed successfully. You can make payment later from your dashboard.",
        user.email,
        "Order Placed",
        user.name,
        process.env.APP_URL,
        "Go to Dashboard",
        "Go to Dashboard",
      );

      return await this.checkoutRepository.findOne({
        where: { id: checkout.id },
        relations: ["sale", "sale.customer", "carts", "carts.product"],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error placing order", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  public async payForOrder(
    userId: string,
    checkoutId: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const user = await this.userService.findOne(userId);
    const checkout = await this.checkoutRepository.findOne({
      where: { id: checkoutId },
      relations: ["sale", "sale.customer"],
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

    if (checkout.sale.customer.user.id !== userId) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: "You are not authorized to pay for this order",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      checkout.sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      checkout.sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Cannot pay for order with payment status: ${checkout.sale.paymentStatus}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response = await this.initializePaystack(
        checkout,
        user,
        Number(checkout.amount),
      );

      checkout.paystackReference = response.data.data.reference;
      checkout.sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
      await this.saleRepository.save(checkout.sale);
      await this.checkoutRepository.save(checkout);

      return response.data;
    } catch (error) {
      this.logger.error("Error initializing payment for order", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      sale.paymentStatus = PaymentStatus.PAID;
      await this.saleRepository.save(sale);

      if (user) {
        await this.notificationService.sendEmail(
          "Your payment has been received, your order is already in progress",
          user.email,
          "Payment Confirmation",
          user.name,
          process.env.APP_URL,
          "Go",
          "Go",
        );
      }
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

  public async confirmGuestPayment(checkoutId: string): Promise<Checkout> {
    try {
      // For guest payments, the reference is "guest={checkoutId}"
      await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/guest=${checkoutId}`,
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
      sale.paymentStatus = PaymentStatus.PAID;
      await this.saleRepository.save(sale);

      // Send email to guest or user
      const email = checkout.guestEmail || sale.customer.email;
      const name = sale.customer.name;

      if (email) {
        await this.notificationService.sendEmail(
          `Your payment has been received, your order is already in progress. Your Order ID is ${sale.id}. You can track your order anytime using this ID and your email address.`,
          email,
          "Payment Confirmation",
          name,
          `${process.env.FRONTEND_URL}/track-order/${sale.id}`,
          "Track Order",
          "Track Order",
        );
      }

      return this.checkoutRepository.save(checkout);
    } catch (error) {
      this.logger.error("Error confirming guest payment", error);
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

  public async updateSaleStatus(
    id: string,
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<Sale> {
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

    if (orderStatus) {
      sale.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      sale.paymentStatus = paymentStatus;
    }

    const customer = sale.customer;
    const user = customer.user;

    if (user) {
      const statusMessage = [];
      if (orderStatus) statusMessage.push(`Order Status: ${orderStatus}`);
      if (paymentStatus) statusMessage.push(`Payment Status: ${paymentStatus}`);

      const message = `Your order has been updated. ${statusMessage.join(", ")}`;

      await this.notificationService.sendSms(user.phoneNumber, message);
      await this.notificationService.sendEmail(
        message,
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

  public async updateDeliveryCost(
    id: string,
    dto: UpdateDeliveryCostDto,
  ): Promise<Checkout> {
    const checkout = await this.checkoutRepository.findOne({
      where: { id },
      relations: [
        "sale",
        "sale.customer",
        "sale.customer.user",
        "carts",
        "carts.product",
      ],
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

    if (
      checkout.sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      checkout.sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Cannot update delivery cost for order with payment status: ${checkout.sale.paymentStatus}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const carts = await checkout.carts;
    const productTotal = await this.calculateCartAmount(carts);
    const newTotalAmount = productTotal + dto.deliveryCost;

    checkout.amount = newTotalAmount;
    await this.checkoutRepository.save(checkout);

    const customer = checkout.sale.customer;
    const user = customer.user;

    if (user) {
      await this.notificationService.sendEmail(
        `The delivery cost for your order has been updated to GHS ${dto.deliveryCost.toFixed(2)}. Your new total amount is GHS ${newTotalAmount.toFixed(2)}.`,
        user.email,
        "Delivery Cost Updated",
        user.name,
        process.env.APP_URL,
        "View Order",
        "View Order",
      );
    }

    return await this.checkoutRepository.findOne({
      where: { id: checkout.id },
      relations: ["sale", "sale.customer", "carts", "carts.product"],
    });
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

    if (sale.orderStatus === OrderStatus.CANCELLED) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (sale.orderStatus === OrderStatus.DELIVERED) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already delivered and cannot be cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (sale.orderStatus === OrderStatus.IN_TRANSIT) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "This order is already in transit and cannot be cancelled",
        },
        HttpStatus.CONFLICT,
      );
    }

    if (
      sale.paymentStatus === PaymentStatus.PAID ||
      sale.orderStatus === OrderStatus.PACKAGING
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
        sale.orderStatus = OrderStatus.CANCELLED;
        sale.paymentStatus = PaymentStatus.REFUNDED;
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

    sale.orderStatus = OrderStatus.CANCELLED;
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
    data: InitializeTransaction | PlaceOrderDto,
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
    sale.orderStatus = OrderStatus.PENDING;
    sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
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

  // Guest checkout methods
  public async getGuestDeliveryCost(
    dto: GuestGetDeliveryCostDto,
  ): Promise<number> {
    const cart = await this.cartRepository.findBy({ sessionId: dto.sessionId });

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

  public async guestInitializeTransaction(
    data: GuestInitializeTransactionDto,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const cartsToUpdate = await this.cartRepository.findBy({
      sessionId: data.sessionId,
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
      const customer = await this.findOrCreateGuestCustomer(data, queryRunner);

      const deliverCost = await this.getGuestDeliveryCost({
        sessionId: data.sessionId,
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
      checkout.guestEmail = data.email;
      await queryRunner.manager.save(checkout);

      await this.linkCartsToCheckout(cartsToUpdate, checkout, queryRunner);

      const response = await this.initializeGuestPaystack(
        sale,
        data.email,
        totalAmount,
      );

      checkout.paystackReference = response.data.data.reference;
      await queryRunner.manager.save(checkout);

      await queryRunner.commitTransaction();

      await this.sendGuestOrderNotifications(data.name);

      return response.data;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error initializing guest transaction", error);
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

  public async guestPlaceOrder(data: GuestPlaceOrderDto): Promise<Checkout> {
    const cartsToUpdate = await this.cartRepository.findBy({
      sessionId: data.sessionId,
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
      const customer = await this.findOrCreateGuestCustomer(data, queryRunner);

      const deliverCost = await this.getGuestDeliveryCost({
        sessionId: data.sessionId,
        city: data.city,
        country: data.country,
        region: data.region,
      });

      const productTotal = await this.calculateCartAmount(cartsToUpdate);
      const totalAmount =
        deliverCost === -1 ? productTotal : productTotal + deliverCost;

      const sale = await this.createSale(customer, cartsToUpdate, queryRunner);
      sale.orderStatus = OrderStatus.PENDING;
      sale.paymentStatus = PaymentStatus.INVOICE_REQUESTED;
      await queryRunner.manager.save(sale);

      const checkout = await this.createCheckout(
        sale,
        totalAmount,
        queryRunner,
      );
      checkout.guestEmail = data.email;
      await queryRunner.manager.save(checkout);

      await this.linkCartsToCheckout(cartsToUpdate, checkout, queryRunner);

      await queryRunner.commitTransaction();

      await this.sendGuestOrderNotifications(data.name);

      await this.notificationService.sendEmail(
        "Your order has been placed successfully. You can make payment later using the order tracking link sent to your email.",
        data.email,
        "Order Placed",
        data.name,
        `${process.env.FRONTEND_URL}/track-order/${checkout.id}`,
        "Track Order",
        "Track Order",
      );

      return await this.checkoutRepository.findOne({
        where: { id: checkout.id },
        relations: ["sale", "sale.customer", "carts", "carts.product"],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error placing guest order", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
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

  public async payForGuestOrder(
    checkoutId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const checkout = await this.checkoutRepository.findOne({
      where: { id: checkoutId },
      relations: ["sale", "sale.customer"],
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

    // Verify email
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

    if (
      checkout.sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      checkout.sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Cannot pay for order with payment status: ${checkout.sale.paymentStatus}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const useEmail = guestEmail || customerEmail;
      const response = await this.initializeGuestPaystack(
        checkout.sale,
        useEmail,
        Number(checkout.amount),
      );

      checkout.paystackReference = response.data.data.reference;
      checkout.sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
      await this.saleRepository.save(checkout.sale);
      await this.checkoutRepository.save(checkout);

      return response.data;
    } catch (error) {
      this.logger.error("Error initializing payment for guest order", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async findOrCreateGuestCustomer(
    data: GuestInitializeTransactionDto | GuestPlaceOrderDto,
    queryRunner: QueryRunner,
  ): Promise<Customer> {
    // Try to find existing customer by email
    let customer = await queryRunner.manager.findOne(Customer, {
      where: { email: data.email },
    });

    if (!customer) {
      customer = new Customer();
      customer.user = null;
      customer.name = data.name;
      customer.email = data.email;
      customer.phone = data.phoneNumber;
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

  private async initializeGuestPaystack(
    sale: Sale,
    email: string,
    totalAmount: number,
  ): Promise<{
    data: IInitializeTransactionResponse<IInitalizeTransactionData>;
  }> {
    return await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(totalAmount * 100),
        email: email,
        reference: `guest=${sale.id}`,
        callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${sale.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }

  private async sendGuestOrderNotifications(name: string): Promise<void> {
    await this.notificationService.sendEmail(
      "A new order has been placed by a guest user. Please visit the admin dashboard",
      [
        "bilal.abubakari@maltitiaenterprise.com",
        "mohammed.abubakari@maltitiaenterprise.com",
      ],
      "Guest Order Received",
      name,
      process.env.FRONTEND_URL_ADMIN,
      "Go",
      "Go",
    );
  }
}
