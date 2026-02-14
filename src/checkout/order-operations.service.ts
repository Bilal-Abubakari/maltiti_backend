import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { Cart } from "../entities/Cart.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { UpdateDeliveryCostDto } from "../dto/checkout.dto";
import { NotificationService } from "../notification/notification.service";
import { PaymentService } from "./payment.service";

@Injectable()
export class OrderOperationsService {
  private readonly logger = new Logger("OrderOperationsService");

  constructor(
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentService,
  ) {}

  public async confirmPayment(
    userId: string,
    saleId: string,
  ): Promise<Checkout> {
    try {
      const checkout = await this.checkoutRepository.findOne({
        where: { sale: { id: saleId } },
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
      if (checkout.sale.customer.user.id !== userId) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: "You are not authorized to confirm this payment",
          },
          HttpStatus.FORBIDDEN,
        );
      }
      await this.paymentService.verifyPayment(saleId);
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

  public async confirmGuestPayment(saleId: string): Promise<Checkout> {
    try {
      const checkout = await this.checkoutRepository.findOne({
        where: { sale: { id: saleId } },
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
      await this.paymentService.verifyPayment(saleId);
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
      console.log("Error confirming guest payment:", error);
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
        await this.paymentService.refundPayment(
          order.paystackReference || `${user?.id}=${id}`,
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
      await this.notificationService.sendEmail(
        `${user.name} has cancelled the order with id ${order.id}`,
        [
          "bilal.abubakari@maltitiaenterprise.com",
          "mohammed.abubakari@maltitiaenterprise.com",
        ],
        "Order Cancelled",
        user.name,
        process.env.ADMIN_URL,
        "Go",
        "Go",
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
  private async calculateCartAmount(carts: Cart[]): Promise<number> {
    let totalAmount = 0;
    for (const cart of carts) {
      const product = cart.product;
      const itemTotal = product.retail * cart.quantity;
      totalAmount += itemTotal;
    }
    return Number(totalAmount.toFixed(2));
  }
}
