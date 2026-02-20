import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  BadRequestException,
  NotFoundException,
  Injectable,
} from "@nestjs/common";
import { Batch } from "../entities/Batch.entity";
import { BatchAllocationDto } from "../dto/sales/createSale.dto";
import { SaleLineItem } from "../interfaces/sale-line-item.interface";
import { BatchesService } from "../products/batches/batches.service";

@Injectable()
export class StockManagementService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    private readonly batchesService: BatchesService,
  ) {}

  public async validateAndDeductStock(
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

  public async returnStock(lineItems: SaleLineItem[]): Promise<void> {
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

  public async returnOldBatchStock(
    oldBatchAllocations: BatchAllocationDto[],
  ): Promise<void> {
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

  public async validateNewBatchAllocations(
    productId: string,
    batchAllocations: BatchAllocationDto[],
    requestedQuantity: number,
  ): Promise<void> {
    let totalAllocated = 0;
    for (const alloc of batchAllocations) {
      const batch = await this.batchRepository.findOne({
        where: {
          id: alloc.batchId,
          product: { id: productId },
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
    if (totalAllocated !== requestedQuantity) {
      throw new BadRequestException(
        `Total allocated quantity (${totalAllocated}) must match requested quantity (${requestedQuantity})`,
      );
    }
  }

  public async deductNewBatchStock(
    batchAllocations: BatchAllocationDto[],
  ): Promise<void> {
    for (const alloc of batchAllocations) {
      await this.batchesService.deductBatchQuantity(
        alloc.batchId,
        alloc.quantity,
      );
    }
  }

  public async validateBatchAllocations(
    productId: string,
    batchAllocations: BatchAllocationDto[],
  ): Promise<number> {
    let totalAllocated = 0;
    for (const alloc of batchAllocations) {
      const batch = await this.batchRepository.findOne({
        where: {
          id: alloc.batchId,
          product: { id: productId },
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
    return totalAllocated;
  }
}
