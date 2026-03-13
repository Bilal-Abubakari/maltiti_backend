import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Product } from "../entities/Product.entity";

@Injectable()
export class ProductDisplayService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Returns a display-friendly product name in the format:
   * "Product Name (weight unit)" e.g. "Shea Butter (1 kg)"
   * Falls back gracefully if the product cannot be found.
   */
  public async resolveProductDisplayName(
    productId: string,
    existingName?: string,
  ): Promise<string> {
    if (existingName) {
      return existingName;
    }

    const product = await this.productRepository.findOne({
      where: { id: productId, deletedAt: IsNull() },
      select: ["id", "name", "weight", "unitOfMeasurement"],
    });

    if (!product) {
      return productId;
    }

    let weightPart = "";

    if (product.weight && product.unitOfMeasurement) {
      weightPart = ` (${product.weight} ${product.unitOfMeasurement})`;
    } else if (product.weight) {
      weightPart = ` (${product.weight})`;
    }

    return `${product.name}${weightPart}`;
  }
}
