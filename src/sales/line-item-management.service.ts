import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, QueryRunner } from "typeorm";
import { Sale } from "../entities/Sale.entity";
import { Batch } from "../entities/Batch.entity";
import { Product } from "../entities/Product.entity";
import { UpdateSaleLineItemDto } from "../dto/sales/updateSale.dto";
import {
  SaleLineItemDto,
  BatchAllocationDto,
} from "../dto/sales/createSale.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
@Injectable()
export class LineItemManagementService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  public async updateLineItems(
    sale: Sale,
    lineItems: UpdateSaleLineItemDto[],
    oldLineItems: SaleLineItem[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    // Return old stock first before allocating new batches
    await this.returnStock(oldLineItems, queryRunner);
    const validatedLineItems: SaleLineItem[] = [];
    for (const item of lineItems) {
      const product = await this.findProduct(item.productId, queryRunner);
      if (!product) {
        throw new NotFoundException(
          `Product with ID "${item.productId}" not found`,
        );
      }
      let totalAllocated = 0;
      const batchAllocations = item.batchAllocations || [];
      if (batchAllocations.length > 0) {
        totalAllocated = await this.validateBatchAllocations(
          item.productId,
          batchAllocations,
          queryRunner,
        );
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
        finalPrice,
      });
    }
    sale.lineItems = validatedLineItems;
    // Deduct stock for new batch allocations
    await this.validateAndDeductStock(validatedLineItems, queryRunner);
  }

  public async updateLineItemsTransactional(
    sale: Sale,
    lineItems: UpdateSaleLineItemDto[],
    oldLineItems: SaleLineItem[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    return this.updateLineItems(sale, lineItems, oldLineItems, queryRunner);
  }

  public async validateLineItems(
    lineItems: SaleLineItemDto[],
  ): Promise<SaleLineItem[]> {
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
        totalAllocated = await this.validateBatchAllocations(
          item.productId,
          item.batchAllocations,
        );
      }
      if (totalAllocated > item.requestedQuantity) {
        throw new BadRequestException(
          "Allocated quantity exceeds requested quantity",
        );
      }
      const finalPrice = item.customPrice ?? product.retail;
      validatedLineItems.push({
        ...item,
        finalPrice,
      });
    }
    return validatedLineItems;
  }

  private async validateBatchAllocations(
    productId: string,
    batchAllocations: BatchAllocationDto[],
    queryRunner?: QueryRunner,
  ): Promise<number> {
    let totalAllocated = 0;
    for (const alloc of batchAllocations) {
      const batch = await this.findBatch(alloc.batchId, productId, queryRunner);
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
    return totalAllocated;
  }

  private async validateAndDeductStock(
    lineItems: SaleLineItem[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    console.log("Validating and deducting stock");
    for (const item of lineItems) {
      await this.processBatchAllocations(item, queryRunner);
    }
  }

  private async processBatchAllocations(
    item: SaleLineItem,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    let totalDeducted = 0;

    for (const alloc of item.batchAllocations) {
      if (queryRunner) {
        totalDeducted += await this.processTransactionalAllocation(
          alloc,
          queryRunner,
        );
      } else {
        totalDeducted += alloc.quantity;
      }
    }

    if (totalDeducted !== item.requestedQuantity) {
      throw new BadRequestException(
        "Allocated quantities do not match requested quantity",
      );
    }
  }

  private async processTransactionalAllocation(
    alloc: BatchAllocationDto,
    queryRunner: QueryRunner,
  ): Promise<number> {
    const batch = await queryRunner.manager.findOne(Batch, {
      where: { id: alloc.batchId },
    });

    if (!batch) {
      return 0;
    }

    // Deduct the quantity
    batch.quantity -= alloc.quantity;

    // If needed, update isActive status
    if (batch.quantity <= 0) {
      batch.isActive = false;
    }

    await queryRunner.manager.save(batch);
    return alloc.quantity;
  }

  private async returnStock(
    lineItems: SaleLineItem[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    for (const item of lineItems) {
      for (const alloc of item.batchAllocations) {
        const batch = await this.findBatchById(alloc.batchId, queryRunner);
        if (batch) {
          batch.quantity += alloc.quantity;
          if (batch.quantity > 0) batch.isActive = true;
          if (queryRunner) {
            await queryRunner.manager.save(batch);
          } else {
            await this.batchRepository.save(batch);
          }
        }
      }
    }
  }

  private async findBatchById(
    batchId: string,
    queryRunner?: QueryRunner,
  ): Promise<Batch | undefined> {
    if (queryRunner) {
      return queryRunner.manager.findOne(Batch, {
        where: { id: batchId },
      });
    }
    return this.batchRepository.findOne({
      where: { id: batchId },
    });
  }

  private async findProduct(
    productId: string,
    queryRunner?: QueryRunner,
  ): Promise<Product | undefined> {
    if (queryRunner) {
      return queryRunner.manager.findOne(Product, {
        where: { id: productId, deletedAt: IsNull() },
      });
    }
    return this.productRepository.findOne({
      where: { id: productId, deletedAt: IsNull() },
    });
  }

  private async findBatch(
    batchId: string,
    productId: string,
    queryRunner?: QueryRunner,
  ): Promise<Batch | undefined> {
    if (queryRunner) {
      return queryRunner.manager.findOne(Batch, {
        where: {
          id: batchId,
          product: { id: productId },
          deletedAt: IsNull(),
        },
      });
    }
    return this.batchRepository.findOne({
      where: {
        id: batchId,
        product: { id: productId },
        deletedAt: IsNull(),
      },
    });
  }
}
