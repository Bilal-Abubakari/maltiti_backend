import { ApiProperty } from "@nestjs/swagger";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductStatus } from "../enum/product-status.enum";

/**
 * Product DTO for cart item response
 */
export class CartProductDto {
  @ApiProperty({
    description: "Product ID",
    example: "660e8400-e29b-41d4-a716-446655440001",
  })
  public id: string;

  @ApiProperty({
    description: "Product SKU",
    example: "PRD-001",
    nullable: true,
  })
  public sku: string | null;

  @ApiProperty({
    description: "Product name",
    example: "Premium Shea Butter",
  })
  public name: string;

  @ApiProperty({
    description: "Product category",
    enum: ProductCategory,
    example: ProductCategory.SHEA_BUTTER,
  })
  public category: ProductCategory;

  @ApiProperty({
    description: "Product description",
    example: "High-quality organic shea butter",
    nullable: true,
  })
  public description: string | null;

  @ApiProperty({
    description: "Product status",
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  public status: ProductStatus;

  @ApiProperty({
    description: "Product images URLs",
    type: [String],
    example: ["https://example.com/image1.jpg"],
    nullable: true,
  })
  public images: string[] | null;

  @ApiProperty({
    description: "Main product image URL",
    example: "https://example.com/main-image.jpg",
    nullable: true,
  })
  public image: string | null;

  @ApiProperty({
    description: "Wholesale price",
    example: 80.0,
    type: Number,
  })
  public wholesale: number;

  @ApiProperty({
    description: "Retail price",
    example: 100.0,
    type: Number,
  })
  public retail: number;

  @ApiProperty({
    description: "In-box price",
    example: 75.0,
    type: Number,
    nullable: true,
  })
  public inBoxPrice: number | null;

  @ApiProperty({
    description: "Quantity per box",
    example: 12,
    type: Number,
    nullable: true,
  })
  public quantityInBox: number | null;

  @ApiProperty({
    description: "Is product marked as favorite",
    example: false,
  })
  public favorite: boolean;

  @ApiProperty({
    description: "Product rating",
    example: 4.5,
    type: Number,
  })
  public rating: number;

  @ApiProperty({
    description: "Number of reviews",
    example: 25,
    type: Number,
  })
  public reviews: number;

  @ApiProperty({
    description: "Product weight",
    example: "500g",
    nullable: true,
  })
  public weight: string | null;
}

/**
 * Cart item DTO for response
 */
export class CartItemDto {
  @ApiProperty({
    description: "Cart item ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  public id: string;

  @ApiProperty({
    description: "User ID",
    example: "660e8400-e29b-41d4-a716-446655440000",
    nullable: true,
  })
  public userId: string | null;

  @ApiProperty({
    description: "Product details",
    type: CartProductDto,
  })
  public product: CartProductDto;

  @ApiProperty({
    description: "Quantity of product in cart",
    example: 2,
    type: Number,
  })
  public quantity: number;

  @ApiProperty({
    description: "Cart item creation date",
    example: "2024-01-15T10:30:00.000Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Cart item last update date",
    example: "2024-01-15T10:30:00.000Z",
  })
  public updatedAt: Date;
}

/**
 * Response DTO for cart operations
 */
export class CartResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Product added to cart successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Cart item data",
    type: CartItemDto,
  })
  public data: CartItemDto;
}

/**
 * Cart data structure for get cart response
 */
export class CartDataDto {
  @ApiProperty({
    description: "Array of cart items",
    type: [CartItemDto],
    example: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        quantity: 2,
        product: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          name: "Premium Shea Butter",
          sku: "PRD-001",
          category: "SHEA_BUTTER",
          retail: 100,
          wholesale: 80,
          image: "https://example.com/image.jpg",
          images: ["https://example.com/image1.jpg"],
          status: "ACTIVE",
          favorite: false,
          rating: 4.5,
          reviews: 25,
        },
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
      },
    ],
  })
  public items: CartItemDto[];

  @ApiProperty({
    description: "Total number of items in cart",
    example: 1,
    type: Number,
  })
  public count: number;

  @ApiProperty({
    description: "Total price of all items in cart",
    example: 200,
    type: Number,
  })
  public total: number;
}

/**
 * Response DTO for getting customer cart with total
 */
export class GetCartResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Customer cart loaded successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Cart data containing items, count, and total price",
    type: CartDataDto,
  })
  public data: CartDataDto;
}

/**
 * Response DTO for delete operations
 */
export class DeleteCartResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Product removed from cart successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Delete operation result",
    example: {
      raw: [],
      affected: 1,
    },
  })
  public data: {
    raw: unknown[];
    affected?: number;
  };
}

/**
 * Bulk add cart data structure
 */
export class BulkAddCartDataDto {
  @ApiProperty({
    description: "Array of successfully added cart items",
    type: [CartItemDto],
    example: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        quantity: 2,
        product: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          name: "Premium Shea Butter",
          sku: "PRD-001",
          category: "SHEA_BUTTER",
          retail: 100,
          wholesale: 80,
          image: "https://example.com/image.jpg",
          images: ["https://example.com/image1.jpg"],
          status: "ACTIVE",
          favorite: false,
          rating: 4.5,
          reviews: 25,
        },
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
      },
    ],
  })
  public addedItems: CartItemDto[];

  @ApiProperty({
    description:
      "Array of product IDs that were skipped (not found or invalid)",
    type: [String],
    example: ["770e8400-e29b-41d4-a716-446655440002"],
  })
  public skippedItems: string[];
}

/**
 * Response DTO for bulk add to cart operations
 */
export class BulkAddCartResponseDto {
  @ApiProperty({
    description: "Success message with details about added and skipped items",
    example:
      "Successfully added 5 item(s) to cart. 1 item(s) were skipped (not found or invalid)",
  })
  public message: string;

  @ApiProperty({
    description: "Details of added items and skipped items",
    type: BulkAddCartDataDto,
  })
  public data: BulkAddCartDataDto;
}
