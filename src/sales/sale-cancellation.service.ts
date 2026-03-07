import {
  BadRequestException,
  Injectable,
  Logger,
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
import { NotificationIntegrationService } from "../notification/notification-integration.service";

@Injectable()
export class SaleCancellationService {
  private readonly logger = new Logger(SaleCancellationService.name);
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly stockManagementService: StockManagementService,
    private readonly notificationService: NotificationService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
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

    // Send cancellation notifications
    try {
      const adminUserIds = await this.notificationService.getAdminUserIds();
      const currentCustomerName =
        sale.customer?.name || sale.customer?.user?.name || "Customer";

      await this.notificationIntegrationService.notifyOrderCancelled(
        sale.customer?.user?.id || "",
        sale.id,
        reason || "Customer request",
        cancellationResult.refundAmount,
        "customer",
        adminUserIds,
        currentCustomerName,
      );

      // Send admin cancellation email
      const customerEmail =
        sale.checkout?.guestEmail ||
        sale.customer?.email ||
        sale.customer?.user?.email;

      await this.notificationService.sendAdminOrderCancellationNotification({
        orderId: sale.id,
        customerName: currentCustomerName,
        customerEmail: customerEmail || "No email provided",
        cancellationReason: reason || "Customer request",
        refundAmount: cancellationResult.refundAmount,
        penaltyAmount: cancellationResult.penaltyAmount,
        refundProcessed: cancellationResult.refundProcessed,
        cancelledBy: "customer",
      });

      // Send cancellation email to customer
      if (customerEmail) {
        const refundText = cancellationResult.refundProcessed
          ? "Refund of GHS " +
            cancellationResult.refundAmount.toFixed(2) +
            " has been processed."
          : "";
        await this.notificationService.sendEmail(
          `Your order has been cancelled successfully. ${refundText}`,
          customerEmail,
          "Order Cancelled",
          currentCustomerName,
          process.env.APP_URL,
          "Go",
          "Go",
        );
      }
    } catch (error) {
      // Don't fail the cancellation if notification fails
      this.logger.error(
        `Failed to send cancellation notification for sale ${saleId}: ${error.message}`,
      );
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

    if (
      [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(sale.orderStatus)
    ) {
      throw new BadRequestException(
        "Cannot cancel an order in transit or delivered",
      );
    }

    const cancellationResult = await this.calculateRefundForAdmin(
      sale,
      waivePenalty,
    );

    // Return stock for any batches that were allocated
    await this.stockManagementService.returnStock(sale.lineItems);

    // Mark sale as cancelled
    sale.orderStatus = OrderStatus.CANCELLED;
    if (cancellationResult.refundProcessed) {
      sale.paymentStatus = PaymentStatus.REFUNDED;
    }

    const savedSale = await this.saleRepository.save(sale);

    await this.sendAdminCancellationNotifications(
      sale,
      reason,
      cancellationResult.refundAmount,
      cancellationResult.penaltyAmount,
      cancellationResult.refundProcessed,
      saleId,
      cancellationResult.message,
    );

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

  public async cancelSale(saleId: string): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "customer.user", "checkout"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Return stock for any batches that were allocated (since stock is deducted immediately)
    await this.stockManagementService.returnStock(sale.lineItems);

    sale.deletedAt = new Date();
    sale.orderStatus = OrderStatus.CANCELLED;
    const savedSale = await this.saleRepository.save(sale);

    // Send notifications
    try {
      const adminUserIds = await this.notificationService.getAdminUserIds();
      const currentCustomerName =
        sale.customer?.name || sale.customer?.user?.name || "Customer";
      const customerUserId = sale.customer?.user?.id || "";

      // Notify through integration service (handles in-app for both/either)
      await this.notificationIntegrationService.notifyOrderCancelled(
        customerUserId,
        sale.id,
        "Order deleted/cancelled by system/admin",
        sale.amount,
        "admin",
        adminUserIds,
        currentCustomerName,
      );

      // Send admin cancellation email
      const customerEmail =
        sale.checkout?.guestEmail ||
        sale.customer?.email ||
        sale.customer?.user?.email;

      await this.notificationService.sendAdminOrderCancellationNotification({
        orderId: sale.id,
        customerName: currentCustomerName,
        customerEmail: customerEmail || "No email provided",
        cancellationReason: "Order deleted/cancelled by system/admin",
        refundAmount: sale.amount,
        cancelledBy: "admin",
      });

      // Send email to customer
      if (customerEmail) {
        await this.notificationService.sendEmail(
          `Your order #${saleId} has been cancelled and removed from our active records.`,
          customerEmail,
          "Order Cancelled",
          currentCustomerName,
          process.env.APP_URL || process.env.FRONTEND_URL,
          "Go",
          "Go",
        );
      }
    } catch (error) {
      // Don't fail the deletion if notification fails
      this.logger.error(
        `Failed to send cancellation notification for sale ${saleId}: ${error.message}`,
      );
    }

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
    let message: string;

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

  private async calculateRefundForAdmin(
    sale: Sale,
    waivePenalty: boolean,
  ): Promise<{
    message: string;
    refundAmount?: number;
    penaltyAmount?: number;
    refundProcessed: boolean;
  }> {
    const { paymentStatus } = sale;
    const totalAmount =
      Number(sale.amount ?? 0) + Number(sale.deliveryFee ?? 0);

    let refundAmount = 0;
    let penaltyAmount = 0;
    let refundProcessed = false;
    let message: string;

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

    return { message, refundAmount, penaltyAmount, refundProcessed };
  }

  private async sendAdminCancellationNotifications(
    sale: Sale,
    reason: string | undefined,
    refundAmount: number | undefined,
    penaltyAmount: number | undefined,
    refundProcessed: boolean,
    saleId: string,
    message: string,
  ): Promise<void> {
    // Send cancellation notifications
    try {
      const adminUserIds = await this.notificationService.getAdminUserIds();
      const currentCustomerName =
        sale.customer?.name || sale.customer?.user?.name || "Customer";

      await this.notificationIntegrationService.notifyOrderCancelled(
        sale.customer?.user?.id || "",
        sale.id,
        reason || "Admin action",
        refundAmount,
        "admin",
        adminUserIds,
        currentCustomerName,
      );

      // Send admin cancellation email
      const saleEmail =
        sale.checkout?.guestEmail ||
        sale.customer?.email ||
        sale.customer?.user?.email;

      await this.notificationService.sendAdminOrderCancellationNotification({
        orderId: sale.id,
        customerName: currentCustomerName,
        customerEmail: saleEmail || "No email provided",
        cancellationReason: reason || "Admin action",
        refundAmount,
        penaltyAmount,
        refundProcessed,
        cancelledBy: "admin",
      });

      // Send cancellation email to customer
      if (saleEmail) {
        const reasonText = reason ? ` Reason: ${reason}` : "";
        await this.notificationService.sendEmail(
          `Your order #${saleId} has been cancelled by our team. ${message}${reasonText}`,
          saleEmail,
          "Order Cancelled",
          currentCustomerName,
          process.env.FRONTEND_URL || process.env.APP_URL,
          "Browse Products",
          "Browse Products",
        );
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error("Failed to send cancellation notification:", error);
    }
  }
}
