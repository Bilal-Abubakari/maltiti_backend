import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Checkout } from "../entities/Checkout.entity";
import { Sale } from "../entities/Sale.entity";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { NotificationService } from "../notification/notification.service";
import { PaymentService } from "./payment.service";
import { NotificationTopic } from "../enum/notification-topic.enum";

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

      // Check if payment is already marked as paid (idempotency)
      if (checkout.sale.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `Payment already confirmed for sale: ${saleId}. Returning existing checkout.`,
        );
        return checkout;
      }

      // Verify payment using the payment reference from the sale
      if (!checkout.sale.paymentReference) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "Payment reference not found for this sale",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.paymentService.verifyPayment(checkout.sale.paymentReference);
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

      // Check if payment is already marked as paid (idempotency)
      if (checkout.sale.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `Payment already confirmed for guest sale: ${saleId}. Returning existing checkout.`,
        );
        return checkout;
      }

      // Verify payment using the payment reference from the sale
      if (!checkout.sale.paymentReference) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "Payment reference not found for this sale",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.paymentService.verifyPayment(checkout.sale.paymentReference);
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
    const oldOrderStatus = sale.orderStatus;
    const oldPaymentStatus = sale.paymentStatus;
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
      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_STATUS_UPDATED,
        {
          topic: NotificationTopic.ORDER_STATUS_UPDATED,
          userId: user.id,
          title: "Order Status Updated",
          message,
          orderId: sale.id,
          oldStatus: oldOrderStatus,
          newStatus: orderStatus || oldOrderStatus,
          paymentStatus: paymentStatus || oldPaymentStatus,
        },
      );
    }
    return await this.saleRepository.save(sale);
  }
}
