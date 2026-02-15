import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { StockManagementService } from "./stock-management.service";
import { NotificationService } from "../notification/notification.service";
import { PaymentService } from "../checkout/payment.service";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";

@Injectable()
export class SaleCancellationService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly stockManagementService: StockManagementService,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentService,
  ) {}

  public async cancelSaleByCustomer(
    saleId: string,
    email: string,
    reason?: string,
  ): Promise<{
    sale: SaleResponseDto;
    message: string;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed?: boolean;
  }> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "customer.user", "checkout"],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Verify email matches
    const saleEmail =
      sale.checkout?.guestEmail ||
      sale.customer?.email ||
      sale.customer?.user?.email;

    if (saleEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException(
        "Email does not match the order. Please contact support.",
      );
    }

    // Check if already cancelled
    if (sale.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException("This order has already been cancelled");
    }

    const cancellationResult = await this.processCustomerCancellation(sale);

    // Return stock for any batches that were allocated
    await this.stockManagementService.returnStock(sale.lineItems);

    // Mark sale as cancelled
    sale.orderStatus = OrderStatus.CANCELLED;
    if (cancellationResult.refundProcessed) {
      sale.paymentStatus = PaymentStatus.REFUNDED;
    }

    const savedSale = await this.saleRepository.save(sale);

    // Send cancellation email
    const customerName =
      sale.customer?.name || sale.customer?.user?.name || "Valued Customer";
    const reasonText = reason ? ` Reason: ${reason}` : "";
    await this.notificationService.sendEmail(
      `Your order #${saleId} has been cancelled. ${cancellationResult.message}${reasonText}`,
      saleEmail,
      "Order Cancelled",
      customerName,
      process.env.FRONTEND_URL || process.env.APP_URL,
      "Browse Products",
      "Browse Products",
    );

    // Send admin notification
    try {
      await this.notificationService.sendAdminOrderCancellationNotification({
        orderId: saleId,
        customerName,
        customerEmail: saleEmail,
        cancellationReason: reason,
        refundAmount: cancellationResult.refundAmount,
        penaltyAmount: cancellationResult.penaltyAmount,
        refundProcessed: cancellationResult.refundProcessed,
        cancelledBy: "customer",
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error("Failed to send admin cancellation notification:", error);
    }

    return {
      sale: transformSaleToResponseDto(savedSale),
      message: cancellationResult.message,
      refundAmount:
        cancellationResult.refundAmount > 0
          ? cancellationResult.refundAmount
          : undefined,
      penaltyAmount:
        cancellationResult.penaltyAmount > 0
          ? cancellationResult.penaltyAmount
          : undefined,
      refundProcessed: cancellationResult.refundProcessed,
    };
  }

  public async cancelSaleByAdmin(
    saleId: string,
    waivePenalty: boolean,
    reason?: string,
  ): Promise<{
    sale: SaleResponseDto;
    message: string;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed?: boolean;
  }> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "customer.user", "checkout"],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Check if already cancelled
    if (sale.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException("This order has already been cancelled");
    }

    const { paymentStatus } = sale;
    const totalAmount =
      Number(sale.amount ?? 0) + Number(sale.deliveryFee ?? 0);

    let refundAmount = 0;
    let penaltyAmount = 0;
    let refundProcessed = false;
    let message;

    // If payment was made, process refund
    if (paymentStatus === PaymentStatus.PAID) {
      if (waivePenalty) {
        // Full refund
        refundAmount = totalAmount;
        message = "Order cancelled by admin. Full refund processed.";
      } else {
        // 10% penalty applies
        penaltyAmount = totalAmount * 0.1;
        refundAmount = totalAmount - penaltyAmount;
        message = `Order cancelled by admin with 10% cancellation fee. Refund of GHS ${refundAmount.toFixed(2)} processed.`;
      }

      if (sale.paymentReference) {
        await this.paymentService.refundPayment(
          sale.paymentReference,
          refundAmount,
        );
        refundProcessed = true;
      }
    } else {
      message = "Order cancelled by admin.";
    }

    // Return stock for any batches that were allocated
    await this.stockManagementService.returnStock(sale.lineItems);

    // Mark sale as cancelled
    sale.orderStatus = OrderStatus.CANCELLED;
    if (refundProcessed) {
      sale.paymentStatus = PaymentStatus.REFUNDED;
    }

    const savedSale = await this.saleRepository.save(sale);

    // Send cancellation email to customer
    const saleEmail =
      sale.checkout?.guestEmail ||
      sale.customer?.email ||
      sale.customer?.user?.email;
    const customerName =
      sale.customer?.name || sale.customer?.user?.name || "Valued Customer";

    if (saleEmail) {
      const reasonText = reason ? ` Reason: ${reason}` : "";
      await this.notificationService.sendEmail(
        `Your order #${saleId} has been cancelled by our team. ${message}${reasonText}`,
        saleEmail,
        "Order Cancelled",
        customerName,
        process.env.FRONTEND_URL || process.env.APP_URL,
        "Browse Products",
        "Browse Products",
      );
    }

    return {
      sale: transformSaleToResponseDto(savedSale),
      message,
      refundAmount: refundAmount > 0 ? refundAmount : undefined,
      penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
      refundProcessed,
    };
  }

  public async cancelSale(saleId: string): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Return stock for any batches that were allocated (since stock is deducted immediately)
    await this.stockManagementService.returnStock(sale.lineItems);

    sale.deletedAt = new Date();
    const savedSale = await this.saleRepository.save(sale);
    return transformSaleToResponseDto(savedSale);
  }

  private async processCustomerCancellation(sale: Sale): Promise<{
    message: string;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed: boolean;
  }> {
    // Business rules for customer cancellation
    const { orderStatus, paymentStatus } = sale;

    // Calculate total order amount
    const totalAmount =
      Number(sale.amount ?? 0) + Number(sale.deliveryFee ?? 0);

    let refundAmount = 0;
    let penaltyAmount = 0;
    let refundProcessed = false;
    let message;

    // Rule 1: Pending + Paid = Full refund
    if (
      orderStatus === OrderStatus.PENDING &&
      paymentStatus === PaymentStatus.PAID
    ) {
      refundAmount = totalAmount;
      message =
        "Order cancelled successfully. Full refund will be processed within 7-12 business days.";

      if (sale.paymentReference) {
        await this.paymentService.refundPayment(
          sale.paymentReference,
          refundAmount,
        );
        refundProcessed = true;
      }
    }
    // Rule 2: Processing/Packaging + Paid = 10% penalty
    else if (
      orderStatus === OrderStatus.PACKAGING &&
      paymentStatus === PaymentStatus.PAID
    ) {
      penaltyAmount = totalAmount * 0.1;
      refundAmount = totalAmount - penaltyAmount;
      message = `Order cancelled with 10% cancellation fee. Refund of GHS ${refundAmount.toFixed(2)} will be processed within 7-12 business days.`;

      if (sale.paymentReference) {
        // Refund the adjusted amount (total - penalty)
        await this.paymentService.refundPayment(
          sale.paymentReference,
          refundAmount,
        );
        refundProcessed = true;
      }
    }
    // Rule 3: Pending without payment = Simple cancellation
    else if (
      orderStatus === OrderStatus.PENDING &&
      paymentStatus !== PaymentStatus.PAID
    ) {
      message = "Order cancelled successfully.";
    }
    // Rule 4: Other cases = Cannot cancel
    else {
      throw new BadRequestException(
        "Cannot cancel order at this stage. Please contact customer support for assistance.",
      );
    }

    return { message, refundAmount, penaltyAmount, refundProcessed };
  }
}
