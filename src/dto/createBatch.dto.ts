import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { CreateProductDto } from "./createProduct.dto";

/**
 * DTO for creating a new batch
 */
export class CreateBatchDto {
  @ApiProperty({
    description: "Unique batch number",
    example: "BATCH-2024-001",
  })
  @IsNotEmpty()
  @IsString()
  public batchNumber: string;

  @ApiProperty({
    description: "ID of the product this batch belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsNotEmpty()
  @IsUUID()
  public productId: string;

  @ApiProperty({
    description: "Quantity of items in this batch",
    example: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  public quantity: number;

  @ApiPropertyOptional({
    description: "Production/manufacturing date",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  public productionDate?: string;

  @ApiPropertyOptional({
    description: "Expiry date",
    example: "2026-01-15",
  })
  @IsOptional()
  @IsDateString()
  public expiryDate?: string;

  @ApiPropertyOptional({
    description: "Manufacturing location",
    example: "Tamale Production Facility",
  })
  @IsOptional()
  @IsString()
  public manufacturingLocation?: string;

  @ApiPropertyOptional({
    description: "Quality check status",
    example: "Passed",
  })
  @IsOptional()
  @IsString()
  public qualityCheckStatus?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the batch",
    example: "Premium quality shea nuts sourced from Yendi",
  })
  @IsOptional()
  @IsString()
  public notes?: string;
}

/**
 * DTO for updating an existing product
 * All fields are optional (partial)
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: "Whether to mark this update as a minor change",
    example: false,
  })
  public isMinorUpdate?: boolean;
}
