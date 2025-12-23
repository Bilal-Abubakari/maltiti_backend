import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Product } from "../entities/Product.entity";
import { CreateProductDto } from "../dto/createProduct.dto";
import { UpdateProductDto } from "../dto/updateProduct.dto";
import {
  ExportProductQueryDto,
  ProductQueryDto,
} from "../dto/productQuery.dto";
import { ProductStatus } from "../enum/product-status.enum";
import { IPagination } from "../interfaces/general";
import { BestProductsResponseDto } from "../dto/productResponse.dto";
import * as ExcelJS from "exceljs";
import { Batch } from "../entities/Batch.entity";
import { LightProduct } from "../interfaces/product-light.model";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
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
   * Get best/featured products (random 8 active products)
   */
  public async getBestProducts(): Promise<BestProductsResponseDto> {
    const queryBuilder = this.productsRepository
      .createQueryBuilder("product")
      .where("product.deletedAt IS NULL")
      .andWhere("product.status = :status", { status: ProductStatus.ACTIVE })
      .andWhere("product.isFeatured = :isFeatured", { isFeatured: true })
      .orderBy("RANDOM()")
      .take(8);

    const products = await queryBuilder.getMany();

    return {
      totalItems: products.length,
      data: products,
    };
  }

  /**
   * Get all products for export (without pagination, with filters)
   */
  public async getProductsForExport(
    queryDto: ExportProductQueryDto,
  ): Promise<Product[]> {
    const {
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

    // No pagination for export
    return await queryBuilder.getMany();
  }

  /**
   * Generate Excel file for products export
   * Reusable helper function for Excel generation with formatting
   */
  public async generateProductsExcel(
    products: Product[],
  ): Promise<ExcelJS.Buffer> {
    // Design decision: Using exceljs for robust Excel generation with formatting capabilities
    // Supports large datasets via streaming if needed in future
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products Export");

    // Define columns with headers matching Maltiti's product structure
    worksheet.columns = [
      { header: "Product Name", key: "name", width: 30 },
      { header: "SKU", key: "sku", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Grade", key: "grade", width: 10 },
      { header: "Status", key: "status", width: 10 },
      { header: "Wholesale Price", key: "wholesale", width: 15 },
      { header: "Retail Price", key: "retail", width: 15 },
      { header: "Weight", key: "weight", width: 10 },
      { header: "Unit of Measurement", key: "unitOfMeasurement", width: 20 },
      { header: "Is Featured", key: "isFeatured", width: 12 },
      { header: "Is Organic", key: "isOrganic", width: 12 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Reviews", key: "reviews", width: 10 },
      { header: "Created Date", key: "createdAt", width: 20 },
    ];

    // Style header row: Bold and centered
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    // Add data rows with conditional formatting
    products.forEach(product => {
      const row = worksheet.addRow({
        name: product.name,
        sku: product.sku || "N/A",
        category: product.category,
        grade: product.grade || "N/A",
        status: product.status,
        wholesale: product.wholesale,
        retail: product.retail,
        weight: product.weight || "N/A",
        unitOfMeasurement: product.unitOfMeasurement || "N/A",
        isFeatured: product.isFeatured ? "Yes" : "No",
        isOrganic: product.isOrganic ? "Yes" : "No",
        rating: product.rating,
        reviews: product.reviews,
        createdAt: product.createdAt.toISOString().split("T")[0], // Format as YYYY-MM-DD
      });

      // Highlight inactive products in light red
      if (product.status === ProductStatus.INACTIVE) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFCCCC" }, // Light red
        };
      }
    });

    // Auto-adjust column widths (though already set, this ensures proper fit)
    worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.max(column.width, 10); // Minimum width
      }
    });

    // Generate buffer for response

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export products to Excel with optional filters
   */
  public async exportProductsToExcel(
    queryDto: ExportProductQueryDto,
  ): Promise<ExcelJS.Buffer> {
    try {
      // Fetch products with applied filters
      const products = await this.getProductsForExport(queryDto);

      // Log export operation for auditing
      console.log(
        `Exporting ${products.length} products to Excel with filters:`,
        queryDto,
      );

      // Handle empty dataset gracefully
      if (products.length === 0) {
        throw new NotFoundException(
          "No products found matching the specified filters",
        );
      }

      // Generate Excel file
      return await this.generateProductsExcel(products);
    } catch (error) {
      console.error("Error generating products Excel export:", error);
      throw error; // Re-throw to let controller handle
    }
  }

  /**
   * Get a single product by ID
   */
  public async getOneProduct(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  /**
   * Create a new product
   */
  public async createProduct(productInfo: CreateProductDto): Promise<Product> {
    // Check if SKU already exists
    if (productInfo.sku) {
      const existingProduct = await this.productsRepository.findOne({
        where: { sku: productInfo.sku, deletedAt: IsNull() },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Product with SKU "${productInfo.sku}" already exists`,
        );
      }
    }

    const product = new Product();
    this.setProductFields(product, productInfo);

    // Auto-calculate inBoxPrice if not provided
    if (!product.inBoxPrice && product.quantityInBox && product.wholesale) {
      product.inBoxPrice = product.quantityInBox * product.wholesale;
    }

    return await this.productsRepository.save(product);
  }

  /**
   * Update an existing product
   */
  public async editProduct(
    id: string,
    productInfo: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check SKU uniqueness if updating SKU
    if (productInfo.sku && productInfo.sku !== product.sku) {
      const existingProduct = await this.productsRepository.findOne({
        where: { sku: productInfo.sku, deletedAt: IsNull() },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Product with SKU "${productInfo.sku}" already exists`,
        );
      }
    }

    // Validate batch if provided

    await this.setProductFields(product, productInfo);

    // Recalculate inBoxPrice if relevant fields changed
    if (
      (productInfo.quantityInBox || productInfo.wholesale) &&
      product.quantityInBox &&
      product.wholesale
    ) {
      product.inBoxPrice = product.quantityInBox * product.wholesale;
    }

    return await this.productsRepository.save(product);
  }

  /**
   * Toggle product status between active and inactive
   */
  public async changeProductStatus(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Toggle between active and inactive only
    if (product.status === ProductStatus.ACTIVE) {
      product.status = ProductStatus.INACTIVE;
    } else {
      product.status = ProductStatus.ACTIVE;
    }

    return await this.productsRepository.save(product);
  }

  /**
   * Toggle product favorite status
   */
  public async toggleFavorite(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    product.favorite = !product.favorite;

    return await this.productsRepository.save(product);
  }

  /**
   * Soft delete a product
   */
  public async deleteProduct(
    id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    product.deletedAt = new Date();
    await this.productsRepository.save(product);

    return { deleted: true, id };
  }

  /**
   * Hard delete a product (use with caution)
   */
  public async hardDeleteProduct(
    id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const result = await this.productsRepository.delete({ id });

    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return { deleted: true, id };
  }

  /**
   * Get total stock for a product across all batches
   */
  public async getTotalStock(productId: string): Promise<number> {
    const result = await this.batchRepository
      .createQueryBuilder("batch")
      .select("SUM(batch.quantity)", "total")
      .where("batch.productId = :productId", { productId })
      .andWhere("batch.isActive = true")
      .andWhere("batch.deletedAt IS NULL")
      .getRawOne();

    return result.total || 0;
  }

  /**
   * Get all products with only id and name fields
   */
  public async getAllProductsBasic(): Promise<LightProduct[]> {
    return await this.productsRepository.find({
      where: { deletedAt: IsNull() },
      select: [
        "id",
        "name",
        "retail",
        "wholesale",
        "weight",
        "unitOfMeasurement",
      ],
    });
  }

  /**
   * Find a product by ID
   */
  public async findOne(id: string): Promise<Product> {
    return this.getOneProduct(id);
  }

  /**
   * Set product fields from DTO
   */
  private async setProductFields(
    product: Product,
    productInfo: CreateProductDto | UpdateProductDto,
  ): Promise<void> {
    product.name = productInfo.name;
    product.sku = productInfo.sku;
    product.category = productInfo.category;
    product.grade = productInfo.grade;
    product.status = productInfo.status;
    product.wholesale = productInfo.wholesale;
    product.retail = productInfo.retail;
    product.weight = productInfo.weight;
    product.unitOfMeasurement = productInfo.unitOfMeasurement;
    product.isFeatured = productInfo.isFeatured;
    product.isOrganic = productInfo.isOrganic;
  }
}
