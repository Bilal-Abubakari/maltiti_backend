/**
 * Represents a product with its computed relevance score
 * Used internally for ranking and selection
 */
export interface ProductWithScore {
  productId: string;
  score: number;
  product?: unknown; // Will be populated with actual Product entity
}

/**
 * Configuration for the product recommendation engine
 */
export interface RecommendationConfig {
  /** Maximum number of products to return (default: 8) */
  limit: number;

  /** Weight for purchase history in scoring (default: 5.0) */
  purchaseWeight: number;

  /** Weight for cart interactions in scoring (default: 3.0) */
  cartWeight: number;

  /** Weight for product views in scoring (not implemented yet, default: 1.0) */
  viewWeight: number;

  /** Weight for global sales performance in scoring (default: 2.0) */
  salesPerformanceWeight: number;

  /** Weight for recent trending activity in scoring (default: 1.5) */
  trendWeight: number;

  /** Weight for category preference matching (default: 2.5) */
  categoryPreferenceWeight: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  limit: 8,
  purchaseWeight: 5.0,
  cartWeight: 3.0,
  viewWeight: 1.0,
  salesPerformanceWeight: 2.0,
  trendWeight: 1.5,
  categoryPreferenceWeight: 2.5,
};
