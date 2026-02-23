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
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";
import { formatStatus } from "../utils/status-formatter.util";

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
    private readonly dataSource: DataSource,
  ) {}

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    return this.executeInTransaction(async queryRunner => {
      const sale = await queryRunner.manager.findOne(Sale, {
        where: { id: saleId, deletedAt: IsNull() },
        relations: ["customer"],
      });
      if (!sale) {
        throw new NotFoundException(`Sale with ID "${saleId}" not found`);
      }

      // Prevent editing if already paid or beyond
      if (
        [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(
          sale.orderStatus,
        )
      ) {
        throw new BadRequestException(
          "Cannot edit sale that has been delivered or in transit",
        );
      }

      // Store old line items to handle stock adjustments
      const oldLineItems = [...sale.lineItems];

      const savedSale = await this.updateSaleDetails(
        sale,
        updateDto,
        oldLineItems,
        queryRunner,
      );

      // Send status update email to customer if status was updated (outside transaction)
      await this.sendStatusUpdateEmail(savedSale, updateDto);

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

    // Auto-transition from AWAITING_DELIVERY to PENDING_PAYMENT when delivery fee is set
    const wasAwaitingDelivery =
      sale.paymentStatus === PaymentStatus.AWAITING_DELIVERY;
    if (wasAwaitingDelivery) {
      sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
    }

    await this.saleRepository.save(sale);

    // Calculate total for email notification
    const productTotal = Number(sale.amount ?? 0);
    const newTotalAmount = productTotal + dto.deliveryCost;

    // Send notification email
    const customer = sale.customer;
    const user = customer?.user;
    const email = user?.email || sale.checkout?.guestEmail || customer?.email;
    const name = customer?.name || "Valued Customer";

    if (email) {
      if (wasAwaitingDelivery) {
        // Special email for international orders
        await this.notificationService.sendEmail(
          `Great news! The delivery cost for your order has been calculated. Delivery Fee: GHS ${dto.deliveryCost.toFixed(2)}. Total Amount: GHS ${newTotalAmount.toFixed(2)}. You can now proceed to payment.`,
          email,
          "Delivery Fee Calculated - Ready for Payment",
          name,
          `${process.env.FRONTEND_URL}/track-order/${sale.id}`,
          "Pay Now",
          "Pay Now",
        );
      } else {
        await this.notificationService.sendEmail(
          `The delivery cost for your order has been updated to GHS ${dto.deliveryCost.toFixed(2)}. Your new total amount is GHS ${newTotalAmount.toFixed(2)}.`,
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

    return transformSaleToResponseDto(sale);
  }

  private async sendStatusUpdateEmail(
    savedSale: Sale,
    updateDto: UpdateSaleDto,
  ): Promise<void> {
    if (updateDto.orderStatus || updateDto.paymentStatus) {
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
}
