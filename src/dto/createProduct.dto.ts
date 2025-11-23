import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductStatus } from "../enum/product-status.enum";
import { ProductGrade } from "../enum/product-grade.enum";
import { PackagingSize } from "../enum/packaging-size.enum";

/**
 * DTO for creating a new product
 */
export class CreateProductDto {
  @ApiPropertyOptional({
    description: "Unique SKU code for the product",
    example: "SB-WHT-1KG-001",
  })
  @IsOptional()
  @IsString()
  public sku?: string;

  @ApiProperty({
    description: "Product name",
    example: "White Shea Butter Grade A",
  })
  @IsNotEmpty()
  @IsString()
  public name: string;

  @ApiProperty({
    description: "Product ingredients (comma-separated or array)",
    example: ["100% Pure Shea Butter", "No additives"],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  public ingredients: string[];

  @ApiPropertyOptional({
    description: "Product weight description",
    example: "1kg",
  })
  @IsOptional()
  @IsString()
  public weight?: string;

  @ApiProperty({
    description: "Product category",
    enum: ProductCategory,
    example: ProductCategory.SHEA_BUTTER,
  })
  @IsNotEmpty()
  @IsEnum(ProductCategory)
  public category: ProductCategory;

  @ApiProperty({
    description: "Detailed product description",
    example:
      "Premium white shea butter extracted from organic shea nuts in Northern Ghana.",
  })
  @IsNotEmpty()
  @IsString()
  public description: string;

  @ApiPropertyOptional({
    description: "Product status",
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
    default: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  public status?: ProductStatus = ProductStatus.ACTIVE;

  @ApiPropertyOptional({
    description: "Packaging size",
    enum: PackagingSize,
    example: PackagingSize.SIZE_1KG,
  })
  @IsOptional()
  @IsEnum(PackagingSize)
  public size?: PackagingSize;

  @ApiPropertyOptional({
    description: "Product images URLs",
    example: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public images?: string[];

  @ApiPropertyOptional({
    description: "Primary product image URL (for backward compatibility)",
    example: "https://example.com/primary-image.jpg",
  })
  @IsOptional()
  @IsString()
  public image?: string;

  @ApiProperty({
    description: "Wholesale price in currency",
    example: 45.0,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public wholesale: number;

  @ApiProperty({
    description: "Retail price in currency",
    example: 60.0,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public retail: number;

  @ApiProperty({
    description: "Available stock quantity",
    example: 150,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public stockQuantity: number;

  @ApiPropertyOptional({
    description: "Price for a full box",
    example: 540.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public inBoxPrice?: number;

  @ApiPropertyOptional({
    description: "Quantity of items in one box",
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public quantityInBox?: number;

  @ApiPropertyOptional({
    description: "Product grade/quality",
    enum: ProductGrade,
    example: ProductGrade.GRADE_A,
  })
  @IsOptional()
  @IsEnum(ProductGrade)
  public grade?: ProductGrade;

  @ApiPropertyOptional({
    description: "Whether product is featured",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  public isFeatured?: boolean = false;

  @ApiPropertyOptional({
    description: "Whether product is organic certified",
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  public isOrganic?: boolean = false;

  @ApiPropertyOptional({
    description: "Product certifications",
    example: ["Ecocert", "FDA", "GSA"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public certifications?: string[];

  @ApiPropertyOptional({
    description: "Supplier reference ID",
    example: "SUP-2024-001",
  })
  @IsOptional()
  @IsString()
  public supplierReference?: string;

  @ApiPropertyOptional({
    description: "Production date",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  public producedAt?: string;

  @ApiPropertyOptional({
    description: "Expiry date",
    example: "2026-01-15",
  })
  @IsOptional()
  @IsDateString()
  public expiryDate?: string;

  @ApiPropertyOptional({
    description: "Minimum order quantity",
    example: 5,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public minOrderQuantity?: number = 0;

  @ApiPropertyOptional({
    description: "Cost price for internal tracking",
    example: 35.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public costPrice?: number;

  @ApiPropertyOptional({
    description: "Batch ID for batch tracking",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  public batchId?: string;
}
