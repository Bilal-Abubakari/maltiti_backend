import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../entities/Product.entity";
import { ProductQueryDto } from "../dto/productQuery.dto";
import { IPagination } from "../interfaces/general";

@Injectable()
export class ProductSearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * Get all products with flexible filtering, pagination, and sorting
   */
  public async getAllProducts(
    queryDto: ProductQueryDto,
  ): Promise<IPagination<Product>> {
    const {
      page = 1,
      limit = 10,
      searchTerm,
      category,
      status,
      grade,
      unitOfMeasurement,
      isFeatured,
      isOrganic,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "DESC",
      batchId,
    } = queryDto;

    const skip = (page - 1) * limit;

    const queryBuilder = this.productsRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.ingredients", "ingredient")
      .where("product.deletedAt IS NULL");

    // Search functionality
    if (searchTerm) {
      queryBuilder.andWhere(
        "(LOWER(product.name) LIKE LOWER(:searchTerm) OR LOWER(product.description) LIKE LOWER(:searchTerm))",
        { searchTerm: `%${searchTerm}%` },
      );
    }

    // Filter by category
    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere("product.status = :status", { status });
    }

    // Filter by grade
    if (grade) {
      queryBuilder.andWhere("product.grade = :grade", { grade });
    }

    // Filter by unit of measurement
    if (unitOfMeasurement) {
      queryBuilder.andWhere("product.unitOfMeasurement = :unitOfMeasurement", {
        unitOfMeasurement,
      });
    }

    // Filter by featured
    if (isFeatured !== undefined) {
      queryBuilder.andWhere("product.isFeatured = :isFeatured", { isFeatured });
    }

    // Filter by organic
    if (isOrganic !== undefined) {
      queryBuilder.andWhere("product.isOrganic = :isOrganic", { isOrganic });
    }

    // Filter by price range
    if (minPrice !== undefined) {
      queryBuilder.andWhere("product.retail >= :minPrice", { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere("product.retail <= :maxPrice", { maxPrice });
    }

    // Filter by batch
    if (batchId) {
      queryBuilder.andWhere("product.batchId = :batchId", { batchId });
    }

    // Sorting
    const allowedSortFields = ["name", "retail", "createdAt", "rating"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    queryBuilder.orderBy(`product.${sortField}`, sortOrder);

    // Pagination
    const [products, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      items: products,
    };
  }

  /**
   * Get total stock for a product across all batches
   */
  public async getTotalStock(productId: string): Promise<number> {
    const result = await this.productsRepository
      .createQueryBuilder("product")
      .leftJoin("product.batches", "batch")
      .select("SUM(batch.quantity)", "total")
      .where("product.id = :productId", { productId })
      .andWhere("batch.isActive = true")
      .andWhere("batch.deletedAt IS NULL")
      .getRawOne();

    return result.total || 0;
  }
}
