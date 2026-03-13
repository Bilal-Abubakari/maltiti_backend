import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, DataSource, QueryRunner } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Product } from "../entities/Product.entity";
import { UpdateSaleDto } from "../dto/sales/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/sales/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { UpdateDeliveryCostDto } from "../dto/checkout.dto";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { StockManagementService } from "./stock-management.service";
import { LineItemManagementService } from "./line-item-management.service";
import { NotificationService } from "../notification/notification.service";
import { NotificationIntegrationService } from "../notification/notification-integration.service";
import { SaleDocumentEmailService } from "./sale-document-email.service";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";
import { formatStatus } from "../utils/status-formatter.util";
import { NotificationTopic } from "../enum/notification-topic.enum";
import {
  calculateServiceFee,
  calculateGrandTotal,
} from "../utils/payment-fee.util";

@Injectable()
export class SaleUpdateService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly stockManagementService: StockManagementService,
    private readonly lineItemManagementService: LineItemManagementService,
    private readonly notificationService: NotificationService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
    private readonly saleDocumentEmailService: SaleDocumentEmailService,
    private readonly dataSource: DataSource,
  ) {}

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.executeInTransaction(async queryRunner => {
      const sale = await queryRunner.manager.findOne(Sale, {
        where: { id: saleId, deletedAt: IsNull() },
        relations: ["customer", "customer.user"],
      });
      if (!sale) {
        throw new NotFoundException(`Sale with ID "${saleId}" not found`);
      }

      // Prevent editing if already paid or in transit
      if (
        [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(
          sale.orderStatus,
        )
      ) {
        throw new BadRequestException(
          "Cannot edit sale that has been delivered or in transit",
        );
      }

      // Store old statuses for notifications
      const oldOrderStatus = sale.orderStatus;

      // Store old line items to handle stock adjustments
      const oldLineItems = [...sale.lineItems];

      const savedSale = await this.updateSaleDetails(
        sale,
        updateDto,
        oldLineItems,
        queryRunner,
      );

      // Send a status update email to the customer if the status was updated (outside transaction)
      await this.sendStatusUpdateNotifications(
        savedSale,
        updateDto,
        oldOrderStatus,
      );

      return transformSaleToResponseDto(savedSale);
    });
  }

  public async updateSaleStatus(
    saleId: string,
    updateDto: UpdateSaleStatusDto,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    const { orderStatus, paymentStatus } = updateDto;

    this.validateStatusChange(sale, orderStatus, paymentStatus);

    if (orderStatus) {
      sale.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      sale.paymentStatus = paymentStatus;
    }

    const savedSale = await this.saleRepository.save(sale);

    // Send invoice or receipt email based on the new payment status
    await this.sendDocumentEmailOnStatusChange(savedSale, paymentStatus);

    // Send status update email to customer
    try {
      await this.notificationService.sendOrderStatusUpdateEmail(
        savedSale.customer.email,
        savedSale.customer.name,
        savedSale.id,
        formatStatus(savedSale.orderStatus),
        savedSale.paymentStatus
          ? formatStatus(savedSale.paymentStatus)
          : undefined,
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error("Failed to send status update email:", error);
    }

    // Send in-app notification
    try {
      const customer = await this.saleRepository
        .createQueryBuilder("sale")
        .leftJoinAndSelect("sale.customer", "customer")
        .leftJoinAndSelect("customer.user", "user")
        .where("sale.id = :saleId", { saleId })
        .getOne();

      if (customer?.customer.user?.id) {
        const oldStatus = updateDto.orderStatus
          ? "Previous Status"
          : savedSale.orderStatus;
        await this.notificationIntegrationService.notifyOrderStatusUpdated(
          customer.customer.user.id,
          savedSale.id,
          oldStatus,
          formatStatus(savedSale.orderStatus),
          savedSale.paymentStatus
            ? formatStatus(savedSale.paymentStatus)
            : undefined,
        );

        // Special notification for delivery
        if (savedSale.orderStatus === OrderStatus.DELIVERED) {
          await this.notificationIntegrationService.notifyOrderDelivered(
            customer.customer.user.id,
            savedSale.id,
          );
        }
      }
    } catch (error) {
      console.error("Failed to send in-app status update notification:", error);
    }

    return transformSaleToResponseDto(savedSale);
  }

  public async addLineItem(
    saleId: string,
    addDto: AddLineItemDto,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent adding if after paid
    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException("Cannot add line items after payment");
    }

    const product = await this.productRepository.findOne({
      where: { id: addDto.productId, deletedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${addDto.productId}" not found`,
      );
    }

    const finalPrice = addDto.customPrice ?? product.retail;
    const newItem: SaleLineItem = {
      ...addDto,
      finalPrice: finalPrice,
    };

    sale.lineItems.push(newItem);

    // Recalculate amount and service fee
    sale.amount = this.calculateSubtotal(sale.lineItems);

    const savedSale = await this.saleRepository.save(sale);
    return transformSaleToResponseDto(savedSale);
  }

  public async assignBatches(
    saleId: string,
    assignDto: AssignBatchesDto,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent assigning if after paid
    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException("Cannot modify batches after payment");
    }

    const itemIndex = sale.lineItems.findIndex(
      item => item.productId === assignDto.productId,
    );
    if (itemIndex === -1) {
      throw new NotFoundException("Line item not found");
    }

    // Store old batch allocations to return stock
    const oldBatchAllocations = sale.lineItems[itemIndex].batchAllocations;

    // Return stock from old batch allocations if they exist
    if (oldBatchAllocations && oldBatchAllocations.length > 0) {
      await this.stockManagementService.returnOldBatchStock(
        oldBatchAllocations,
      );
    }

    // Validate new batch allocations
    await this.stockManagementService.validateNewBatchAllocations(
      assignDto.productId,
      assignDto.batchAllocations,
      sale.lineItems[itemIndex].requestedQuantity,
    );

    // Update batch allocations
    sale.lineItems[itemIndex].batchAllocations = assignDto.batchAllocations;

    // Deduct stock from new batch allocations immediately
    await this.stockManagementService.deductNewBatchStock(
      assignDto.batchAllocations,
    );

    const savedSale = await this.saleRepository.save(sale);
    return transformSaleToResponseDto(savedSale);
  }

  public async confirmDelivery(
    saleId: string,
    confirmed: boolean,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "checkout"],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    sale.confirmedDeliveryDate = confirmed ? new Date() : null;
    const savedSale = await this.saleRepository.save(sale);

    return transformSaleToResponseDto(savedSale);
  }

  public async updateDeliveryCost(
    saleId: string,
    dto: UpdateDeliveryCostDto,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "customer.user", "checkout"],
    });
    if (!sale) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: "Sale not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Allow updating delivery cost for AWAITING_DELIVERY, INVOICE_REQUESTED, and PENDING_PAYMENT
    if (
      sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT &&
      sale.paymentStatus !== PaymentStatus.AWAITING_DELIVERY
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Cannot update delivery cost for order with payment status: ${sale.paymentStatus}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update Sale with delivery fee
    sale.deliveryFee = dto.deliveryCost;

    // Recalculate service fee based on the new subtotal (product total + delivery fee)
    const subtotal = Number(sale.amount ?? 0) + dto.deliveryCost;
    const { totalServiceFee } = calculateServiceFee(subtotal);
    sale.serviceFee = totalServiceFee;

    // Auto-transition from AWAITING_DELIVERY to PENDING_PAYMENT when delivery fee is set
    const wasAwaitingDelivery =
      sale.paymentStatus === PaymentStatus.AWAITING_DELIVERY;
    if (wasAwaitingDelivery) {
      sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
    }

    await this.saleRepository.save(sale);

    // Calculate total for email notification (includes service fee)
    const productTotal = Number(sale.amount ?? 0);
    const newTotalAmount = calculateGrandTotal(
      productTotal,
      dto.deliveryCost,
      totalServiceFee,
    );

    const userId = sale.customer?.user?.id;

    // Send in-app notification if customer user exists
    if (userId) {
      await this.notificationIntegrationService.notifyOrderDeliveryCostUpdated(
        userId,
        sale.id,
        dto.deliveryCost,
        newTotalAmount,
        wasAwaitingDelivery,
      );
    }

    // Send notification email
    await this.sendDeliveryCostNotifications(
      sale,
      wasAwaitingDelivery,
      newTotalAmount,
    );

    return transformSaleToResponseDto(sale);
  }

  private async sendDocumentEmailOnStatusChange(
    sale: Sale,
    newPaymentStatus: PaymentStatus | undefined,
  ): Promise<void> {
    if (
      newPaymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      newPaymentStatus !== PaymentStatus.PAID
    ) {
      return;
    }

    try {
      // Reload sale with customer relation in case it was not loaded
      const saleWithCustomer = await this.saleRepository.findOne({
        where: { id: sale.id },
        relations: ["customer"],
      });
      if (!saleWithCustomer?.customer) {
        return;
      }
      await this.saleDocumentEmailService.sendDocumentEmailForSale(
        saleWithCustomer,
        saleWithCustomer.customer,
      );
    } catch (error) {
      // Non-fatal — log and continue
      console.error(
        `Failed to send document email on status change for sale ${sale.id}:`,
        error,
      );
    }
  }

  private async sendStatusUpdateNotifications(
    savedSale: Sale,
    updateDto: UpdateSaleDto,
    oldOrderStatus: OrderStatus,
  ): Promise<void> {
    if (updateDto.orderStatus || updateDto.paymentStatus) {
      // Send invoice or receipt email if payment status changed
      await this.sendDocumentEmailOnStatusChange(
        savedSale,
        updateDto.paymentStatus,
      );

      try {
        await this.notificationService.sendOrderStatusUpdateEmail(
          savedSale.customer.email,
          savedSale.customer.name,
          savedSale.id,
          formatStatus(savedSale.orderStatus),
          savedSale.paymentStatus
            ? formatStatus(savedSale.paymentStatus)
            : undefined,
        );
      } catch (error) {
        // Log error but don't fail the operation
        console.error("Failed to send status update email:", error);
      }

      // In-app notification
      try {
        const customer = await this.saleRepository
          .createQueryBuilder("sale")
          .leftJoinAndSelect("sale.customer", "customer")
          .leftJoinAndSelect("customer.user", "user")
          .where("sale.id = :saleId", { saleId: savedSale.id })
          .getOne();

        if (customer?.customer.user?.id) {
          await this.notificationIntegrationService.notifyOrderStatusUpdated(
            customer.customer.user.id,
            savedSale.id,
            oldOrderStatus,
            formatStatus(savedSale.orderStatus),
            savedSale.paymentStatus
              ? formatStatus(savedSale.paymentStatus)
              : undefined,
          );

          // Special notification for delivery
          if (savedSale.orderStatus === OrderStatus.DELIVERED) {
            await this.notificationIntegrationService.notifyOrderDelivered(
              customer.customer.user.id,
              savedSale.id,
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to send in-app status update notification:",
          error,
        );
      }
    }
  }

  private async executeInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async updateSaleDetails(
    sale: Sale,
    updateDto: UpdateSaleDto,
    oldLineItems: SaleLineItem[],
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    if (updateDto.customerId) {
      // Update customer if provided
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { id: updateDto.customerId, deletedAt: IsNull() },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID "${updateDto.customerId}" not found`,
        );
      }
      sale.customer = customer;
    }

    if (updateDto.orderStatus) {
      sale.orderStatus = updateDto.orderStatus;
    }

    if (updateDto.deliveryFee) {
      if (sale.paymentStatus !== PaymentStatus.AWAITING_DELIVERY) {
        throw new BadRequestException(
          "Delivery fee can only be updated if the current payment status is awaiting_delivery",
        );
      }
      sale.deliveryFee = updateDto.deliveryFee;
      // Recalculate service fee based on new subtotal unless explicitly overridden
      if (updateDto.serviceFee === undefined) {
        const subtotal = Number(sale.amount ?? 0) + updateDto.deliveryFee;
        const { totalServiceFee } = calculateServiceFee(subtotal);
        sale.serviceFee = totalServiceFee;
      }
    }

    if (updateDto.serviceFee !== undefined) {
      sale.serviceFee = updateDto.serviceFee;
    }

    if (updateDto.paymentStatus) {
      sale.paymentStatus = updateDto.paymentStatus;
    }

    // Update line items if provided
    if (updateDto.lineItems) {
      await this.lineItemManagementService.updateLineItemsTransactional(
        sale,
        updateDto.lineItems,
        oldLineItems,
        queryRunner,
      );

      // Recalculate amount (subtotal)
      sale.amount = this.calculateSubtotal(sale.lineItems);

      // Recalculate service fee based on new subtotal and current delivery fee
      if (updateDto.serviceFee === undefined) {
        const totalForFee = Number(sale.amount) + Number(sale.deliveryFee ?? 0);
        const { totalServiceFee } = calculateServiceFee(totalForFee);
        sale.serviceFee = totalServiceFee;
      }
    }

    // Validate status changes if any status is being updated (after line items are updated)
    if (updateDto.orderStatus || updateDto.paymentStatus) {
      this.validateStatusChange(
        sale,
        updateDto.orderStatus,
        updateDto.paymentStatus,
      );
    }

    return queryRunner.manager.save(Sale, sale);
  }

  private calculateSubtotal(lineItems: SaleLineItem[]): number {
    return lineItems.reduce((total, item) => {
      const price = item.finalPrice ?? item.customPrice ?? 0;
      return total + price * item.requestedQuantity;
    }, 0);
  }

  private validateStatusChange(
    sale: Sale,
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
  ): void {
    if (
      orderStatus &&
      [
        OrderStatus.PACKAGING,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ].includes(orderStatus)
    ) {
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before changing order status to packaging or beyond",
          );
        }
      }
    }

    if (paymentStatus && paymentStatus === PaymentStatus.PAID) {
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before marking as paid",
          );
        }
      }
    }
  }

  private async sendDeliveryCostNotifications(
    sale: Sale,
    wasAwaitingDelivery: boolean,
    newTotalAmount: number,
  ): Promise<void> {
    const customer = sale.customer;
    const user = customer?.user;
    const email = user?.email || sale.checkout?.guestEmail || customer?.email;
    const name = customer?.name || "Valued Customer";

    if (email) {
      if (wasAwaitingDelivery) {
        // Special email for international orders
        await this.notificationService.sendEmail(
          `Great news! The delivery cost for your order has been calculated. Delivery Fee: GHS ${sale.deliveryFee.toFixed(2)}. Total Amount: GHS ${newTotalAmount.toFixed(2)}. You can now proceed to payment.`,
          email,
          "Delivery Fee Calculated - Ready for Payment",
          name,
          `${process.env.FRONTEND_URL}/track-order/${sale.id}`,
          "Pay Now",
          "Pay Now",
        );
      } else {
        await this.notificationService.sendEmail(
          `The delivery cost for your order has been updated to GHS ${sale.deliveryFee.toFixed(2)}. Your new total amount is GHS ${newTotalAmount.toFixed(2)}.`,
          email,
          "Delivery Cost Updated",
          name,
          user
            ? process.env.APP_URL
            : `${process.env.FRONTEND_URL}/track-order/${sale.id}`,
          "View Order",
          "View Order",
        );
      }
    }

    // Send in-app notification if user exists
    if (user) {
      const title = wasAwaitingDelivery
        ? "Delivery Fee Calculated - Ready for Payment"
        : "Delivery Cost Updated";
      const message = wasAwaitingDelivery
        ? `Great news! The delivery cost for your order has been calculated. Delivery Fee: GHS ${sale.deliveryFee.toFixed(2)}. Total Amount: GHS ${newTotalAmount.toFixed(2)}. You can now proceed to payment.`
        : `The delivery cost for your order has been updated to GHS ${sale.deliveryFee.toFixed(2)}. Your new total amount is GHS ${newTotalAmount.toFixed(2)}.`;

      await this.notificationService.sendInAppNotification(
        NotificationTopic.ORDER_DELIVERY_COST_UPDATED,
        {
          topic: NotificationTopic.ORDER_DELIVERY_COST_UPDATED,
          userId: user.id,
          title,
          message,
          orderId: sale.id,
          deliveryCost: sale.deliveryFee,
          totalAmount: newTotalAmount,
          isReadyForPayment: wasAwaitingDelivery,
        },
      );
    }
  }
}
