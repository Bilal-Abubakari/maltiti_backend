import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
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
import { SaleStatus } from "../enum/sale-status.enum";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { BatchesService } from "../products/batches/batches.service";
import { InvoiceService } from "./invoice.service";
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
  ) {}

  public async createSale(createSaleDto: CreateSaleDto): Promise<Sale> {
    const {
      customer_id,
      status = SaleStatus.INVOICE_REQUESTED,
      line_items,
    } = createSaleDto;

    const customer = await this.customerRepository.findOne({
      where: { id: customer_id, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID "${customer_id}" not found`,
      );
    }

    // Validate line items
    const validatedLineItems: SaleLineItem[] = [];
    for (const item of line_items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id, deletedAt: IsNull() },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID "${item.product_id}" not found`,
        );
      }

      let totalAllocated = 0;
      if (item.batch_allocations.length > 0) {
        for (const alloc of item.batch_allocations) {
          const batch = await this.batchRepository.findOne({
            where: {
              id: alloc.batch_id,
              product: { id: item.product_id },
              deletedAt: IsNull(),
            },
          });
          if (!batch) {
            throw new NotFoundException(
              `Batch with ID "${alloc.batch_id}" not found for product`,
            );
          }
          totalAllocated += alloc.quantity;
        }
      }

      if (totalAllocated > item.requested_quantity) {
        throw new BadRequestException(
          "Allocated quantity exceeds requested quantity",
        );
      }

      const finalPrice = item.custom_price ?? product.retail;
      validatedLineItems.push({
        ...item,
        final_price: finalPrice,
      });
    }

    // If status is PAID, deduct stock immediately
    if (status === SaleStatus.PAID) {
      await this.validateAndDeductStock(validatedLineItems);
    }

    const sale = this.saleRepository.create({
      customer,
      status,
      line_items: validatedLineItems,
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
    if (
      [
        SaleStatus.PAID,
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(sale.status)
    ) {
      throw new BadRequestException("Cannot edit sale after payment");
    }

    // Update customer if provided
    if (updateDto.customer_id) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateDto.customer_id, deletedAt: IsNull() },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID "${updateDto.customer_id}" not found`,
        );
      }
      sale.customer = customer;
    }

    // Update line items if provided
    if (updateDto.line_items) {
      const validatedLineItems: SaleLineItem[] = [];
      for (const item of updateDto.line_items) {
        const product = await this.productRepository.findOne({
          where: { id: item.product_id, deletedAt: IsNull() },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID "${item.product_id}" not found`,
          );
        }

        let totalAllocated = 0;
        const batchAllocations = item.batch_allocations || [];
        if (batchAllocations.length > 0) {
          for (const alloc of batchAllocations) {
            const batch = await this.batchRepository.findOne({
              where: {
                id: alloc.batch_id,
                product: { id: item.product_id },
                deletedAt: IsNull(),
              },
            });
            if (!batch) {
              throw new NotFoundException(
                `Batch with ID "${alloc.batch_id}" not found for product`,
              );
            }
            totalAllocated += alloc.quantity;
          }
        }

        if (
          item.requested_quantity &&
          totalAllocated > item.requested_quantity
        ) {
          throw new BadRequestException(
            "Allocated quantity exceeds requested quantity",
          );
        }

        const finalPrice = item.custom_price ?? product.retail;
        validatedLineItems.push({
          product_id: item.product_id,
          batch_allocations: batchAllocations,
          requested_quantity: item.requested_quantity,
          custom_price: item.custom_price,
          final_price: finalPrice,
        });
      }
      sale.line_items = validatedLineItems;
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
      for (const item of sale.line_items) {
        if (item.batch_allocations.length === 0) {
          throw new BadRequestException(
            "Batches must be assigned before marking as paid",
          );
        }
      }
      // Deduct stock
      await this.validateAndDeductStock(sale.line_items);
    } else if (
      [
        SaleStatus.PACKAGING,
        SaleStatus.IN_TRANSIT,
        SaleStatus.DELIVERED,
      ].includes(status)
    ) {
      // Ensure batches are assigned
      for (const item of sale.line_items) {
        if (item.batch_allocations.length === 0) {
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
      where: { id: addDto.product_id, deletedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${addDto.product_id}" not found`,
      );
    }

    const finalPrice = addDto.custom_price ?? product.retail;
    const newItem: SaleLineItem = {
      ...addDto,
      final_price: finalPrice,
    };

    sale.line_items.push(newItem);
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

    const itemIndex = sale.line_items.findIndex(
      item => item.product_id === assignDto.product_id,
    );
    if (itemIndex === -1) {
      throw new NotFoundException("Line item not found");
    }

    sale.line_items[itemIndex].batch_allocations = assignDto.batch_allocations;
    return this.saleRepository.save(sale);
  }

  public async listSales(query: ListSalesDto): Promise<IPagination<Sale>> {
    const { status, customer_id, page = 1, limit = 10 } = query;

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (status) where.status = status;
    if (customer_id) where.customer = { id: customer_id };

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
      await this.returnStock(sale.line_items);
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

  private async validateAndDeductStock(
    lineItems: SaleLineItem[],
  ): Promise<void> {
    for (const item of lineItems) {
      let totalDeducted = 0;
      for (const alloc of item.batch_allocations) {
        await this.batchesService.deductBatchQuantity(
          alloc.batch_id,
          alloc.quantity,
        );
        totalDeducted += alloc.quantity;
      }
      if (totalDeducted !== item.requested_quantity) {
        throw new BadRequestException(
          "Allocated quantities do not match requested quantity",
        );
      }
    }
  }

  private async returnStock(lineItems: SaleLineItem[]): Promise<void> {
    for (const item of lineItems) {
      for (const alloc of item.batch_allocations) {
        // Assuming there's a method to add back, but since BatchesService has deduct, we need to add a method or directly update.
        // For now, directly update quantity
        const batch = await this.batchRepository.findOne({
          where: { id: alloc.batch_id },
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
