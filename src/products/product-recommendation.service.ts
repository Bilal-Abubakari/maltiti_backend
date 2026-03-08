import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, IsNull, MoreThanOrEqual } from "typeorm";
import { Product } from "../entities/Product.entity";
import { Sale } from "../entities/Sale.entity";
import { Cart } from "../entities/Cart.entity";
import { Customer } from "../entities/Customer.entity";
import { User } from "../entities/User.entity";
import { ProductStatus } from "../enum/product-status.enum";
import { PaymentStatus } from "../enum/payment-status.enum";

export interface RecommendationConfig {
  limit: number;
  purchaseWeight: number;
  categoryPreferenceWeight: number;
  cartWeight: number;
  salesPerformanceWeight: number;
  trendWeight: number;
}

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  limit: 8,
  purchaseWeight: 5.0,
  categoryPreferenceWeight: 2.5,
  cartWeight: 3.0,
  salesPerformanceWeight: 2.0,
  trendWeight: 1.5,
};

@Injectable()
export class ProductRecommendationService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Get personalized product recommendations for authenticated users
   */
  public async getPersonalizedProducts(
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
   */
  public async getCuratedProducts(
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
        paymentStatus: In([
          PaymentStatus.INVOICE_REQUESTED,
          PaymentStatus.PENDING_PAYMENT,
          PaymentStatus.PAID,
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
        paymentStatus: In([
          PaymentStatus.INVOICE_REQUESTED,
          PaymentStatus.PENDING_PAYMENT,
          PaymentStatus.PAID,
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
   */
  private async scoreProductsFromGlobalPerformance(
    productScores: Map<string, number>,
    weight: number,
    limit: number,
  ): Promise<void> {
    const sales = await this.saleRepository.find({
      where: {
        deletedAt: IsNull(),
        paymentStatus: In([
          PaymentStatus.INVOICE_REQUESTED,
          PaymentStatus.PENDING_PAYMENT,
          PaymentStatus.PAID,
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
      .getRawMany<{ productId: string; count: number }>();

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
        paymentStatus: In([
          PaymentStatus.INVOICE_REQUESTED,
          PaymentStatus.PENDING_PAYMENT,
          PaymentStatus.PAID,
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
}
