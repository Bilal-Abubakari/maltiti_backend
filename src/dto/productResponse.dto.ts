import { ApiProperty } from "@nestjs/swagger";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductStatus } from "../enum/product-status.enum";
import { ProductGrade } from "../enum/product-grade.enum";
import { PackagingSize } from "../enum/packaging-size.enum";

/**
 * Product response DTO for API responses
 */
export class ProductResponseDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  public id: string;

  @ApiProperty({ example: "SB-WHT-1KG-001" })
  public sku: string;

  @ApiProperty({ example: "White Shea Butter Grade A" })
  public name: string;

  @ApiProperty({ example: ["100% Pure Shea Butter", "No additives"] })
  public ingredients: string[];

  @ApiProperty({ example: "1kg" })
  public weight: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.SHEA_BUTTER })
  public category: ProductCategory;

  @ApiProperty({
    example:
      "Premium white shea butter extracted from organic shea nuts in Northern Ghana.",
  })
  public description: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  public status: ProductStatus;

  @ApiProperty({ enum: PackagingSize, example: PackagingSize.SIZE_1KG })
  public size: PackagingSize;

  @ApiProperty({
    example: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ],
  })
  public images: string[];

  @ApiProperty({ example: "https://example.com/primary-image.jpg" })
  public image: string;

  @ApiProperty({ example: 45.0 })
  public wholesale: number;

  @ApiProperty({ example: 60.0 })
  public retail: number;

  @ApiProperty({ example: 150 })
  public stockQuantity: number;

  @ApiProperty({ example: 540.0 })
  public inBoxPrice: number;

  @ApiProperty({ example: 12 })
  public quantityInBox: number;

  @ApiProperty({ example: false })
  public favorite: boolean;

  @ApiProperty({ example: 4.5 })
  public rating: number;

  @ApiProperty({ example: 23 })
  public reviews: number;

  @ApiProperty({ enum: ProductGrade, example: ProductGrade.GRADE_A })
  public grade: ProductGrade;

  @ApiProperty({ example: false })
  public isFeatured: boolean;

  @ApiProperty({ example: true })
  public isOrganic: boolean;

  @ApiProperty({ example: ["Ecocert", "FDA", "GSA"] })
  public certifications: string[];

  @ApiProperty({ example: "SUP-2024-001" })
  public supplierReference: string;

  @ApiProperty({ example: "2024-01-15T00:00:00.000Z" })
  public producedAt: Date;

  @ApiProperty({ example: "2026-01-15T00:00:00.000Z" })
  public expiryDate: Date;

  @ApiProperty({ example: 5 })
  public minOrderQuantity: number;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  public createdAt: Date;

  @ApiProperty({ example: "2024-01-20T15:45:00.000Z" })
  public updatedAt: Date;
}

/**
 * Paginated products response
 */
export class ProductsPaginationResponseDto {
  @ApiProperty({ example: 50 })
  public totalItems: number;

  @ApiProperty({ example: 1 })
  public currentPage: number;

  @ApiProperty({ example: 5 })
  public totalPages: number;

  @ApiProperty({ type: [ProductResponseDto] })
  public products: ProductResponseDto[];
}

/**
 * Best/Featured products response
 */
export class BestProductsResponseDto {
  @ApiProperty({ example: 8 })
  public totalItems: number;

  @ApiProperty({ type: [ProductResponseDto] })
  public data: ProductResponseDto[];
}
