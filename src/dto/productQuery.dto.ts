import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { ProductCategory } from "../enum/product-category.enum";
import { ProductStatus } from "../enum/product-status.enum";
import { ProductGrade } from "../enum/product-grade.enum";
import { PackagingSize } from "../enum/packaging-size.enum";

/**
 * DTO for querying/filtering products with pagination
 */
export class ProductQueryDto {
  @ApiPropertyOptional({
    description: "Page number for pagination",
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Search term for product name or description",
    example: "shea butter",
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({
    description: "Filter by product category",
    enum: ProductCategory,
    example: ProductCategory.SHEA_BUTTER,
  })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({
    description: "Filter by product status",
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: "Filter by product grade",
    enum: ProductGrade,
    example: ProductGrade.GRADE_A,
  })
  @IsOptional()
  @IsEnum(ProductGrade)
  grade?: ProductGrade;

  @ApiPropertyOptional({
    description: "Filter by packaging size",
    enum: PackagingSize,
    example: PackagingSize.SIZE_1KG,
  })
  @IsOptional()
  @IsEnum(PackagingSize)
  packagingSize?: PackagingSize;

  @ApiPropertyOptional({
    description: "Filter by featured products",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: "Filter by organic products",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOrganic?: boolean;

  @ApiPropertyOptional({
    description: "Minimum price filter",
    example: 10.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({
    description: "Maximum price filter",
    example: 100.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: "Sort field",
    example: "createdAt",
    enum: ["name", "retail", "createdAt", "rating", "stockQuantity"],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    example: "DESC",
    enum: ["ASC", "DESC"],
  })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";

  @ApiPropertyOptional({
    description: "Filter by batch ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  batchId?: string;
}
