import {
  BadRequestException,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import axios from "axios";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Batch } from "../entities/Batch.entity";
import { Product } from "../entities/Product.entity";
import { Checkout } from "../entities/Checkout.entity";
import { CreateSaleDto } from "../dto/sales/createSale.dto";
import { UpdateSaleDto } from "../dto/sales/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/sales/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
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
} from "../interfaces/general";
import { BatchesService } from "../products/batches/batches.service";
import { InvoiceService } from "./invoice.service";
import { ReceiptService } from "./receipt.service";
import { WaybillService } from "./waybill.service";
import { IPagination } from "../interfaces/general";

@Injectable()
export class SalesService {
  private logger = new Logger(SalesService.name);
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Checkout)
    private readonly checkoutRepository: Repository<Checkout>,
    private readonly batchesService: BatchesService,
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
    private readonly waybillService: WaybillService,
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

    // Validate line items
    const validatedLineItems: SaleLineItem[] = [];
    for (const item of lineItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, deletedAt: IsNull() },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID "${item.productId}" not found`,
        );
      }

      let totalAllocated = 0;
      if (item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          const batch = await this.batchRepository.findOne({
            where: {
              id: alloc.batchId,
              product: { id: item.productId },
              deletedAt: IsNull(),
            },
          });
          if (!batch) {
            throw new NotFoundException(
              `Batch with ID "${alloc.batchId}" not found for product`,
            );
          }
          // Validate sufficient quantity in batch
          if (batch.quantity < alloc.quantity) {
            throw new BadRequestException(
              `Insufficient quantity in batch "${batch.batchNumber}". Available: ${batch.quantity}, Requested: ${alloc.quantity}`,
            );
          }
          totalAllocated += alloc.quantity;
        }
      }

      if (totalAllocated > item.requestedQuantity) {
        throw new BadRequestException(
          "Allocated quantity exceeds requested quantity",
        );
      }

      const finalPrice = item.customPrice ?? product.retail;
      validatedLineItems.push({
        ...item,
        finalPrice: finalPrice,
      });
    }

    // Deduct stock immediately when batches are allocated
    await this.validateAndDeductStock(validatedLineItems);

    const sale = this.saleRepository.create({
      customer,
      orderStatus,
      paymentStatus,
      lineItems: validatedLineItems,
    });

    const savedSale = await this.saleRepository.save(sale);
    return this.transformSaleToResponseDto(savedSale);
  }

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent editing if already paid or beyond
    if (
      [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(sale.orderStatus)
    ) {
      throw new BadRequestException(
        "Cannot edit sale that has been delivered or in transit",
      );
    }

    // Store old line items to handle stock adjustments
    const oldLineItems = [...sale.lineItems];

    if (updateDto.customerId) {
      // Update customer if provided
      const customer = await this.customerRepository.findOne({
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
      // Return old stock first before allocating new batches
      await this.returnStock(oldLineItems);

      const validatedLineItems: SaleLineItem[] = [];
      for (const item of updateDto.lineItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, deletedAt: IsNull() },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID "${item.productId}" not found`,
          );
        }

        let totalAllocated = 0;
        const batchAllocations = item.batchAllocations || [];
        if (batchAllocations.length > 0) {
          for (const alloc of batchAllocations) {
            const batch = await this.batchRepository.findOne({
              where: {
                id: alloc.batchId,
                product: { id: item.productId },
                deletedAt: IsNull(),
              },
            });
            if (!batch) {
              throw new NotFoundException(
                `Batch with ID "${alloc.batchId}" not found for product`,
              );
            }
            // Validate sufficient quantity in batch
            if (batch.quantity < alloc.quantity) {
              throw new BadRequestException(
                `Insufficient quantity in batch "${batch.batchNumber}". Available: ${batch.quantity}, Requested: ${alloc.quantity}`,
              );
            }
            totalAllocated += alloc.quantity;
          }
        }

        if (item.requestedQuantity && totalAllocated > item.requestedQuantity) {
          throw new BadRequestException(
            "Allocated quantity exceeds requested quantity",
          );
        }

        const finalPrice = item.customPrice ?? product.retail;
        validatedLineItems.push({
          productId: item.productId,
          batchAllocations: batchAllocations,
          requestedQuantity: item.requestedQuantity,
          customPrice: item.customPrice,
          finalPrice: finalPrice,
        });
      }
      sale.lineItems = validatedLineItems;

      // Deduct stock for new batch allocations
      await this.validateAndDeductStock(validatedLineItems);
    }

    const savedSale = await this.saleRepository.save(sale);
    return this.transformSaleToResponseDto(savedSale);
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

    // Validation based on orderStatus - require batches to be assigned for PACKAGING and beyond
    if (
      orderStatus &&
      [
        OrderStatus.PACKAGING,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ].includes(orderStatus)
    ) {
      // Ensure batches are assigned (stock is already deducted when batches were assigned)
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before changing order status to packaging or beyond",
          );
        }
      }
    }

    // Validation for payment status - require batches to be assigned for PAID status
    if (paymentStatus && paymentStatus === PaymentStatus.PAID) {
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before marking as paid",
          );
        }
      }
    }

    if (orderStatus) {
      sale.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      sale.paymentStatus = paymentStatus;
    }

    const savedSale = await this.saleRepository.save(sale);
    return this.transformSaleToResponseDto(savedSale);
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
    return this.transformSaleToResponseDto(savedSale);
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
      for (const alloc of oldBatchAllocations) {
        const batch = await this.batchRepository.findOne({
          where: { id: alloc.batchId },
        });
        if (batch) {
          batch.quantity += alloc.quantity;
          if (batch.quantity > 0) batch.isActive = true;
          await this.batchRepository.save(batch);
        }
      }
    }

    // Validate new batch allocations
    let totalAllocated = 0;
    for (const alloc of assignDto.batchAllocations) {
      const batch = await this.batchRepository.findOne({
        where: {
          id: alloc.batchId,
          product: { id: assignDto.productId },
          deletedAt: IsNull(),
        },
      });
      if (!batch) {
        throw new NotFoundException(
          `Batch with ID "${alloc.batchId}" not found for product`,
        );
      }
      // Validate sufficient quantity in batch
      if (batch.quantity < alloc.quantity) {
        throw new BadRequestException(
          `Insufficient quantity in batch "${batch.batchNumber}". Available: ${batch.quantity}, Requested: ${alloc.quantity}`,
        );
      }
      totalAllocated += alloc.quantity;
    }

    // Ensure allocated quantity matches requested quantity
    const requestedQuantity = sale.lineItems[itemIndex].requestedQuantity;
    if (totalAllocated !== requestedQuantity) {
      throw new BadRequestException(
        `Total allocated quantity (${totalAllocated}) must match requested quantity (${requestedQuantity})`,
      );
    }

    // Update batch allocations
    sale.lineItems[itemIndex].batchAllocations = assignDto.batchAllocations;

    // Deduct stock from new batch allocations immediately
    for (const alloc of assignDto.batchAllocations) {
      await this.batchesService.deductBatchQuantity(
        alloc.batchId,
        alloc.quantity,
      );
    }

    const savedSale = await this.saleRepository.save(sale);
    return this.transformSaleToResponseDto(savedSale);
  }

  public async listSales(query: ListSalesDto): Promise<IPagination<Sale>> {
    const {
      orderStatus,
      paymentStatus,
      customerId,
      page = 1,
      limit = 10,
    } = query;

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (customerId) where.customer = { id: customerId };

    const [items, totalItems] = await this.saleRepository.findAndCount({
      where,
      relations: ["customer"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      totalItems,
      currentPage: page,
      totalPages,
    };
  }

  public async getSaleDetails(saleId: string): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }
    return this.transformSaleToResponseDto(sale);
  }

  public async cancelSale(saleId: string): Promise<SaleResponseDto> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Return stock for any batches that were allocated (since stock is deducted immediately)
    await this.returnStock(sale.lineItems);

    sale.deletedAt = new Date();
    const savedSale = await this.saleRepository.save(sale);
    return this.transformSaleToResponseDto(savedSale);
  }

  public async generateInvoice(
    saleId: string,
    invoiceDto: GenerateInvoiceDto,
  ): Promise<Buffer> {
    return this.invoiceService.generateInvoice(saleId, invoiceDto);
  }

  public async generateReceipt(
    saleId: string,
    receiptDto: GenerateReceiptDto,
  ): Promise<Buffer> {
    return this.receiptService.generateReceipt(saleId, receiptDto);
  }

  public async generateWaybill(
    saleId: string,
    waybillDto: GenerateWaybillDto,
  ): Promise<Buffer> {
    return this.waybillService.generateWaybill(saleId, waybillDto);
  }

  private async validateAndDeductStock(
    lineItems: SaleLineItem[],
  ): Promise<void> {
    console.log("Validating and deducting stock");
    for (const item of lineItems) {
      let totalDeducted = 0;
      for (const alloc of item.batchAllocations) {
        await this.batchesService.deductBatchQuantity(
          alloc.batchId,
          alloc.quantity,
        );
        totalDeducted += alloc.quantity;
      }
      if (totalDeducted !== item.requestedQuantity) {
        throw new BadRequestException(
          "Allocated quantities do not match requested quantity",
        );
      }
    }
  }

  private async returnStock(lineItems: SaleLineItem[]): Promise<void> {
    for (const item of lineItems) {
      for (const alloc of item.batchAllocations) {
        // Assuming there's a method to add back, but since BatchesService has deduct, we need to add a method or directly update.
        // For now, directly update quantity
        const batch = await this.batchRepository.findOne({
          where: { id: alloc.batchId },
        });
        if (batch) {
          batch.quantity += alloc.quantity;
          if (batch.quantity > 0) batch.isActive = true;
          await this.batchRepository.save(batch);
        }
      }
    }
  }

  public async trackOrder(
    saleId: string,
    email: string,
  ): Promise<SaleResponseDto> {
    try {
      const sale = await this.saleRepository.findOne({
        where: { id: saleId, deletedAt: IsNull() },
        relations: [
          "customer",
          "checkout",
          "checkout.carts",
          "checkout.carts.product",
        ],
      });

      if (!sale) {
        throw new NotFoundException("Order not found");
      }

      // Check if the email matches customer email or guest email (from checkout)
      const customerEmail = sale.customer.email;
      const guestEmail = sale.checkout?.guestEmail;

      if (
        email.toLowerCase() !== customerEmail?.toLowerCase() &&
        email.toLowerCase() !== guestEmail?.toLowerCase()
      ) {
        throw new BadRequestException("Email does not match order records");
      }

      // Transform the sale entity into the response DTO
      return this.transformSaleToResponseDto(sale);
    } catch (e) {
      this.logger.error(e);
    }
  }

  public async payForOrder(
    saleId: string,
    email: string,
  ): Promise<IInitializeTransactionResponse<IInitalizeTransactionData>> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer", "checkout"],
    });

    if (!sale) {
      throw new NotFoundException("Order not found");
    }

    // Check if the email matches customer email or guest email (from checkout)
    const customerEmail = sale.customer.email;
    const guestEmail = sale.checkout?.guestEmail;

    if (
      email.toLowerCase() !== customerEmail?.toLowerCase() &&
      email.toLowerCase() !== guestEmail?.toLowerCase()
    ) {
      throw new BadRequestException("Email does not match order records");
    }

    // Check payment status
    if (
      sale.paymentStatus !== PaymentStatus.INVOICE_REQUESTED &&
      sale.paymentStatus !== PaymentStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException(
        `Cannot pay for order with payment status: ${sale.paymentStatus}`,
      );
    }

    // If there's no checkout, we can't process payment via Paystack
    if (!sale.checkout) {
      throw new BadRequestException(
        "This order does not have payment information. Please contact support.",
      );
    }

    try {
      const useEmail = guestEmail || customerEmail;
      const response = await this.initializePaystack(
        sale.id,
        useEmail,
        Number(sale.checkout.amount),
      );

      sale.checkout.paystackReference = response.data.data.reference;
      sale.paymentStatus = PaymentStatus.PENDING_PAYMENT;
      await this.saleRepository.save(sale);
      await this.checkoutRepository.save(sale.checkout);

      return response.data;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.response?.data?.message || "Internal Server Error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async initializePaystack(
    saleId: string,
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
        reference: `sale=${saleId}`,
        callback_url: `${process.env.FRONTEND_URL}/track-order/${saleId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
  }

  private transformSaleToResponseDto(sale: Sale): SaleResponseDto {
    console.log("Transforming sale to response DTO", sale.checkout);
    // Transform line items with enhanced product information
    const transformedLineItems = sale.lineItems.map(item => {
      // Find product information from checkout carts if available
      const cartItem = sale.checkout?.carts?.find(
        cart => cart.product.id === item.productId,
      );
      const product = cartItem?.product;

      return {
        productId: item.productId,
        productName: product?.name,
        category: product?.category,
        batchAllocations: item.batchAllocations.map(alloc => ({
          batchId: alloc.batchId,
          quantity: alloc.quantity,
        })),
        requestedQuantity: item.requestedQuantity,
        customPrice: item.customPrice,
        finalPrice: item.finalPrice,
        totalAmount: item.finalPrice * item.requestedQuantity,
      };
    });

    // Transform customer information
    const customer: Omit<Customer, "sales" | "user"> = {
      id: sale.customer.id,
      name: sale.customer.name,
      phone: sale.customer.phone,
      email: sale.customer.email,
      address: sale.customer.address,
      country: sale.customer.country,
      region: sale.customer.region,
      city: sale.customer.city,
      phoneNumber: sale.customer.phoneNumber,
      extraInfo: sale.customer.extraInfo,
      createdAt: sale.customer.createdAt,
      updatedAt: sale.customer.updatedAt,
      deletedAt: sale.customer.deletedAt,
    };

    // Transform checkout information (if exists)
    let checkout = undefined;
    if (sale.checkout) {
      checkout = {
        id: sale.checkout.id,
        amount: sale.checkout.amount,
        paystackReference: sale.checkout.paystackReference,
        guestEmail: sale.checkout.guestEmail,
        createdAt: sale.checkout.createdAt,
        updatedAt: sale.checkout.updatedAt,
        deletedAt: sale.checkout.deletedAt,
      };
    }

    return {
      id: sale.id,
      customer,
      checkout,
      orderStatus: sale.orderStatus,
      paymentStatus: sale.paymentStatus,
      lineItems: transformedLineItems,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      deletedAt: sale.deletedAt,
    };
  }
}
