import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsUUID,
  IsBoolean,
} from "class-validator";

/**
 * DTO for querying/filtering batches with pagination
 */
export class BatchQueryDto {
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
  public page?: number = 1;

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
  public limit?: number = 10;

  @ApiPropertyOptional({
    description: "Filter by product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  public productId?: string;

  @ApiPropertyOptional({
    description: "Search term for batch number",
    example: "BATCH-2024-001",
  })
  @IsOptional()
  @IsString()
  public batchNumber?: string;

  @ApiPropertyOptional({
    description: "Filter by quality check status",
    example: "Passed",
  })
  @IsOptional()
  @IsString()
  public qualityCheckStatus?: string;

  @ApiPropertyOptional({
    description: "Filter by active status",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({
    description: "Sort field",
    example: "createdAt",
    enum: ["createdAt", "batchNumber", "productionDate", "expiryDate"],
  })
  @IsOptional()
  @IsString()
  public sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    example: "DESC",
    enum: ["ASC", "DESC"],
  })
  @IsOptional()
  @IsString()
  public sortOrder?: "ASC" | "DESC" = "DESC";
}
