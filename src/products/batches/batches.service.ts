import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, IsNull, Repository } from "typeorm";
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

  public async createBatch(batchInfo: CreateBatchDto): Promise<Batch> {
    const existingBatch = await this.batchRepository.findOne({
      where: { batchNumber: batchInfo.batchNumber },
    });

    if (existingBatch) {
      throw new ConflictException(
        `Batch with number "${batchInfo.batchNumber}" already exists`,
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: batchInfo.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${batchInfo.productId}" not found`,
      );
    }

    const batch = this.batchRepository.create({
      ...batchInfo,
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
      relations: productId ? ["product"] : [],
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
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found`);
    }

    return batch;
  }

  public async ensureBatchExists(id: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({ where: { id } });
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
