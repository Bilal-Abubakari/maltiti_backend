import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, QueryRunner, Repository } from "typeorm";
import { Cart } from "../entities/Cart.entity";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { User } from "../entities/User.entity";
import { UsersService } from "../users/users.service";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import {
  InitializeTransaction,
  PlaceOrderDto,
  GuestInitializeTransactionDto,
  GuestPlaceOrderDto,
} from "../dto/checkout.dto";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
} from "../interfaces/general";
import { NotificationService } from "../notification/notification.service";
import { DeliveryCostService } from "./delivery-cost.service";
import { PaymentService } from "./payment.service";
import { CustomerManagementService } from "./customer-management.service";

type CheckoutData =
  | InitializeTransaction
  | PlaceOrderDto
  | GuestInitializeTransactionDto
  | GuestPlaceOrderDto;

interface DeliveryLocation {
  country: string;
  city: string;
  region: string;
}
interface PaystackApiResponse {
  data: IInitializeTransactionResponse<IInitalizeTransactionData>;
}
@Injectable()
export class TransactionService {
  private readonly logger = new Logger("TransactionService");
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    private readonly notificationService: NotificationService,
    private readonly deliveryCostService: DeliveryCostService,
    private readonly paymentService: PaymentService,
    private readonly customerManagementService: CustomerManagementService,
    private readonly dataSource: DataSource,
  ) {}

  public async initializeTransaction(
    id: string,
    data: InitializeTransaction,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const user = await this.userService.findOne(id);
    const carts = await this.getCartsForCheckout(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const customer = await this.createCustomerForCheckout(
        user,
        data,
        queryRunner,
      );
      const deliveryCost = await this.getDeliveryCostForCheckout(
        id,
        undefined,
        {
          country: data.country,
          city: data.city,
          region: data.region,
        },
      );
      const { checkout, response } = await this.processCheckout(
        carts,
        customer,
        deliveryCost,
        false,
        queryRunner,
        { user },
      );
      await this.sendOrderNotifications(checkout);
      await queryRunner.commitTransaction();
      return response as IInitializeTransactionResponse<IInitalizeTransactionData>;
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
    const carts = await this.getCartsForCheckout(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const customer = await this.createCustomerForCheckout(
        user,
        data,
        queryRunner,
      );
      const deliveryCost = await this.getDeliveryCostForCheckout(
        id,
        undefined,
        {
          country: data.country,
          city: data.city,
          region: data.region,
        },
      );
      const { checkout } = await this.processCheckout(
        carts,
        customer,
        deliveryCost,
        true,
        queryRunner,
      );
      await queryRunner.commitTransaction();
      await this.sendOrderNotifications(checkout);
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
      return (await this.processPaymentForOrder(checkout, {
        user,
      })) as IInitializeTransactionResponse<IInitalizeTransactionData>;
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

  public async guestInitializeTransaction(
    data: GuestInitializeTransactionDto,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const carts = await this.getCartsForCheckout(undefined, data.sessionId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const customer = await this.createCustomerForCheckout(
        undefined,
        data,
        queryRunner,
      );
      const deliveryCost = await this.getDeliveryCostForCheckout(
        undefined,
        data.sessionId,
        {
          country: data.country,
          city: data.city,
          region: data.region,
        },
      );
      const { checkout, response } = await this.processCheckout(
        carts,
        customer,
        deliveryCost,
        false,
        queryRunner,
        { email: data.email },
        data.email,
      );
      await this.sendOrderNotifications(checkout);
      await queryRunner.commitTransaction();
      return response as IInitializeTransactionResponse<IInitalizeTransactionData>;
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
    const carts = await this.getCartsForCheckout(undefined, data.sessionId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const customer = await this.createCustomerForCheckout(
        undefined,
        data,
        queryRunner,
      );
      const deliveryCost = await this.getDeliveryCostForCheckout(
        undefined,
        data.sessionId,
        {
          country: data.country,
          city: data.city,
          region: data.region,
        },
      );
      const { checkout } = await this.processCheckout(
        carts,
        customer,
        deliveryCost,
        true,
        queryRunner,
        undefined,
        data.email,
      );
      await queryRunner.commitTransaction();
      await this.sendOrderNotifications(checkout);
      await this.notificationService.sendEmail(
        "Your order has been placed successfully. You can make payment later using the order tracking link sent to your email.",
        data.email,
        "Order Placed",
        data.name,
        `${process.env.FRONTEND_URL}/track-order/${checkout.sale.id}`,
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
      return (await this.processPaymentForOrder(checkout, {
        email: useEmail,
      })) as IInitializeTransactionResponse<IInitalizeTransactionData>;
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

  private async calculateCartAmount(carts: Cart[]): Promise<number> {
    let totalAmount = 0;
    for (const cart of carts) {
      const product = cart.product;
      const itemTotal = product.retail * cart.quantity;
      totalAmount += itemTotal;
    }
    return Number(totalAmount.toFixed(2));
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

  private async getCartsForCheckout(
    userId?: string,
    sessionId?: string,
  ): Promise<Cart[]> {
    const where = userId
      ? { user: { id: userId }, checkout: IsNull() }
      : { sessionId, checkout: IsNull() };
    const carts = await this.cartRepository.findBy(where);
    if (!carts || carts.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "No items in cart to checkout",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return carts;
  }

  private async createCustomerForCheckout(
    user: User | undefined,
    data: CheckoutData,
    queryRunner: QueryRunner,
  ): Promise<Customer> {
    if (user) {
      return await this.customerManagementService.findOrCreateCustomer(
        user,
        data as InitializeTransaction | PlaceOrderDto,
        queryRunner,
      );
    } else {
      return await this.customerManagementService.findOrCreateGuestCustomer(
        data as GuestInitializeTransactionDto | GuestPlaceOrderDto,
        queryRunner,
      );
    }
  }

  private async getDeliveryCostForCheckout(
    userId: string | undefined,
    sessionId: string | undefined,
    location: DeliveryLocation,
  ): Promise<number> {
    if (userId) {
      return await this.deliveryCostService.getDeliveryCost(userId, location);
    } else {
      return await this.deliveryCostService.getGuestDeliveryCost({
        sessionId,
        ...location,
      });
    }
  }

  private async processCheckout(
    carts: Cart[],
    customer: Customer,
    deliveryCost: number,
    isPlaceOrder: boolean,
    queryRunner: QueryRunner,
    paymentInitData?: { user?: User; email?: string },
    guestEmail?: string,
  ): Promise<{ checkout: Checkout; response?: unknown }> {
    const productTotal = await this.calculateCartAmount(carts);
    const totalAmount =
      deliveryCost === -1 ? productTotal : productTotal + deliveryCost;
    const sale = await this.createSale(customer, carts, queryRunner);
    if (isPlaceOrder) {
      sale.orderStatus = OrderStatus.PENDING;
      sale.paymentStatus = PaymentStatus.INVOICE_REQUESTED;
      await queryRunner.manager.save(sale);
    }
    const checkout = await this.createCheckout(sale, totalAmount, queryRunner);
    if (guestEmail) {
      checkout.guestEmail = guestEmail;
      await queryRunner.manager.save(checkout);
    }
    await this.linkCartsToCheckout(carts, checkout, queryRunner);
    let response: unknown;
    if (!isPlaceOrder && paymentInitData) {
      if (paymentInitData.user) {
        response = await this.paymentService.initializePaystack(
          checkout,
          paymentInitData.user,
          totalAmount,
        );
      } else {
        response = await this.paymentService.initializeGuestPaystack(
          checkout,
          paymentInitData.email,
          totalAmount,
        );
      }
      const paystackResponse = response as PaystackApiResponse;
      checkout.paystackReference = paystackResponse.data.data.reference;
      await queryRunner.manager.save(checkout);
    }
    return {
      checkout,
      response: response ? (response as PaystackApiResponse).data : undefined,
    };
  }

  private async processPaymentForOrder(
    checkout: Checkout,
    paymentInitData: { user?: User; email?: string },
  ): Promise<unknown> {
    const response = paymentInitData.user
      ? await this.paymentService.initializePaystack(
          checkout,
          paymentInitData.user,
          Number(checkout.amount),
        )
      : await this.paymentService.initializeGuestPaystack(
          checkout,
          paymentInitData.email,
          Number(checkout.amount),
        );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const paystackResponse = response as PaystackApiResponse;
      checkout.paystackReference = paystackResponse.data.data.reference;
      checkout.sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
      await queryRunner.manager.save(checkout.sale);
      await queryRunner.manager.save(checkout);
      await queryRunner.commitTransaction();
    } catch (saveError) {
      await queryRunner.rollbackTransaction();
      throw saveError;
    } finally {
      await queryRunner.release();
    }
    return (response as PaystackApiResponse).data;
  }

  private async sendOrderNotifications(checkout: Checkout): Promise<void> {
    // Fetch full checkout with relations
    const fullCheckout = await this.checkoutRepository.findOne({
      where: { id: checkout.id },
      relations: [
        "sale",
        "sale.customer",
        "sale.customer.user",
        "carts",
        "carts.product",
      ],
    });

    if (!fullCheckout) return;

    const { sale, carts } = fullCheckout;
    const customer = sale.customer;
    const isGuest = !customer.user;

    const orderItems = carts.map(cart => ({
      name: cart.product.name,
      quantity: cart.quantity,
      unitPrice: cart.product.retail.toFixed(2),
      total: (cart.product.retail * cart.quantity).toFixed(2),
    }));

    const deliveryAddress = customer.address
      ? `${customer.address}, ${customer.city}, ${customer.region}, ${customer.country}`
      : undefined;

    const orderData = {
      orderId: sale.id,
      orderDate: sale.createdAt.toLocaleDateString(),
      orderStatus: sale.orderStatus,
      paymentStatus: sale.paymentStatus,
      totalAmount: checkout.amount.toFixed(2),
      customerName: customer.name,
      customerEmail: customer.email || checkout.guestEmail || "",
      customerPhone: customer.phone || customer.phoneNumber,
      deliveryAddress,
      customerType: isGuest ? "Guest" : "Registered User",
      orderItems,
    };

    const subject = isGuest ? "New Guest Order Received" : "New Order Received";

    await this.notificationService.sendAdminOrderNotification(
      orderData,
      subject,
    );
  }
}
