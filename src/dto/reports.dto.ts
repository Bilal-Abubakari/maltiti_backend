import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ProductCategory } from "../enum/product-category.enum";

export enum TimeAggregation {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

/**
 * Base query DTO for all report endpoints
 */
export class BaseReportQueryDto {
  @ApiPropertyOptional({ description: "Start date for filtering (ISO format)" })
  @IsOptional()
  @IsDateString()
  public fromDate?: string;

  @ApiPropertyOptional({ description: "End date for filtering (ISO format)" })
  @IsOptional()
  @IsDateString()
  public toDate?: string;

  @ApiPropertyOptional({ description: "Filter by product ID" })
  @IsOptional()
  @IsUUID()
  public productId?: string;

  @ApiPropertyOptional({
    enum: ProductCategory,
    description: "Filter by product category",
  })
  @IsOptional()
  @IsEnum(ProductCategory)
  public category?: ProductCategory;

  @ApiPropertyOptional({ description: "Filter by batch ID" })
  @IsOptional()
  @IsUUID()
  public batchId?: string;

  @ApiPropertyOptional({
    enum: TimeAggregation,
    default: TimeAggregation.DAILY,
    description: "Time aggregation level",
  })
  @IsOptional()
  @IsEnum(TimeAggregation)
  public aggregation?: TimeAggregation;
}

/**
 * Query DTO for sales reports
 */
export class SalesReportQueryDto extends BaseReportQueryDto {
  @ApiPropertyOptional({ description: "Include sales trends", default: false })
  @IsOptional()
  public includeTrends?: boolean;
}

/**
 * Query DTO for top products report with pagination
 */
export class TopProductsQueryDto extends BaseReportQueryDto {
  @ApiPropertyOptional({
    description: "Number of top products to return",
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public limit?: number;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  public sortOrder?: SortOrder;
}

/**
 * Query DTO for comparative reports
 */
export class ComparativeReportQueryDto {
  @ApiProperty({ description: "Start date for current period" })
  @IsDateString()
  public currentFromDate: string;

  @ApiProperty({ description: "End date for current period" })
  @IsDateString()
  public currentToDate: string;

  @ApiProperty({ description: "Start date for previous period" })
  @IsDateString()
  public previousFromDate: string;

  @ApiProperty({ description: "End date for previous period" })
  @IsDateString()
  public previousToDate: string;

  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  public category?: ProductCategory;
}

/**
 * Query DTO for inventory reports
 */
export class InventoryReportQueryDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  public category?: ProductCategory;

  @ApiPropertyOptional({ description: "Filter by product ID" })
  @IsOptional()
  @IsUUID()
  public productId?: string;

  @ApiPropertyOptional({ description: "Show only low stock items" })
  @IsOptional()
  public lowStockOnly?: boolean;

  @ApiPropertyOptional({ description: "Low stock threshold", default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  public lowStockThreshold?: number;
}
