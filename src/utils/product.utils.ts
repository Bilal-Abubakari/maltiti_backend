import { ProductCategory } from "../enum/product-category.enum";
import { ProductGrade } from "../enum/product-grade.enum";

/**
 * Generate a unique SKU code for products
 * Format: {CategoryPrefix}-{Grade}-{Size}-{RandomCode}
 * Example: SB-A-1KG-001
 */
export function generateSKU(
  category: ProductCategory,
  grade?: ProductGrade,
  size?: string,
): string {
  const categoryPrefixes: Record<ProductCategory, string> = {
    [ProductCategory.SHEA_BUTTER]: "SB",
    [ProductCategory.BLACK_SOAP]: "BS",
    [ProductCategory.COSMETICS]: "CS",
    [ProductCategory.SHEA_SOAP]: "SS",
    [ProductCategory.POWDERED_SOAP]: "PS",
    [ProductCategory.DAWADAWA]: "DT",
    [ProductCategory.ESSENTIAL_OILS]: "EO",
    [ProductCategory.HAIR_OIL]: "HO",
    [ProductCategory.GRAINS]: "GR",
    [ProductCategory.LEGUMES]: "LG",
    [ProductCategory.OTHER]: "OT",
  };

  const gradeCode = grade ? grade.charAt(0).toUpperCase() : "X";
  const sizeCode = size ? size.toUpperCase().replace(/[^A-Z0-9]/g, "") : "STD";
  const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${categoryPrefixes[category]}-${gradeCode}-${sizeCode}-${randomCode}`;
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(
  costPrice: number,
  sellingPrice: number,
): number {
  if (costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / costPrice) * 100;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(
  originalPrice: number,
  discountedPrice: number,
): number {
  if (originalPrice === 0) return 0;
  return ((originalPrice - discountedPrice) / originalPrice) * 100;
}

/**
 * Check if product is low on stock
 */
export function isLowStock(
  currentStock: number,
  minThreshold: number = 10,
): boolean {
  return currentStock <= minThreshold;
}

/**
 * Check if product is expiring soon
 */
export function isExpiringSoon(
  expiryDate: Date,
  daysThreshold: number = 30,
): boolean {
  if (!expiryDate) return false;

  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
}

/**
 * Format product weight display
 */
export function formatWeight(weight: string): string {
  if (!weight) return "N/A";
  return weight.toLowerCase().replace(/(\d+)([a-z]+)/g, "$1 $2");
}

/**
 * Generate batch number
 * Format: BATCH-YYYY-MM-NNN
 * Example: BATCH-2024-01-001
 */
export function generateBatchNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `BATCH-${year}-${month}-${randomNum}`;
}
