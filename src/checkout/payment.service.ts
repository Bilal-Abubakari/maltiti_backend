import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import {
  IInitializeTransactionData,
  IInitializeTransactionResponse,
  PaymentInitializationApiResponse,
} from "../interfaces/payment.interface";
import { Sale } from "../entities/Sale.entity";
import { Checkout } from "../entities/Checkout.entity";
import { PaymentStatus } from "../enum/payment-status.enum";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    private readonly notificationService: NotificationService,
  ) {}

  public async initializePayment(
    saleId: string,
    reference: string,
    email: string,
    totalAmount: number,
  ): Promise<PaymentInitializationApiResponse> {
    try {
      const response = await axios.post<
        IInitializeTransactionResponse<IInitializeTransactionData>
      >(
        `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          amount: Math.round(totalAmount * 100),
          email,
          reference,
          callback_url: `${process.env.FRONTEND_URL}/confirm-payment/${saleId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to initialize payment with Paystack: ${error.message}`,
      );
      throw new BadRequestException(
        `Payment initialization failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async verifyPayment(reference: string): Promise<void> {
    try {
      const response = await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      if (response.data?.data?.status !== "success") {
        throw new BadRequestException(
          `Payment verification failed: Payment status is ${response.data?.data?.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to verify payment with Paystack: ${error.message}`,
      );
      throw new BadRequestException(
        `Payment verification failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async refundPayment(
    reference: string,
    amount?: number,
  ): Promise<void> {
    const refundData: { transaction: string; amount?: number } = {
      transaction: reference,
    };

    if (amount !== undefined) {
      refundData.amount = Math.round(amount * 100);
    }

    try {
      await axios.post(`${process.env.PAYSTACK_BASE_URL}/refund`, refundData, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });
      const refundAmount = amount ? ` for amount ${amount}` : "";
      this.logger.log(
        `Refund initiated for reference ${reference}${refundAmount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process refund for reference ${reference}: ${error.message}`,
      );
      throw new BadRequestException(
        `Refund failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async verifyAndMarkPaid(reference: string): Promise<void> {
    try {
      // Find the sale by payment reference
      const sale = await this.saleRepository.findOne({
        where: { paymentReference: reference },
        relations: ["customer", "customer.user", "checkout"],
      });

      if (!sale) {
        this.logger.warn(
          `Sale not found for payment reference: ${reference}. Ignoring webhook.`,
        );
        return;
      }

      // Check if payment is already marked as paid (idempotency)
      if (sale.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `Payment already marked as paid for reference: ${reference}. Skipping.`,
        );
        return;
      }

      // Verify the payment with Paystack using the payment reference
      await this.verifyPayment(reference);

      // Mark the sale as paid
      sale.paymentStatus = PaymentStatus.PAID;
      await this.saleRepository.save(sale);

      this.logger.log(
        `Payment marked as paid for sale: ${sale.id} (reference: ${reference})`,
      );

      // Send confirmation email
      const checkout = sale.checkout;
      const email =
        checkout?.guestEmail ||
        sale.customer?.email ||
        sale.customer?.user?.email;
      const name =
        sale.customer?.name || sale.customer?.user?.name || "Customer";

      if (email) {
        if (checkout?.guestEmail) {
          // Guest checkout
          await this.notificationService.sendEmail(
            `Your payment has been received, your order is already in progress. Your Order ID is ${sale.id}. You can track your order anytime using this ID and your email address.`,
            email,
            "Payment Confirmation",
            name,
            `${process.env.FRONTEND_URL}/track-order/${sale.id}`,
            "Track Order",
            "Track Order",
          );
        } else if (sale.customer?.user) {
          // Authenticated user
          await this.notificationService.sendEmail(
            "Your payment has been received, your order is already in progress",
            email,
            "Payment Confirmation",
            name,
            process.env.APP_URL,
            "Go",
            "Go",
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to verify and mark payment as paid for reference ${reference}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to verify payment: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async handleRefund(transactionReference: string): Promise<void> {
    try {
      this.logger.log(
        `Processing refund for reference: ${transactionReference}`,
      );

      // Find the sale by payment reference (which is the transaction reference in this context)
      const sale = await this.saleRepository.findOne({
        where: { paymentReference: transactionReference },
        relations: ["customer", "customer.user", "checkout"],
      });

      if (!sale) {
        this.logger.warn(
          `Sale not found for transaction reference: ${transactionReference}. Ignoring refund webhook.`,
        );
        return;
      }

      // Check if payment is already marked as refunded (idempotency)
      if (sale.paymentStatus === PaymentStatus.REFUNDED) {
        this.logger.log(
          `Payment already marked as refunded for reference: ${transactionReference}. Skipping.`,
        );
        return;
      }

      // Mark the sale as refunded
      sale.paymentStatus = PaymentStatus.REFUNDED;
      await this.saleRepository.save(sale);

      this.logger.log(
        `Payment marked as refunded for sale: ${sale.id} (reference: ${transactionReference})`,
      );

      // Send refund notification email
      const checkout = sale.checkout;
      const email =
        checkout?.guestEmail ||
        sale.customer?.email ||
        sale.customer?.user?.email;
      const name =
        sale.customer?.name || sale.customer?.user?.name || "Customer";

      if (email) {
        await this.notificationService.sendEmail(
          `Your refund for order ${sale.id} has been processed successfully. The funds should appear in your account within 7-12 business days depending on your bank.`,
          email,
          "Refund Processed",
          name,
          process.env.APP_URL,
          "Go to Dashboard",
          "Go to Dashboard",
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process refund for reference ${transactionReference}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to process refund: ${error.message}`,
      );
    }
  }
}
