import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Customer } from "../entities/Customer.entity";
import { Batch } from "../entities/Batch.entity";
import { Product } from "../entities/Product.entity";
import { CreateSaleDto } from "../dto/createSale.dto";
import { UpdateSaleDto } from "../dto/updateSale.dto";
import { UpdateSaleStatusDto } from "../dto/updateSaleStatus.dto";
import { AddLineItemDto } from "../dto/addLineItem.dto";
import { AssignBatchesDto } from "../dto/assignBatches.dto";
import { ListSalesDto } from "../dto/listSales.dto";
import { GenerateInvoiceDto } from "../dto/generateInvoice.dto";
import { GenerateReceiptDto } from "../dto/generateReceipt.dto";
import { GenerateWaybillDto } from "../dto/generateWaybill.dto";
import { SaleStatus } from "../enum/sale-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { BatchesService } from "../products/batches/batches.service";
import { InvoiceService } from "./invoice.service";
import { ReceiptService } from "./receipt.service";
import { WaybillService } from "./waybill.service";
import { IPagination } from "../interfaces/general";

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly batchesService: BatchesService,
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
    private readonly waybillService: WaybillService,
  ) {}

  public async createSale(createSaleDto: CreateSaleDto): Promise<Sale> {
    const {
      customerId,
      status = SaleStatus.INVOICE_REQUESTED,
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

    // If status is PAID, deduct stock immediately
    if (status === SaleStatus.PAID) {
      await this.validateAndDeductStock(validatedLineItems);
    }

    const sale = this.saleRepository.create({
      customer,
      status,
      lineItems: validatedLineItems,
    });

    return this.saleRepository.save(sale);
  }

  public async updateSale(
    saleId: string,
    updateDto: UpdateSaleDto,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent editing if already paid or beyond
    if ([SaleStatus.IN_TRANSIT, SaleStatus.DELIVERED].includes(sale.status)) {
      throw new BadRequestException(
        "Cannot edit sale that has been delivered or in transit",
      );
    }

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

    if (updateDto.status) {
      sale.status = updateDto.status;
    }

    // Update line items if provided
    if (updateDto.lineItems) {
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
    }

    return this.saleRepository.save(sale);
  }

  public async updateSaleStatus(
    saleId: string,
    updateDto: UpdateSaleStatusDto,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    const { status } = updateDto;

    // Validation based on status
    if (status === SaleStatus.PAID) {
      // Require batches
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before marking as paid",
          );
        }
      }
      // Deduct stock
      await this.validateAndDeductStock(sale.lineItems);
    } else if (
      [
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(status)
    ) {
      // Ensure batches are assigned
      for (const item of sale.lineItems) {
        if (item.batchAllocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned for this status",
          );
        }
      }
    }

    sale.status = status;
    return this.saleRepository.save(sale);
  }

  public async addLineItem(
    saleId: string,
    addDto: AddLineItemDto,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent adding if after paid
    if (
      [
        SaleStatus.PAID,
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(sale.status)
    ) {
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
    return this.saleRepository.save(sale);
  }

  public async assignBatches(
    saleId: string,
    assignDto: AssignBatchesDto,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // Prevent assigning if after paid
    if (
      [
        SaleStatus.PAID,
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(sale.status)
    ) {
      throw new BadRequestException("Cannot modify batches after payment");
    }

    const itemIndex = sale.lineItems.findIndex(
      item => item.productId === assignDto.productId,
    );
    if (itemIndex === -1) {
      throw new NotFoundException("Line item not found");
    }

    sale.lineItems[itemIndex].batchAllocations = assignDto.batchAllocations;
    return this.saleRepository.save(sale);
  }

  public async listSales(query: ListSalesDto): Promise<IPagination<Sale>> {
    const { status, customerId, page = 1, limit = 10 } = query;

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (status) where.status = status;
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

  public async getSaleDetails(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
      relations: ["customer"],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }
    return sale;
  }

  public async cancelSale(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, deletedAt: IsNull() },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
    }

    // If after paid, return stock
    if (
      sale.status === SaleStatus.PAID ||
      [
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(sale.status)
    ) {
      await this.returnStock(sale.lineItems);
    }

    sale.deletedAt = new Date();
    return this.saleRepository.save(sale);
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
}
