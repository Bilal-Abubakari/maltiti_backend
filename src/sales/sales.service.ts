import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, DataSource } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Product } from "../entities/Product.entity";
import { Checkout } from "../entities/Checkout.entity";
import { CreateSaleDto } from "../dto/sales/createSale.dto";
import { UpdateSaleDto } from "../dto/sales/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/sales/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
import { ListSalesByEmailDto } from "../dto/sales/listSalesByEmail.dto";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { GenerateWaybillDto } from "../dto/generateWaybill.dto";
import { SaleResponseDto } from "../dto/sales/saleResponse.dto";
import { OrderStatus } from "../enum/order-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import {
  IInitalizeTransactionData,
  IInitializeTransactionResponse,
  IPagination,
} from "../interfaces/general";
import { StockManagementService } from "./stock-management.service";
import { DocumentGenerationService } from "./document-generation.service";
import { OrderTrackingService } from "./order-tracking.service";
import { SaleQueryService } from "./sale-query.service";
import { transformSaleToResponseDto } from "../utils/sale-mapper.util";
import { LineItemManagementService } from "./line-item-management.service";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Checkout)
    private readonly stockManagementService: StockManagementService,
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly orderTrackingService: OrderTrackingService,
    private readonly saleQueryService: SaleQueryService,
    private readonly lineItemManagementService: LineItemManagementService,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  public async createSale(
    createSaleDto: CreateSaleDto,
  ): Promise<SaleResponseDto> {
    const {
      customerId,
      orderStatus = OrderStatus.PENDING,
      paymentStatus = PaymentStatus.INVOICE_REQUESTED,
      lineItems,
    } = createSaleDto;

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const validatedLineItems: SaleLineItem[] =
      await this.lineItemManagementService.validateLineItems(lineItems);

    await this.stockManagementService.validateAndDeductStock(
      validatedLineItems,
    );

    const sale = this.saleRepository.create({
      customer,
      orderStatus,
      paymentStatus,
      lineItems: validatedLineItems,
    });

    const savedSale = await this.saleRepository.save(sale);
    return transformSaleToResponseDto(savedSale);
  }

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

      const savedSale = await queryRunner.manager.save(Sale, sale);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Send status update email to customer if status was updated (outside transaction)
      if (updateDto.orderStatus || updateDto.paymentStatus) {
        try {
          await this.notificationService.sendOrderStatusUpdateEmail(
            savedSale.customer.email,
            savedSale.customer.name,
            savedSale.id,
            savedSale.orderStatus,
            savedSale.paymentStatus,
          );
        } catch (error) {
          // Log error but don't fail the operation
          console.error("Failed to send status update email:", error);
        }
      }

      return transformSaleToResponseDto(savedSale);
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
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
        savedSale.orderStatus,
        savedSale.paymentStatus,
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error("Failed to send status update email:", error);
    }

    return transformSaleToResponseDto(savedSale);
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

  public async listSales(
    query: ListSalesDto,
  ): Promise<IPagination<SaleResponseDto>> {
    return this.saleQueryService.listSales(query);
  }

  public async listSalesByEmail(
    query: ListSalesByEmailDto,
  ): Promise<IPagination<SaleResponseDto>> {
    return this.saleQueryService.listSalesByEmail(query);
  }

  public async getSaleDetails(saleId: string): Promise<SaleResponseDto> {
    return this.saleQueryService.getSaleDetails(saleId);
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

  public async generateInvoice(
    saleId: string,
    invoiceDto: GenerateInvoiceDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateInvoice(saleId, invoiceDto);
  }

  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateReceipt(saleId, receiptDto);
  }

  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
  ): Promise<Buffer> {
    return this.documentGenerationService.generateWaybill(saleId, waybillDto);
  }

  public async trackOrder(
    saleId: string,
    email: string,
  ): Promise<SaleResponseDto> {
    return this.orderTrackingService.trackOrder(saleId, email);
  }

  public async payForOrder(
    saleId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    return this.orderTrackingService.payForOrder(saleId, email);
  }
}
