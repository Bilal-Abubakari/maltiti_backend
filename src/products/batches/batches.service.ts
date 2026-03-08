import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, IsNull, Repository, In } from "typeorm";
import { Batch } from "../../entities/Batch.entity";
import { CreateBatchDto } from "../../dto/createBatch.dto";
import { BatchQueryDto } from "../../dto/batchQuery.dto";
import { Product } from "../../entities/Product.entity";
import { IPagination } from "../../interfaces/general";

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Generates a unique batch number based on product SKU and production date
   * Format: {PRODUCT_SKU}-{YYMMDD}-{SEQUENCE}
   * Example: SHKR-251209-001
   */
  private async generateBatchNumber(
    product: Product,
    productionDate?: Date,
  ): Promise<string> {
    // Use product SKU or fallback to first 4 letters of product name
    const productPrefix = product.sku
      ? product.sku.substring(0, 8).toUpperCase()
      : product.name.substring(0, 4).toUpperCase().replace(/\s/g, "");

    // Use production date or current date
    const dateToUse = productionDate || new Date();
    const dateStr = dateToUse.toISOString().slice(2, 10).replace(/-/g, ""); // Format: YYMMDD

    // Find the highest sequence number for this product and date combination
    const prefix = `${productPrefix}-${dateStr}`;
    const existingBatches = await this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.batchNumber LIKE :prefix", { prefix: `${prefix}-%` })
      .orderBy("batch.batchNumber", "DESC")
      .getMany();

    let sequence = 1;
    if (existingBatches.length > 0) {
      // Extract the sequence number from the last batch
      const lastBatch = existingBatches[0];
      const lastSequence = lastBatch.batchNumber.split("-").pop();
      sequence = parseInt(lastSequence || "0", 10) + 1;
    }

    // Format sequence with leading zeros (001, 002, etc.)
    const sequenceStr = sequence.toString().padStart(3, "0");

    return `${prefix}-${sequenceStr}`;
  }

  public async createBatch(batchInfo: CreateBatchDto): Promise<Batch> {
    // Fetch the product first
    const product = await this.productRepository.findOne({
      where: { id: batchInfo.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${batchInfo.productId}" not found`,
      );
    }

    // Generate batch number if not provided
    let batchNumber = batchInfo.batchNumber;
    if (!batchNumber) {
      const productionDate = batchInfo.productionDate
        ? new Date(batchInfo.productionDate)
        : undefined;
      batchNumber = await this.generateBatchNumber(product, productionDate);
    } else {
      // If batch number is provided manually, check for duplicates
      const existingBatch = await this.batchRepository.findOne({
        where: { batchNumber },
      });

      if (existingBatch) {
        throw new ConflictException(
          `Batch with number "${batchNumber}" already exists`,
        );
      }
    }

    const batch = this.batchRepository.create({
      ...batchInfo,
      batchNumber,
      product,
      productionDate: batchInfo.productionDate
        ? new Date(batchInfo.productionDate)
        : null,
      expiryDate: batchInfo.expiryDate ? new Date(batchInfo.expiryDate) : null,
    });

    return this.batchRepository.save(batch);
  }

  public async getAllBatches(
    query: BatchQueryDto,
  ): Promise<IPagination<Batch>> {
    const {
      page = 1,
      limit = 10,
      productId,
      batchNumber,
      qualityCheckStatus,
      isActive,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = query;

    const where: FindOptionsWhere<Batch> | FindOptionsWhere<Batch>[] = {
      deletedAt: IsNull(),
    };

    if (productId) {
      where.product = { id: productId };
    }

    if (batchNumber) {
      where.batchNumber = batchNumber; // or use Like for partial match
    }

    if (qualityCheckStatus) {
      where.qualityCheckStatus = qualityCheckStatus;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, totalItems] = await this.batchRepository.findAndCount({
      where,
      relations: ["product"],
      select: {
        product: {
          id: true,
          name: true,
          weight: true,
          unitOfMeasurement: true,
        },
      },
      order: { [sortBy]: sortOrder },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  public async getBatch(id: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["product"],
      select: {
        product: {
          id: true,
          name: true,
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found`);
    }

    return batch;
  }

  public async getBatchesByProduct(productId: string): Promise<Batch[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    return this.batchRepository.find({
      where: { product: { id: productId }, deletedAt: IsNull() },
      relations: ["product"],
      select: {
        product: {
          id: true,
          name: true,
        },
      },
      order: { createdAt: "DESC" },
    });
  }

  public async getBatchesByProducts(productIds: string[]): Promise<Batch[]> {
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
    });

    if (products.length === 0) {
      throw new NotFoundException(`No products found for the provided IDs`);
    }

    return this.batchRepository.find({
      where: { product: { id: In(productIds) }, deletedAt: IsNull() },
      relations: ["product"],
      select: {
        product: {
          id: true,
          name: true,
        },
      },
      order: { createdAt: "DESC" },
    });
  }

  public async deductBatchQuantity(
    batchId: string,
    quantity: number,
  ): Promise<Batch> {
    if (quantity <= 0) {
      throw new BadRequestException("Quantity to deduct must be positive");
    }

    const batch = await this.batchRepository.findOne({
      where: { id: batchId, deletedAt: IsNull() },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${batchId}" not found`);
    }

    if (batch.quantity < quantity) {
      throw new BadRequestException("Insufficient quantity in batch");
    }

    batch.quantity -= quantity;

    if (batch.quantity === 0) {
      batch.isActive = false;
    }

    return this.batchRepository.save(batch);
  }
}
