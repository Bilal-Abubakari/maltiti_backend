import { Injectable, Logger } from "@nestjs/common";
import { Product } from "../entities/Product.entity";
import { User } from "../entities/User.entity";
import { BestProductsResponseDto } from "../dto/productResponse.dto";
import {
  ExportProductQueryDto,
  ProductQueryDto,
} from "../dto/productQuery.dto";
import { IPagination } from "../interfaces/general";
import { LightProduct } from "../interfaces/product-light.model";
import { ProductCrudService } from "./product-crud.service";
import {
  ProductRecommendationService,
  RecommendationConfig,
  DEFAULT_RECOMMENDATION_CONFIG,
} from "./product-recommendation.service";
import { ProductExportService } from "./product-export.service";
import { ProductNotificationService } from "./product-notification.service";
import { ProductSearchService } from "./product-search.service";
import { CreateProductDto } from "../dto/createProduct.dto";
import { UpdateProductDto } from "../dto/updateProduct.dto";
import * as ExcelJS from "exceljs";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly productCrudService: ProductCrudService,
    private readonly productRecommendationService: ProductRecommendationService,
    private readonly productExportService: ProductExportService,
    private readonly productNotificationService: ProductNotificationService,
    private readonly productSearchService: ProductSearchService,
  ) {}

  /**
   * Get all products with flexible filtering, pagination, and sorting
   */
  public async getAllProducts(
    queryDto: ProductQueryDto,
  ): Promise<IPagination<Product>> {
    return this.productSearchService.getAllProducts(queryDto);
  }

  /**
   * Get best/featured products with intelligent recommendations
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
      products =
        await this.productRecommendationService.getPersonalizedProducts(
          user,
          fullConfig,
        );
    } else {
      // Curated recommendations for anonymous users
      products =
        await this.productRecommendationService.getCuratedProducts(fullConfig);
    }

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
    return this.productExportService.getProductsForExport(queryDto);
  }

  /**
   * Generate Excel file for products export
   */
  public async generateProductsExcel(
    products: Product[],
  ): Promise<ExcelJS.Buffer> {
    return this.productExportService.generateProductsExcel(products);
  }

  /**
   * Export products to Excel with optional filters
   */
  public async exportProductsToExcel(
    queryDto: ExportProductQueryDto,
  ): Promise<ExcelJS.Buffer> {
    return this.productExportService.exportProductsToExcel(queryDto);
  }

  /**
   * Get a single product by ID
   */
  public async getOneProduct(id: string): Promise<Product> {
    return this.productCrudService.getOneProduct(id);
  }

  /**
   * Create a new product
   */
  public async createProduct(productInfo: CreateProductDto): Promise<Product> {
    const savedProduct =
      await this.productCrudService.createProduct(productInfo);

    // Send new product notification to all customers (async, don't block)
    this.productNotificationService
      .sendNewProductNotificationToCustomers(savedProduct)
      .catch(error => {
        this.logger.error(
          "Failed to send new product notifications",
          error.stack,
        );
      });

    return savedProduct;
  }

  /**
   * Update an existing product
   */
  public async editProduct(
    id: string,
    productInfo: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productCrudService.getOneProduct(id);

    // Capture old prices for comparison
    const oldPrices = {
      wholesale: product.wholesale,
      retail: product.retail,
      inBoxPrice: product.inBoxPrice,
    };

    const savedProduct = await this.productCrudService.editProduct(
      id,
      productInfo,
    );

    // Detect price changes and send notifications (async, don't block)
    this.productNotificationService
      .detectAndNotifyPriceChanges(savedProduct, oldPrices)
      .catch(error => {
        this.logger.error(
          "Failed to send price change notifications",
          error.stack,
        );
      });

    return savedProduct;
  }

  /**
   * Toggle product status between active and inactive
   */
  public async changeProductStatus(id: string): Promise<Product> {
    return this.productCrudService.changeProductStatus(id);
  }

  /**
   * Toggle product favorite status
   */
  public async toggleFavorite(id: string): Promise<Product> {
    return this.productCrudService.toggleFavorite(id);
  }

  /**
   * Soft delete a product
   */
  public async deleteProduct(
    id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.productCrudService.deleteProduct(id);
  }

  /**
   * Hard delete a product (use with caution)
   */
  public async hardDeleteProduct(
    id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.productCrudService.hardDeleteProduct(id);
  }

  /**
   * Get total stock for a product across all batches
   */
  public async getTotalStock(productId: string): Promise<number> {
    return this.productSearchService.getTotalStock(productId);
  }

  /**
   * Get all products with only id and name fields
   */
  public async getAllProductsBasic(): Promise<LightProduct[]> {
    return this.productCrudService.getAllProductsBasic();
  }

  /**
   * Find a product by ID
   */
  public async findOne(id: string): Promise<Product> {
    return this.productCrudService.findOne(id);
  }
}
