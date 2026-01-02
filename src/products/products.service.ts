import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, In, MoreThanOrEqual } from "typeorm";
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
import { Sale } from "../entities/Sale.entity";
import { Cart } from "../entities/Cart.entity";
import { Customer } from "../entities/Customer.entity";
import { User } from "../entities/User.entity";
import {
  RecommendationConfig,
  DEFAULT_RECOMMENDATION_CONFIG,
} from "../interfaces/product-recommendation.interface";
import { SaleStatus } from "../enum/sale-status.enum";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
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
   * Get best/featured products with intelligent recommendations
   *
   * Behavior:
   * - For authenticated users: Returns personalized products based on purchase history,
   *   cart interactions, and category preferences
   * - For anonymous users: Returns curated products based on global performance metrics
   *   (best-sellers, most added to cart, trending items)
   *
   * Scoring Logic:
   * - Purchase history: 5.0x weight
   * - Cart interactions: 3.0x weight
   * - Category preference: 2.5x weight
   * - Global sales performance: 2.0x weight
   * - Recent trending: 1.5x weight
   *
   * @param user - Optional authenticated user
   * @param config - Optional configuration for recommendation parameters
   * @returns Fixed set of 8-10 highly relevant products
   */
  public async getBestProducts(
    user?: User,
    config: Partial<RecommendationConfig> = {},
  ): Promise<BestProductsResponseDto> {
    const fullConfig: RecommendationConfig = {
      ...DEFAULT_RECOMMENDATION_CONFIG,
      ...config,
    };

    let products: Product[];

    if (user) {
      // Personalized recommendations for authenticated users
      const personalizedProducts = await this.getPersonalizedProducts(
        user,
        fullConfig,
      );

      // If we don't have enough personalized products, fill with curated products
      if (personalizedProducts.length < fullConfig.limit) {
        const curatedProducts = await this.getCuratedProducts(fullConfig);
        const existingIds = new Set(personalizedProducts.map(p => p.id));

        // Add curated products that aren't already in personalized list
        for (const curated of curatedProducts) {
          if (!existingIds.has(curated.id)) {
            personalizedProducts.push(curated);
            if (personalizedProducts.length >= fullConfig.limit) break;
          }
        }
      }

      products = personalizedProducts.slice(0, fullConfig.limit);
    } else {
      // Curated recommendations for anonymous users
      products = await this.getCuratedProducts(fullConfig);
    }

    return {
      totalItems: products.length,
      data: products,
    };
  }

  /**
   * Get personalized product recommendations for authenticated users
   *
   * Combines multiple signals:
   * 1. Products user has purchased
   * 2. Products user has added to cart
   * 3. Products from categories user prefers
   * 4. Global best-sellers as fallback
   *
   * @param user - Authenticated user
   * @param config - Recommendation configuration
   * @returns Ranked list of products
   */
  private async getPersonalizedProducts(
    user: User,
    config: RecommendationConfig,
  ): Promise<Product[]> {
    const productScores = new Map<string, number>();

    // Find customer record for this user
    const customer = await this.customerRepository.findOne({
      where: { user: { id: user.id }, deletedAt: IsNull() },
    });

    if (customer) {
      // Score products from purchase history
      await this.scoreProductsFromPurchases(
        customer.id,
        productScores,
        config.purchaseWeight,
      );

      // Score products from category preferences (based on purchase history)
      await this.scoreProductsFromCategoryPreferences(
        customer.id,
        productScores,
        config.categoryPreferenceWeight,
      );
    }

    // Score products from cart interactions
    await this.scoreProductsFromCart(user.id, productScores, config.cartWeight);

    // If we have few or no personalized products, blend with global best-sellers
    if (productScores.size < config.limit) {
      await this.scoreProductsFromGlobalPerformance(
        productScores,
        config.salesPerformanceWeight,
        config.limit * 2, // Get more candidates to ensure variety
      );
    }

    // Convert scores to ranked list and fetch products
    return this.selectTopProducts(productScores, config.limit);
  }

  /**
   * Get curated product recommendations for anonymous users
   *
   * Uses global metrics:
   * 1. Best-selling products (total sales volume)
   * 2. Most added to cart (engagement signal)
   * 3. Recently trending (recent activity)
   *
   * @param config - Recommendation configuration
   * @returns Ranked list of products
   */
  private async getCuratedProducts(
    config: RecommendationConfig,
  ): Promise<Product[]> {
    const productScores = new Map<string, number>();

    // Score by global sales performance
    await this.scoreProductsFromGlobalPerformance(
      productScores,
      config.salesPerformanceWeight,
      config.limit * 3, // Get more candidates for better selection
    );

    // Score by cart engagement (how often added to cart)
    await this.scoreProductsFromGlobalCartActivity(
      productScores,
      config.cartWeight,
    );

    // Score by recent trending (last 30-day activity)
    await this.scoreProductsByTrending(productScores, config.trendWeight);

    // Select top products
    return this.selectTopProducts(productScores, config.limit);
  }

  /**
   * Score products based on user's purchase history
   * Products purchased more recently and more frequently get higher scores
   */
  private async scoreProductsFromPurchases(
    customerId: string,
    productScores: Map<string, number>,
    weight: number,
  ): Promise<void> {
    const sales = await this.saleRepository.find({
      where: {
        customer: { id: customerId },
        deletedAt: IsNull(),
        status: In([
          SaleStatus.INVOICE_REQUESTED,
          SaleStatus.PENDING_PAYMENT,
          SaleStatus.PAID,
          SaleStatus.PACKAGING,
          SaleStatus.IN_TRANSIT,
          SaleStatus.DELIVERED,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 50, // Consider the last 50 sales
    });

    const productFrequency = new Map<string, number>();
    const productRecency = new Map<string, number>();
    const now = Date.now();

    sales.forEach(sale => {
      sale.lineItems.forEach(item => {
        // Frequency: count how many times a product was purchased
        productFrequency.set(
          item.productId,
          (productFrequency.get(item.productId) || 0) + 1,
        );

        // Recency: more recent purchases get higher scores
        const daysSincePurchase =
          (now - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = 1 / (1 + daysSincePurchase / 30); // Decay over 30 days
        productRecency.set(
          item.productId,
          Math.max(productRecency.get(item.productId) || 0, recencyScore),
        );
      });
    });

    // Combine frequency and recency into final score
    productFrequency.forEach((frequency, productId) => {
      const recency = productRecency.get(productId) || 0;
      const score = (frequency * 0.6 + recency * 0.4) * weight;
      productScores.set(productId, (productScores.get(productId) || 0) + score);
    });
  }

  /**
   * Score products from categories the user has purchased from
   * Helps discover new products in familiar categories
   */
  private async scoreProductsFromCategoryPreferences(
    customerId: string,
    productScores: Map<string, number>,
    weight: number,
  ): Promise<void> {
    // Get user's purchased products to identify category preferences
    const sales = await this.saleRepository.find({
      where: {
        customer: { id: customerId },
        deletedAt: IsNull(),
        status: In([
          SaleStatus.INVOICE_REQUESTED,
          SaleStatus.PENDING_PAYMENT,
          SaleStatus.PAID,
          SaleStatus.PACKAGING,
          SaleStatus.IN_TRANSIT,
          SaleStatus.DELIVERED,
        ]),
      },
      take: 30,
    });

    const productIds = new Set<string>();
    sales.forEach(sale => {
      sale.lineItems.forEach(item => productIds.add(item.productId));
    });

    if (productIds.size === 0) return;

    // Fetch products to get their categories
    const purchasedProducts = await this.productsRepository.find({
      where: { id: In([...productIds]), deletedAt: IsNull() },
      select: ["id", "category"],
    });

    // Count category preferences
    const categoryFrequency = new Map<string, number>();
    purchasedProducts.forEach(product => {
      categoryFrequency.set(
        product.category,
        (categoryFrequency.get(product.category) || 0) + 1,
      );
    });

    // Get products from preferred categories (excluding already purchased)
    const preferredCategories = [...categoryFrequency.keys()];
    if (preferredCategories.length === 0) return;

    const categoryProducts = await this.productsRepository.find({
      where: {
        category: In(preferredCategories),
        status: ProductStatus.ACTIVE,
        deletedAt: IsNull(),
      },
      take: 50,
    });

    // Score products based on category preference strength
    categoryProducts.forEach(product => {
      // Don't recommend products user already purchased
      if (productIds.has(product.id)) return;

      const categoryStrength = categoryFrequency.get(product.category) || 0;
      const score = categoryStrength * weight;
      productScores.set(
        product.id,
        (productScores.get(product.id) || 0) + score,
      );
    });
  }

  /**
   * Score products based on user's cart activity
   * Products currently in cart or previously added get higher scores
   */
  private async scoreProductsFromCart(
    userId: string,
    productScores: Map<string, number>,
    weight: number,
  ): Promise<void> {
    const cartItems = await this.cartRepository.find({
      where: {
        user: { id: userId },
      },
      relations: ["product"],
      order: { createdAt: "DESC" },
      take: 20,
    });

    const productFrequency = new Map<string, number>();
    const now = Date.now();

    cartItems.forEach(cartItem => {
      if (!cartItem.product || cartItem.product.status !== ProductStatus.ACTIVE)
        return;

      // Count frequency
      productFrequency.set(
        cartItem.product.id,
        (productFrequency.get(cartItem.product.id) || 0) + 1,
      );

      // Recent cart additions get bonus
      const daysSinceAdded =
        (now - new Date(cartItem.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBonus = daysSinceAdded < 7 ? 1.5 : 1.0;

      const score = weight * recencyBonus;
      productScores.set(
        cartItem.product.id,
        (productScores.get(cartItem.product.id) || 0) + score,
      );
    });
  }

  /**
   * Score products based on global sales performance
   * Best-selling products get higher scores
   */
  private async scoreProductsFromGlobalPerformance(
    productScores: Map<string, number>,
    weight: number,
    limit: number,
  ): Promise<void> {
    const sales = await this.saleRepository.find({
      where: {
        deletedAt: IsNull(),
        status: In([
          SaleStatus.INVOICE_REQUESTED,
          SaleStatus.PENDING_PAYMENT,
          SaleStatus.PAID,
          SaleStatus.PACKAGING,
          SaleStatus.IN_TRANSIT,
          SaleStatus.DELIVERED,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 200, // Sample recent sales
    });

    const productSalesCount = new Map<string, number>();
    const productRevenueCount = new Map<string, number>();

    sales.forEach(sale => {
      sale.lineItems.forEach(item => {
        productSalesCount.set(
          item.productId,
          (productSalesCount.get(item.productId) || 0) + item.requestedQuantity,
        );
        productRevenueCount.set(
          item.productId,
          (productRevenueCount.get(item.productId) || 0) +
            item.finalPrice * item.requestedQuantity,
        );
      });
    });

    // Sort by sales count and take top performers
    const topProducts = [...productSalesCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    topProducts.forEach(([productId], index) => {
      // Higher rank (lower index) gets higher score
      const rankScore = (topProducts.length - index) / topProducts.length;
      const score = rankScore * weight;
      productScores.set(productId, (productScores.get(productId) || 0) + score);
    });
  }

  /**
   * Score products based on global cart activity
   * Products frequently added to cart (high engagement) get higher scores
   */
  private async scoreProductsFromGlobalCartActivity(
    productScores: Map<string, number>,
    weight: number,
  ): Promise<void> {
    // Get all cart items to see what's popular
    const cartItems = await this.cartRepository
      .createQueryBuilder("cart")
      .leftJoin("cart.product", "product")
      .select("product.id", "productId")
      .addSelect("COUNT(*)", "count")
      .where("product.status = :status", { status: ProductStatus.ACTIVE })
      .andWhere("product.deletedAt IS NULL")
      .groupBy("product.id")
      .orderBy("count", "DESC")
      .limit(30)
      .getRawMany();

    const maxCount = cartItems[0]?.count || 1;

    cartItems.forEach(item => {
      const normalizedScore = (item.count / maxCount) * weight;
      productScores.set(
        item.productId,
        (productScores.get(item.productId) || 0) + normalizedScore,
      );
    });
  }

  /**
   * Score products by recent trending activity (last 30 days)
   * Products with increasing recent activity get higher scores
   */
  private async scoreProductsByTrending(
    productScores: Map<string, number>,
    weight: number,
  ): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await this.saleRepository.find({
      where: {
        deletedAt: IsNull(),
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
        status: In([
          SaleStatus.INVOICE_REQUESTED,
          SaleStatus.PENDING_PAYMENT,
          SaleStatus.PAID,
          SaleStatus.PACKAGING,
          SaleStatus.IN_TRANSIT,
          SaleStatus.DELIVERED,
        ]),
      },
      order: { createdAt: "DESC" },
    });

    const productTrendScore = new Map<string, number>();

    recentSales.forEach(sale => {
      const daysAgo =
        (Date.now() - new Date(sale.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);

      sale.lineItems.forEach(item => {
        // More recent activity gets higher trend score
        const recencyMultiplier = Math.max(0, 1 - daysAgo / 30);
        productTrendScore.set(
          item.productId,
          (productTrendScore.get(item.productId) || 0) +
            item.requestedQuantity * recencyMultiplier,
        );
      });
    });

    // Normalize and apply weight
    const maxTrendScore = Math.max(...[...productTrendScore.values()], 1) || 1;
    productTrendScore.forEach((trendScore, productId) => {
      const normalizedScore = (trendScore / maxTrendScore) * weight;
      productScores.set(
        productId,
        (productScores.get(productId) || 0) + normalizedScore,
      );
    });
  }

  /**
   * Select top N products based on scores
   * Fetches full product details and filters out unavailable products
   *
   * @param productScores - Map of product IDs to relevance scores
   * @param limit - Maximum number of products to return
   * @returns Array of Product entities
   */
  private async selectTopProducts(
    productScores: Map<string, number>,
    limit: number,
  ): Promise<Product[]> {
    // Sort by score descending
    const rankedProducts = [...productScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([productId]) => productId);

    if (rankedProducts.length === 0) {
      // Fallback: return featured products if no scores
      return this.productsRepository.find({
        where: {
          deletedAt: IsNull(),
          status: ProductStatus.ACTIVE,
          isFeatured: true,
        },
        take: limit,
      });
    }

    // Fetch full product details
    const products = await this.productsRepository.find({
      where: {
        id: In(rankedProducts),
        deletedAt: IsNull(),
        status: ProductStatus.ACTIVE,
      },
      relations: ["ingredients"],
    });

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Return products in ranked order, up to limit
    const result: Product[] = [];
    for (const productId of rankedProducts) {
      const product = productMap.get(productId);
      if (product) {
        result.push(product);
        if (result.length >= limit) break;
      }
    }

    // If we still don't have enough, fill with featured products
    if (result.length < limit) {
      const additionalProducts = await this.productsRepository.find({
        where: {
          deletedAt: IsNull(),
          status: ProductStatus.ACTIVE,
          isFeatured: true,
        },
        take: limit - result.length,
      });

      // Only add products not already in result
      const resultIds = new Set(result.map(p => p.id));
      additionalProducts.forEach(p => {
        if (!resultIds.has(p.id)) {
          result.push(p);
        }
      });
    }

    return result.slice(0, limit);
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
