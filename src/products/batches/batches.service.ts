import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Batch } from "../../entities/Batch.entity";
import { CreateBatchDto } from "../../dto/createBatch.dto";

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
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

    const batch = this.batchRepository.create({
      ...batchInfo,
      productionDate: batchInfo.productionDate
        ? new Date(batchInfo.productionDate)
        : null,
      expiryDate: batchInfo.expiryDate ? new Date(batchInfo.expiryDate) : null,
    });

    return this.batchRepository.save(batch);
  }

  public async getAllBatches(): Promise<Batch[]> {
    return this.batchRepository.find({
      where: { deletedAt: IsNull() },
      relations: ["products"],
      order: { createdAt: "DESC" },
    });
  }

  public async getBatch(id: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["products"],
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
}
